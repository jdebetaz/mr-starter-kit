import { test } from '@japa/runner';
import { EncryptedColumnUnreadable } from '#core/exceptions/encrypted_column';
import { TotpEnrollmentNotStarted, TotpNotEnabled } from '#identity/exceptions/totp';

test.group('TOTP exceptions', () => {
	test('TotpNotEnabled is a plain Error carrying a stable code', ({ assert }) => {
		const error = new TotpNotEnabled();

		assert.instanceOf(error, Error);
		assert.equal(error.code, 'E_TOTP_NOT_ENABLED');
	});

	test('TotpEnrollmentNotStarted carries its own code', ({ assert }) => {
		assert.equal(new TotpEnrollmentNotStarted().code, 'E_TOTP_ENROLLMENT_NOT_STARTED');
	});

	test('neither exception carries an HTTP status out of src/', ({ assert }) => {
		assert.notProperty(new TotpNotEnabled(), 'status');
		assert.notProperty(new TotpEnrollmentNotStarted(), 'status');
	});
});

test.group('Encrypted column exception', () => {
	test('EncryptedColumnUnreadable names the column it could not decrypt', ({ assert }) => {
		const error = new EncryptedColumnUnreadable('totp_secret');

		assert.instanceOf(error, Error);
		assert.equal(error.code, 'E_ENCRYPTED_COLUMN_UNREADABLE');
		assert.include(error.message, 'totp_secret');
	});
});
