import { test } from '@japa/runner';
import twoFactorConfig from '#config/two_factor';
import ConfirmTotpEnrollment from '#identity/actions/confirm_totp_enrollment';
import DisableTotp from '#identity/actions/disable_totp';
import GenerateRecoveryCodes from '#identity/actions/generate_recovery_codes';
import StartTotpEnrollment from '#identity/actions/start_totp_enrollment';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

test.group('StartTotpEnrollment', (group) => {
	truncateBetweenTests(group);
	const action = new StartTotpEnrollment();

	test('starting enrollment stores a pending secret', async ({ assert }) => {
		const user = await createUser();
		const result = await action.execute(user);
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.match(user.getEnrollmentSecret(), /^[A-Z2-7]+$/);
		assert.isTrue(user.hasPendingTwoFactor);
		assert.isFalse(user.isTwoFactorEnabled);
	});
});

test.group('ConfirmTotpEnrollment', (group) => {
	truncateBetweenTests(group);
	const action = new ConfirmTotpEnrollment();

	test('confirming with the right code enables two-factor', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const code = user.createTotp(user.getEnrollmentSecret()).generate();
		const result = await action.execute({ user, code });
		assert.isTrue(result.ok);
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('confirming with a wrong code reports invalid_code', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const result = await action.execute({ user, code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'invalid_code');
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('confirming without starting reports enrollment_not_started', async ({ assert }) => {
		const result = await action.execute({ user: await createUser(), code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'enrollment_not_started');
	});
});

test.group('DisableTotp', (group) => {
	truncateBetweenTests(group);
	const action = new DisableTotp();

	test('disabling with the right password turns two-factor off', async ({ assert }) => {
		const user = await enabledUser();
		const result = await action.execute({ user, password: 'password' });
		assert.isTrue(result.ok);
		assert.isFalse(user.isTwoFactorEnabled);
		await user.refresh();
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('disabling without the right password reports invalid_password', async ({ assert }) => {
		const user = await enabledUser();
		const result = await action.execute({ user, password: 'wrong' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'invalid_password');
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('an admin cannot disable 2FA even with the right password', async ({ assert }) => {
		const user = await enabledUser({ roles: ['ROLE_ADMIN'] });
		const result = await action.execute({ user, password: 'password' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'two_factor_required');
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('a required user is refused the same way with a wrong password', async ({ assert }) => {
		const user = await enabledUser({ roles: ['ROLE_ADMIN'] });
		const result = await action.execute({ user, password: 'wrong' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'two_factor_required');
	});
});

test.group('GenerateRecoveryCodes', (group) => {
	truncateBetweenTests(group);
	const action = new GenerateRecoveryCodes();

	test('an admin can still regenerate recovery codes', async ({ assert }) => {
		const result = await action.execute(await enabledUser({ roles: ['ROLE_ADMIN'] }));
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.lengthOf(result.value, twoFactorConfig.recoveryCodesCount);
	});

	test('a user without two-factor cannot generate recovery codes', async ({ assert }) => {
		const user = await createUser();
		const result = await action.execute(user);
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'two_factor_not_enabled');
		assert.equal(user.remainingRecoveryCodesCount, 0);
	});
});
