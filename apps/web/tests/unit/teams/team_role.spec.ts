import { test } from '@japa/runner';
import { canManageBilling, canManageMembers, TEAM_ROLES } from '#teams/domain/team_role';

test.group('TeamRole', () => {
	test('the role set is owner, admin and member', ({ assert }) => {
		assert.deepEqual([...TEAM_ROLES], ['owner', 'admin', 'member']);
	});

	test('owners and admins manage billing; members do not', ({ assert }) => {
		assert.isTrue(canManageBilling('owner'));
		assert.isTrue(canManageBilling('admin'));
		assert.isFalse(canManageBilling('member'));
	});

	test('owners and admins manage members; members do not', ({ assert }) => {
		assert.isTrue(canManageMembers('owner'));
		assert.isTrue(canManageMembers('admin'));
		assert.isFalse(canManageMembers('member'));
	});
});
