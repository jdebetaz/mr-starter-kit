import { test } from '@japa/runner';
import twoFactorConfig from '#config/two_factor';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

test.group('Recovery codes', (group) => {
	truncateBetweenTests(group);

	test('generates the configured number of codes in the documented format', async ({ assert }) => {
		const user = await createUser();
		const codes = await user.generateRecoveryCodes();
		assert.lengthOf(codes, twoFactorConfig.recoveryCodesCount);
		codes.forEach((code) => assert.match(code, /^[a-z0-9]{5}-[a-z0-9]{5}$/));
		assert.lengthOf(new Set(codes), codes.length);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('codes are not stored in plaintext', async ({ assert }) => {
		const user = await createUser();
		const codes = await user.generateRecoveryCodes();
		await user.refresh();
		assert.isString(user.recoveryCodes);
		for (const code of codes) {
			assert.notInclude(user.recoveryCodes!, code);
			assert.notInclude(user.recoveryCodes!, code.replace('-', ''));
		}
	});

	test('a code is single use', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		assert.isTrue(await user.verifyRecoveryCode(first));
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
		assert.isFalse(await user.verifyRecoveryCode(first));
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
	});

	test('consuming a code is persisted and leaves the others usable', async ({ assert }) => {
		const user = await createUser();
		const [first, second] = await user.generateRecoveryCodes();
		assert.isTrue(await user.verifyRecoveryCode(first));
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
		assert.isFalse(await user.verifyRecoveryCode(first));
		assert.isTrue(await user.verifyRecoveryCode(second));
	});

	test('a code verifies uppercase and without the dash', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		assert.isTrue(await user.verifyRecoveryCode(first.toUpperCase().replace('-', '')));
	});

	test('a code verifies with surrounding and inner whitespace', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		assert.isTrue(await user.verifyRecoveryCode(` ${first.slice(0, 5)} - ${first.slice(6)}\n`));
	});

	test('a wrong code is rejected and consumes nothing', async ({ assert }) => {
		const user = await createUser();
		await user.generateRecoveryCodes();
		assert.isFalse(await user.verifyRecoveryCode('zzzzz-zzzzz'));
		assert.isFalse(await user.verifyRecoveryCode(''));
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('regenerating replaces the previous codes', async ({ assert }) => {
		const user = await createUser();
		const [old] = await user.generateRecoveryCodes();
		await user.generateRecoveryCodes();
		assert.isFalse(await user.verifyRecoveryCode(old));
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('verifying against no codes returns false', async ({ assert }) => {
		const user = await createUser();
		assert.isFalse(await user.verifyRecoveryCode('abcde-fghij'));
		assert.equal(user.remainingRecoveryCodesCount, 0);
	});

	test('generating codes leaves the TOTP state untouched', async ({ assert }) => {
		const user = await enabledUser();
		const before = [
			user.totpSecret,
			user.totpPendingSecret,
			user.totpEnabledAt?.toMillis(),
			user.totpLastConsumedTimestep,
		];
		await user.generateRecoveryCodes();
		assert.deepEqual(
			[user.totpSecret, user.totpPendingSecret, user.totpEnabledAt?.toMillis(), user.totpLastConsumedTimestep],
			before,
		);
	});

	test('disabling two-factor clears the recovery codes', async ({ assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.disableTwoFactor();
		assert.equal(user.remainingRecoveryCodesCount, 0);
		assert.isFalse(await user.verifyRecoveryCode(code));
	});
});
