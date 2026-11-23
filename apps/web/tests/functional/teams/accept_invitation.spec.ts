import { test } from '@japa/runner';
import InviteMember from '#teams/actions/invite_member';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { captureMail } from '#tests/helpers/mail';
import { createTeam } from '#tests/helpers/team_factory';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type Team from '#teams/models/team';

async function invite(team: Team, owner: User, email: string): Promise<string> {
	const result = await new InviteMember(new TeamRepository(), new TeamInvitationRepository()).execute({
		team,
		inviter: owner,
		inviterRole: 'owner',
		email,
		role: 'member',
	});

	if (!result.ok) {
		throw new Error(result.error.type);
	}

	return result.value.token;
}

test.group('Redeeming an invitation', (group) => {
	truncateBetweenTests(group);
	captureMail(group);

	test('the link shows the invitation to the invited user', async ({ client }) => {
		const { team, owner } = await createTeam({ name: 'Acme Rockets' });
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		const page = await client.get(`/teams/invitations/${token}`).withInertia().loginAs(invitee);

		page.assertStatus(200);
		page.assertInertiaComponent('teams/invitation');
		page.assertInertiaPropsContains({ invitation: { teamName: 'Acme Rockets' } });
	});

	test('an anonymous visitor is sent to sign in', async ({ client }) => {
		const { team, owner } = await createTeam();
		const token = await invite(team, owner, 'invitee@example.com');

		const response = await client.get(`/teams/invitations/${token}`).redirects(0);

		response.assertStatus(302);
	});

	test('accepting joins the team', async ({ client, assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		const response = await client.post(`/teams/invitations/${token}`).withCsrfToken().loginAs(invitee).redirects(0);

		response.assertStatus(302);

		const membership = await new TeamRepository().membershipFor(team.id, invitee.id);

		assert.equal(membership?.role, 'member');
	});

	test('a user whose address is not the invited one is refused', async ({ client, assert }) => {
		const { team, owner } = await createTeam();
		const someoneElse = await createUser({ email: 'someone.else@example.com' });
		const token = await invite(team, owner, 'invitee@example.com');

		const response = await client
			.post(`/teams/invitations/${token}`)
			.withCsrfToken()
			.loginAs(someoneElse)
			.redirects(0);

		response.assertStatus(403);

		const membership = await new TeamRepository().membershipFor(team.id, someoneElse.id);

		assert.isNull(membership);
	});

	test('an unknown token is a 404', async ({ client }) => {
		const invitee = await createUser();

		const response = await client.get('/teams/invitations/tinv_nonsense').withInertia().loginAs(invitee);

		response.assertStatus(404);
	});

	/** The unique(team_id, user_id) index would otherwise throw a raw database error. */
	test('accepting while already a member is refused cleanly', async ({ client, assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		await new TeamRepository().addMember({ teamId: team.id, userId: invitee.id, role: 'member' });

		const response = await client.post(`/teams/invitations/${token}`).withCsrfToken().loginAs(invitee).redirects(0);

		response.assertStatus(302);

		const owners = await new TeamRepository().ownerCount(team.id);

		assert.equal(owners, 1);
	});
});
