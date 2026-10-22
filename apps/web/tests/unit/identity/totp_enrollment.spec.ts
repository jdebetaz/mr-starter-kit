import { test } from '@japa/runner';
import { TOTP } from 'otpauth';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

function codeOfThrown(fn: () => unknown): string | undefined {
	try {
		fn();
	} catch (error) {
		return (error as { code?: string }).code;
	}
	return undefined;
}

test.group('TOTP enrollment', (group) => {
	truncateBetweenTests(group);

	test('generateSecret stores an encrypted pending secret', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		assert.isNotNull(user.totpPendingSecret);
		assert.notInclude(user.totpPendingSecret!, user.getEnrollmentSecret());
		assert.isTrue(user.hasPendingTwoFactor);
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('re-enrolling leaves a confirmed secret untouched', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		await user.enableTwoFactor(new TOTP({ secret: user.getEnrollmentSecret() }).generate());
		const confirmed = user.totpSecret;
		const enabledAt = user.totpEnabledAt;
		assert.isNotNull(confirmed);

		await user.generateSecret();

		assert.equal(user.totpSecret, confirmed);
		assert.equal(user.totpEnabledAt?.toMillis(), enabledAt?.toMillis());
		assert.isTrue(user.isTwoFactorEnabled);
		assert.isTrue(user.hasPendingTwoFactor);

		await user.refresh();
		assert.equal(user.totpSecret, confirmed);
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('enableTwoFactor promotes the pending secret', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const secret = user.getEnrollmentSecret();
		const pending = user.totpPendingSecret;

		assert.isTrue(await user.enableTwoFactor(new TOTP({ secret }).generate()));
		assert.isNull(user.totpPendingSecret);
		assert.equal(user.totpSecret, pending);
		assert.isNotNull(user.totpEnabledAt);
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('enableTwoFactor rejects a wrong code and changes nothing', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const pending = user.totpPendingSecret;

		assert.isFalse(await user.enableTwoFactor('000000'));
		assert.equal(user.totpPendingSecret, pending);
		assert.isNull(user.totpSecret);
		assert.isNull(user.totpEnabledAt);
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('getSecretUri and getEnrollmentSecret throw when enrollment has not started', async ({ assert }) => {
		const user = await createUser();
		for (const read of [() => user.getSecretUri(), () => user.getEnrollmentSecret()]) {
			assert.equal(codeOfThrown(read), 'E_TOTP_ENROLLMENT_NOT_STARTED');
		}
	});

	test('enableTwoFactor throws when enrollment has not started', async ({ assert }) => {
		const user = await createUser();
		await assert.rejects(() => user.enableTwoFactor('123456'), /enrollment has not been started/);
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('an unreadable pending secret throws instead of reading as not enrolled', async ({ assert }) => {
		const user = await createUser();
		user.totpPendingSecret = 'not-a-ciphertext';
		assert.equal(
			codeOfThrown(() => user.getEnrollmentSecret()),
			'E_TOTP_SECRET_UNREADABLE',
		);
		assert.isTrue(user.hasPendingTwoFactor);
	});

	test('second-factor columns are never serialized', async ({ assert }) => {
		const user = await enabledUser();
		user.recoveryCodes = 'stored-hashes';
		await user.generateSecret();

		const serialized = user.serialize();

		assert.property(serialized, 'email');
		for (const column of ['totpSecret', 'totpPendingSecret', 'recoveryCodes']) {
			assert.notProperty(serialized, column);
		}
	});

	test('disableTwoFactor clears every TOTP column', async ({ assert }) => {
		const user = await enabledUser();
		user.recoveryCodes = 'stored-hashes';
		user.totpLastConsumedTimestep = 12345;
		await user.save();

		await user.disableTwoFactor();
		await user.refresh();

		assert.isNull(user.totpPendingSecret);
		assert.isNull(user.totpSecret);
		assert.isNull(user.totpEnabledAt);
		assert.isNull(user.totpLastConsumedTimestep);
		assert.isNull(user.recoveryCodes);
	});

	test('the QR code is a PNG data URL', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		assert.match(await user.generateQRCode(), /^data:image\/png;base64,/);
	});
});
