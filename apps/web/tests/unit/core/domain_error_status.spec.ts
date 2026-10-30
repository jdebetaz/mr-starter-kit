import { test } from '@japa/runner';
import HttpExceptionHandler from '#app/core/exceptions/handler';
import { EncryptedColumnUnreadable } from '#core/exceptions/encrypted_column';
import { TotpEnrollmentNotStarted, TotpNotEnabled } from '#identity/exceptions/totp';

/**
 * `report()` runs before `handle()` and both go through `toHttpError`, which
 * defaults a status-less error to 500. Mapping codes anywhere later than
 * `toHttpError` leaves the log level and `ignoreStatuses` reading 500 while the
 * response reads the real status.
 */
test.group('Domain error status mapping', () => {
	const handler = new HttpExceptionHandler();

	test('an out-of-order TOTP read maps to 409 before reporting', ({ assert }) => {
		assert.equal(handler.toHttpError(new TotpNotEnabled()).status, 409);
		assert.equal(handler.toHttpError(new TotpEnrollmentNotStarted()).status, 409);
	});

	test('an unreadable encrypted column maps to 500', ({ assert }) => {
		assert.equal(handler.toHttpError(new EncryptedColumnUnreadable('totp_secret')).status, 500);
	});

	test('a non-domain error keeps the framework default', ({ assert }) => {
		assert.equal(handler.toHttpError(new Error('boom')).status, 500);
	});
});
