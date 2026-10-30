import { test } from '@japa/runner';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { captureMail } from '#tests/helpers/mail';
import { createTeam } from '#tests/helpers/team_factory';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type { ApiClient } from '@japa/api-client';

function switchInto(client: ApiClient, user: User, teamId: string) {
	return client.post('/workspace/switch').withCsrfToken().form({ teamId }).loginAs(user).redirects(0);
}

test.group('Team settings', (group) => {
	truncateBetweenTests(group);
	captureMail(group);

	test('the page lists the active team and its members', async ({ client }) => {
		const { team, owner } = await createTeam({ name: 'Acme Rockets' });
		const session = await switchInto(client, owner, team.id);

		const page = await client.get('/settings/team').withInertia().withSession(session.session()).loginAs(owner);

		page.assertStatus(200);
		page.assertInertiaComponent('teams/settings');
		page.assertInertiaPropsContains({ team: { id: team.id, name: 'Acme Rockets' } });
	});

	test('a member may not invite', async ({ client }) => {
		const { team } = await createTeam();
		const member = await createUser();

		await new TeamRepository().addMember({ teamId: team.id, userId: member.id, role: 'member' });

		const session = await switchInto(client, member, team.id);
		const response = await client
			.post('/settings/team/members/invite')
			.withCsrfToken()
			.form({ email: 'nope@example.com', role: 'member' })
			.withSession(session.session())
			.loginAs(member)
			.redirects(0);

		response.assertStatus(403);
	});

	/** Review Focus #1 end to end: the id is scoped to the acting workspace. */
	test('an owner cannot remove a member of a different team', async ({ client }) => {
		const mine = await createTeam();
		const theirs = await createTeam();
		const outsider = await createUser();

		await new TeamRepository().addMember({ teamId: theirs.team.id, userId: outsider.id, role: 'member' });

		const session = await switchInto(client, mine.owner, mine.team.id);
		const response = await client
			.delete('/settings/team/members')
			.withCsrfToken()
			.form({ userId: outsider.id })
			.withSession(session.session())
			.loginAs(mine.owner)
			.redirects(0);

		response.assertStatus(404);
	});
});
