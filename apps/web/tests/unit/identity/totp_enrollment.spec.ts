import { Secret } from '@adonisjs/core/helpers';
import encryption from '@adonisjs/core/services/encryption';
import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import { TOTP } from 'otpauth';
import User from '#identity/models/user';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

function codeOfThrown(fn: () => void): string | undefined {
	try {
		fn();
	} catch (error) {
		// SAFETY: the errors these helpers catch are AdonisJS exceptions, which carry an optional string `code`.
		return (error as { code?: string }).code;
	}

	return undefined;
}

async function codeOfRejected<T>(fn: () => Promise<T>): Promise<string | undefined> {
	try {
		await fn();
	} catch (error) {
		// SAFETY: the errors these helpers catch are AdonisJS exceptions, which carry an optional string `code`.
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

		// The column holds the plain secret; the ciphertext is what reaches the row.
		const row = await db.from('users').select('totp_pending_secret').where('id', user.id).first();
		// SAFETY: generateSecret has just written this column, so the selected value is a non-null string.
		assert.notInclude((row as { totp_pending_secret: string }).totp_pending_secret, user.getEnrollmentSecret());

		assert.isTrue(user.hasPendingTwoFactor);
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('the stored confirmed secret is ciphertext bound to its column purpose', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const secret = user.getEnrollmentSecret();
		const enabled = await user.enableTwoFactor(user.createTotp(secret).generate());

		assert.isTrue(enabled);

		const row = await db.from('users').select('totp_secret').where('id', user.id).first();
		// SAFETY: enableTwoFactor has just set this column, so the selected value is a non-null string.
		const stored = (row as { totp_secret: string }).totp_secret;

		assert.notEqual(stored, secret);
		assert.equal(encryption.decrypt(stored, 'users.totp_secret'), secret);
		// A value lifted into the pending column cannot be read back there.
		assert.isNull(encryption.decrypt(stored, 'users.totp_pending_secret'));
	});

	test('re-enrolling leaves a confirmed secret untouched', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		await user.enableTwoFactor(new TOTP({ secret: user.getEnrollmentSecret() }).generate());
		const confirmed = user.totpSecret?.release();
		const enabledAt = user.totpEnabledAt;
		assert.isNotNull(confirmed);

		await user.generateSecret();

		assert.equal(user.totpSecret?.release(), confirmed);
		assert.equal(user.totpEnabledAt?.toMillis(), enabledAt?.toMillis());
		assert.isTrue(user.isTwoFactorEnabled);
		assert.isTrue(user.hasPendingTwoFactor);

		await user.refresh();
		assert.equal(user.totpSecret?.release(), confirmed);
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('enableTwoFactor promotes the pending secret', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const secret = user.getEnrollmentSecret();
		const pending = user.totpPendingSecret?.release();

		const enabled = await user.enableTwoFactor(new TOTP({ secret }).generate());

		assert.isTrue(enabled);
		assert.isNull(user.totpPendingSecret);
		assert.equal(user.totpSecret?.release(), pending);
		assert.isNotNull(user.totpEnabledAt);
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('enableTwoFactor rejects a wrong code and changes nothing', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const pending = user.totpPendingSecret?.release();

		const rejected = await user.enableTwoFactor('000000');

		assert.isFalse(rejected);
		assert.equal(user.totpPendingSecret?.release(), pending);
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
		await user.generateSecret();
		await db.from('users').where('id', user.id).update({ totp_pending_secret: 'not-a-ciphertext' });

		// The column decrypts on read, so a tampered row cannot even be loaded:
		// it can never reach the enrollment path reading as "not enrolled".
		const rejectionCode = await codeOfRejected(() => User.findOrFail(user.id));

		assert.equal(rejectionCode, 'E_ENCRYPTED_COLUMN_UNREADABLE');

		// The state is still there, it is only unreadable: nothing turned it into "not set".
		const row = await db.from('users').select('totp_pending_secret').where('id', user.id).first();
		// SAFETY: the row was just selected with this column alone, and the typed shape allows null.
		assert.isNotNull((row as { totp_pending_secret: string | null }).totp_pending_secret);
	});

	test('second-factor columns are never serialized', async ({ assert }) => {
		const user = await enabledUser();
		user.recoveryCodes = new Secret('stored-hashes');
		await user.generateSecret();

		const serialized = user.serialize();

		assert.property(serialized, 'email');

		for (const column of ['totpSecret', 'totpPendingSecret', 'recoveryCodes']) {
			assert.notProperty(serialized, column);
		}
	});

	test('disableTwoFactor clears every TOTP column', async ({ assert }) => {
		const user = await enabledUser();
		user.recoveryCodes = new Secret('stored-hashes');
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
		const qrCode = await user.generateQRCode();

		assert.match(qrCode, /^data:image\/png;base64,/);
	});
});
