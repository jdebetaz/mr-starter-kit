import { test } from '@japa/runner';
import ChangeMemberRole from '#teams/actions/change_member_role';
import RemoveMember from '#teams/actions/remove_member';
import TransferOwnership from '#teams/actions/transfer_ownership';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createTeam } from '#tests/helpers/team_factory';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type Team from '#teams/models/team';

const teams = () => new TeamRepository();

async function withMember(team: Team): Promise<User> {
	const member = await createUser();

	await teams().addMember({ teamId: team.id, userId: member.id, role: 'member' });

	return member;
}

test.group('Membership', (group) => {
	truncateBetweenTests(group);

	test('the owner cannot be demoted while they are the only owner', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await new ChangeMemberRole(teams()).execute({
			teamId: team.id,
			actorRole: 'owner',
			userId: owner.id,
			role: 'admin',
		});

		assert.equal(result.ok ? '' : result.error.type, 'would_leave_team_ownerless');
	});

	test('the owner cannot be removed from their own team', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await new RemoveMember(teams()).execute({
			teamId: team.id,
			actorRole: 'owner',
			userId: owner.id,
		});

		assert.equal(result.ok ? '' : result.error.type, 'would_leave_team_ownerless');
	});

	test('ownership transfers to another member atomically', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const successor = await withMember(team);

		const result = await new TransferOwnership(teams()).execute({
			teamId: team.id,
			actorRole: 'owner',
			toUserId: successor.id,
			fromUserId: owner.id,
		});

		assert.isTrue(result.ok);

		const successorMembership = await teams().membershipFor(team.id, successor.id);
		const previousMembership = await teams().membershipFor(team.id, owner.id);
		const owners = await teams().ownerCount(team.id);

		assert.equal(successorMembership?.role, 'owner');
		assert.equal(previousMembership?.role, 'admin');
		assert.equal(owners, 1);
	});

	test('an admin cannot transfer ownership', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const successor = await withMember(team);

		const result = await new TransferOwnership(teams()).execute({
			teamId: team.id,
			actorRole: 'admin',
			toUserId: successor.id,
			fromUserId: owner.id,
		});

		assert.equal(result.ok ? '' : result.error.type, 'not_permitted');
	});

	/** Review Focus #1: an id from another team must not reach this one. */
	test('a member of another team cannot be removed from this one', async ({ assert }) => {
		const { team } = await createTeam();
		const other = await createTeam();
		const outsider = await withMember(other.team);

		const result = await new RemoveMember(teams()).execute({
			teamId: team.id,
			actorRole: 'owner',
			userId: outsider.id,
		});

		const stillThere = await teams().membershipFor(other.team.id, outsider.id);

		assert.equal(result.ok ? '' : result.error.type, 'not_a_member');
		assert.isNotNull(stillThere);
	});

	/**
	 * Promoting a second owner collides with the partial unique index, which
	 * surfaced as an unhandled 500 rather than an outcome the controller maps.
	 */
	test('promoting someone to owner is refused in favour of transferring', async ({ assert }) => {
		const { team } = await createTeam();
		const member = await withMember(team);

		const result = await new ChangeMemberRole(teams()).execute({
			teamId: team.id,
			actorRole: 'owner',
			userId: member.id,
			role: 'owner',
		});

		assert.equal(result.ok ? '' : result.error.type, 'use_transfer_ownership');
	});

	test('a member cannot change roles', async ({ assert }) => {
		const { team } = await createTeam();
		const member = await withMember(team);

		const result = await new ChangeMemberRole(teams()).execute({
			teamId: team.id,
			actorRole: 'member',
			userId: member.id,
			role: 'admin',
		});

		assert.equal(result.ok ? '' : result.error.type, 'not_permitted');
	});
});
