import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createUser } from '#tests/helpers/user_factory';

test.group('TOTP columns', (group) => {
	truncateBetweenTests(group);

	test('a new user has no TOTP state', async ({ assert }) => {
		const user = await createUser();
		assert.isNull(user.totpPendingSecret);
		assert.isNull(user.totpSecret);
		assert.isNull(user.totpEnabledAt);
		assert.isNull(user.totpLastConsumedTimestep);
		assert.isNull(user.recoveryCodes);
		assert.isNull(user.totpRequired);
	});
});
