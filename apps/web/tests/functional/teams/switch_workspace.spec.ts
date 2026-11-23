import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createTeam } from '#tests/helpers/team_factory';
import { createUser } from '#tests/helpers/user_factory';

test.group('Switching workspace', (group) => {
	truncateBetweenTests(group);

	test('a member switches into a team they belong to', async ({ client, assert }) => {
		const { team, owner } = await createTeam();

		const response = await client
			.post('/workspace/switch')
			.withCsrfToken()
			.form({ teamId: team.id })
			.loginAs(owner)
			.redirects(0);

		response.assertStatus(302);

		const page = await client
			.get('/settings/security')
			.withInertia()
			.withSession(response.session())
			.loginAs(owner);

		assert.equal(page.inertiaProps.workspace.kind, 'team');
		assert.equal(page.inertiaProps.workspace.team.id, team.id);
	});

	test('a stranger cannot switch into a team they do not belong to', async ({ client, assert }) => {
		const { team } = await createTeam();
		const stranger = await createUser();

		const response = await client
			.post('/workspace/switch')
			.withCsrfToken()
			.form({ teamId: team.id })
			.loginAs(stranger)
			.redirects(0);

		response.assertStatus(403);
		assert.notProperty(response.session(), 'active_workspace');
	});

	test('switching to the personal workspace clears the team', async ({ client, assert }) => {
		const { team, owner } = await createTeam();
		const joined = await client
			.post('/workspace/switch')
			.withCsrfToken()
			.form({ teamId: team.id })
			.loginAs(owner)
			.redirects(0);

		const left = await client
			.post('/workspace/switch')
			.withCsrfToken()
			.form({})
			.withSession(joined.session())
			.loginAs(owner)
			.redirects(0);

		const page = await client.get('/settings/security').withInertia().withSession(left.session()).loginAs(owner);

		assert.equal(page.inertiaProps.workspace.kind, 'personal');
	});

	/**
	 * The id in the session outlives the membership, so the middleware re-checks
	 * it on every request rather than trusting what switching wrote.
	 */
	test('a membership removed after switching falls back to personal', async ({ client, assert }) => {
		const { team, owner } = await createTeam();
		const joined = await client
			.post('/workspace/switch')
			.withCsrfToken()
			.form({ teamId: team.id })
			.loginAs(owner)
			.redirects(0);

		await db.from('team_members').where('team_id', team.id).where('user_id', owner.id).delete();

		const page = await client.get('/settings/security').withInertia().withSession(joined.session()).loginAs(owner);

		assert.equal(page.inertiaProps.workspace.kind, 'personal');
	});
});
