import { randomUUID } from 'node:crypto';
import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import CreateTeam from '#teams/actions/create_team';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createUser } from '#tests/helpers/user_factory';

test.group('CreateTeam', (group) => {
	truncateBetweenTests(group);

	const createTeamAction = new CreateTeam(new TeamRepository());

	test('a new team has exactly one member, its owner', async ({ assert }) => {
		const owner = await createUser();
		const team = await createTeamAction.execute({ name: 'Acme Rockets', owner });
		const members = await db.from('team_members').where('team_id', team.id);

		assert.lengthOf(members, 1);
		assert.equal(members[0].user_id, owner.id);
		assert.equal(members[0].role, 'owner');
	});

	/**
	 * These two go through raw inserts on purpose: they test the migration's
	 * constraints, which are the final defence, not the Action's checks.
	 */
	test('the database refuses a second owner for one team', async ({ assert }) => {
		const owner = await createUser();
		const other = await createUser();
		const team = await createTeamAction.execute({ name: 'Acme Rockets', owner });
		const teamId = team.id;

		await assert.rejects(() =>
			db.table('team_members').insert({
				id: randomUUID(),
				team_id: teamId,
				user_id: other.id,
				role: 'owner',
				created_at: new Date(),
				updated_at: new Date(),
			}),
		);
	});

	test('the database refuses the same user twice in one team', async ({ assert }) => {
		const owner = await createUser();
		const team = await createTeamAction.execute({ name: 'Acme Rockets', owner });
		const teamId = team.id;

		await assert.rejects(() =>
			db.table('team_members').insert({
				id: randomUUID(),
				team_id: teamId,
				user_id: owner.id,
				role: 'member',
				created_at: new Date(),
				updated_at: new Date(),
			}),
		);
	});
});
