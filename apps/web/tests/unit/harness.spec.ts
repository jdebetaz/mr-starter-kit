import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createUser } from '#tests/helpers/user_factory';

test.group('Test harness', (group) => {
	truncateBetweenTests(group);

	test('creates a user in a truncated database', async ({ assert }) => {
		const user = await createUser();
		assert.exists(user.id);
		assert.isTrue(user.email.includes('@'));
	});

	test('does not see the user created by the previous test', async ({ assert }) => {
		const { default: User } = await import('#identity/models/user');
		const users = await User.all();

		assert.lengthOf(users, 0);
	});
});
