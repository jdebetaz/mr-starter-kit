import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import AcceptInvitation from '#teams/actions/accept_invitation';
import InviteMember from '#teams/actions/invite_member';
import RevokeInvitation from '#teams/actions/revoke_invitation';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { captureMail } from '#tests/helpers/mail';
import { createTeam } from '#tests/helpers/team_factory';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type Team from '#teams/models/team';

const teams = () => new TeamRepository();
const invitations = () => new TeamInvitationRepository();
const accept = () => new AcceptInvitation(teams(), invitations());

async function invite(team: Team, owner: User, email: string): Promise<string> {
	const result = await new InviteMember(teams(), invitations()).execute({
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

test.group('AcceptInvitation', (group) => {
	truncateBetweenTests(group);
	captureMail(group);

	test('the invited user joins with the invited role', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		const result = await accept().execute({ token, user: invitee });

		assert.isTrue(result.ok);

		const membership = await teams().membershipFor(team.id, invitee.id);

		assert.equal(membership?.role, 'member');
	});

	test('an unknown token is refused', async ({ assert }) => {
		const invitee = await createUser();
		const result = await accept().execute({ token: 'tinv_nonsense', user: invitee });

		assert.equal(result.ok ? '' : result.error.type, 'not_found');
	});

	test('a second acceptance of the same token is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		await accept().execute({ token, user: invitee });

		const second = await accept().execute({ token, user: invitee });

		assert.equal(second.ok ? '' : second.error.type, 'already_accepted');
	});

	/** The link is a bearer token in an inbox; it must not re-target. */
	test('a signed-in user whose email differs is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const someoneElse = await createUser({ email: 'someone.else@example.com' });
		const token = await invite(team, owner, 'invitee@example.com');

		const result = await accept().execute({ token, user: someoneElse });

		assert.equal(result.ok ? '' : result.error.type, 'wrong_recipient');

		const membership = await teams().membershipFor(team.id, someoneElse.id);

		assert.isNull(membership);
	});

	test('a revoked invitation is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);
		const invitation = await invitations().findByToken(token);

		await new RevokeInvitation(invitations()).execute({
			invitationId: invitation!.id,
			actorRole: 'owner',
			teamId: team.id,
		});

		const result = await accept().execute({ token, user: invitee });

		assert.equal(result.ok ? '' : result.error.type, 'not_found');
	});

	test('an expired invitation is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const invitee = await createUser({ email: 'invitee@example.com' });
		const token = await invite(team, owner, invitee.email);

		await db
			.from('auth_access_tokens')
			.where('type', 'team_invitation')
			.update({ expires_at: new Date(Date.now() - 1000) });

		const result = await accept().execute({ token, user: invitee });

		assert.equal(result.ok ? '' : result.error.type, 'not_found');
	});
});
