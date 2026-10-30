import { Secret } from '@adonisjs/core/helpers';
import { test } from '@japa/runner';
import twoFactorConfig from '#config/two_factor';
import User from '#identity/models/user';
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
		const stored = user.recoveryCodes?.release();
		assert.isString(stored);

		for (const code of codes) {
			assert.notInclude(stored!, code);
			assert.notInclude(stored!, code.replace('-', ''));
		}
	});

	test('a code is single use', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		const acceptedFirst = await user.verifyRecoveryCode(first);

		assert.isTrue(acceptedFirst);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
		const rejectedFirst = await user.verifyRecoveryCode(first);

		assert.isFalse(rejectedFirst);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
	});

	test('consuming a code is persisted and leaves the others usable', async ({ assert }) => {
		const user = await createUser();
		const [first, second] = await user.generateRecoveryCodes();
		const acceptedFirst = await user.verifyRecoveryCode(first);

		assert.isTrue(acceptedFirst);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 1);
		const rejectedFirst = await user.verifyRecoveryCode(first);

		assert.isFalse(rejectedFirst);
		const acceptedSecond = await user.verifyRecoveryCode(second);

		assert.isTrue(acceptedSecond);
	});

	test('a code verifies uppercase and without the dash', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		const accepted = await user.verifyRecoveryCode(first.toUpperCase().replace('-', ''));

		assert.isTrue(accepted);
	});

	test('a code verifies with surrounding and inner whitespace', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		const accepted = await user.verifyRecoveryCode(` ${first.slice(0, 5)} - ${first.slice(6)}\n`);

		assert.isTrue(accepted);
	});

	test('a wrong code is rejected and consumes nothing', async ({ assert }) => {
		const user = await createUser();
		await user.generateRecoveryCodes();
		const rejectedWrong = await user.verifyRecoveryCode('zzzzz-zzzzz');

		assert.isFalse(rejectedWrong);
		const rejectedEmpty = await user.verifyRecoveryCode('');

		assert.isFalse(rejectedEmpty);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('regenerating replaces the previous codes', async ({ assert }) => {
		const user = await createUser();
		const [old] = await user.generateRecoveryCodes();
		await user.generateRecoveryCodes();
		const rejectedOld = await user.verifyRecoveryCode(old);

		assert.isFalse(rejectedOld);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('verifying against no codes returns false', async ({ assert }) => {
		const user = await createUser();
		const rejected = await user.verifyRecoveryCode('abcde-fghij');

		assert.isFalse(rejected);
		assert.equal(user.remainingRecoveryCodesCount, 0);
	});

	test('generating codes leaves the TOTP state untouched', async ({ assert }) => {
		const user = await enabledUser();
		const before = [
			user.totpSecret?.release(),
			user.totpPendingSecret?.release(),
			user.totpEnabledAt?.toMillis(),
			user.totpLastConsumedTimestep,
		];
		await user.generateRecoveryCodes();
		assert.deepEqual(
			[
				user.totpSecret?.release(),
				user.totpPendingSecret?.release(),
				user.totpEnabledAt?.toMillis(),
				user.totpLastConsumedTimestep,
			],
			before,
		);
	});

	test('disabling two-factor clears the recovery codes', async ({ assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.disableTwoFactor();
		assert.equal(user.remainingRecoveryCodesCount, 0);
		const rejected = await user.verifyRecoveryCode(code);

		assert.isFalse(rejected);
	});

	test('a stale instance cannot resurrect codes revoked by a regeneration', async ({ assert }) => {
		const user = await createUser();
		const [old] = await user.generateRecoveryCodes();

		const stale = await User.findOrFail(user.id);
		const other = await User.findOrFail(user.id);
		const fresh = await other.generateRecoveryCodes();

		const rejectedOld = await stale.verifyRecoveryCode(old);

		assert.isFalse(rejectedOld);

		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
		const acceptedFresh = await user.verifyRecoveryCode(fresh[0]);

		assert.isTrue(acceptedFresh);
	});

	test('a stale instance cannot resurrect a code consumed elsewhere', async ({ assert }) => {
		const user = await createUser();
		const [first, second] = await user.generateRecoveryCodes();

		const stale = await User.findOrFail(user.id);
		const other = await User.findOrFail(user.id);
		const acceptedElsewhere = await other.verifyRecoveryCode(first);

		assert.isTrue(acceptedElsewhere);

		// The stale snapshot still holds `first`; consuming `second` must not bring it back.
		const acceptedSecond = await stale.verifyRecoveryCode(second);

		assert.isTrue(acceptedSecond);
		const rejectedStale = await stale.verifyRecoveryCode(first);

		assert.isFalse(rejectedStale);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount - 2);
		const rejectedFresh = await user.verifyRecoveryCode(first);

		assert.isFalse(rejectedFresh);
	});

	test('input that cannot be a code is rejected', async ({ assert }) => {
		const user = await createUser();
		await user.generateRecoveryCodes();
		const rejectedSymbols = await user.verifyRecoveryCode('!!!!!!!!!!');

		assert.isFalse(rejectedSymbols);
		const rejectedInner = await user.verifyRecoveryCode('abcd!fghij');

		assert.isFalse(rejectedInner);
		assert.equal(user.remainingRecoveryCodesCount, twoFactorConfig.recoveryCodesCount);
	});

	test('the dash position is not significant', async ({ assert }) => {
		const user = await createUser();
		const [first] = await user.generateRecoveryCodes();
		const bare = first.replace('-', '');
		const accepted = await user.verifyRecoveryCode(`${bare.slice(0, 3)}-${bare.slice(3)}`);

		assert.isTrue(accepted);
	});

	test('a malformed stored value reads as no codes', async ({ assert }) => {
		const user = await createUser();
		user.recoveryCodes = new Secret('not json');
		assert.equal(user.remainingRecoveryCodesCount, 0);
		user.recoveryCodes = new Secret('{"a":1}');
		assert.equal(user.remainingRecoveryCodesCount, 0);
		const rejected = await user.verifyRecoveryCode('abcde-fghij');

		assert.isFalse(rejected);
	});

	test('seedRecoveryCode is overridable', async ({ assert }) => {
		const user = await createUser();
		let n = 0;
		user.seedRecoveryCode = () => `code${n++}-aaaaa`.slice(0, 11);
		const codes = await user.generateRecoveryCodes();
		assert.equal(codes[0], 'code0-aaaaa');
		const accepted = await user.verifyRecoveryCode('code3-aaaaa');

		assert.isTrue(accepted);
	});
});
