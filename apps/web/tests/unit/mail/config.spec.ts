import mail from '@adonisjs/mail/services/main';
import { test } from '@japa/runner';
import { defaultSender, smtpOptions } from '#config/mail';
import { mailEnvSchema } from '#start/env';

/**
 * `.env.test` deliberately sets no `MAIL_*` at all, so every assertion below
 * runs against the unset path a fresh clone takes.
 */
test.group('Mail configuration', () => {
	test('the smtp transport resolves', ({ assert }) => {
		assert.isDefined(mail.use('smtp'));
	});

	test('the default sender is built from the configured name and address', ({ assert }) => {
		assert.deepEqual(defaultSender, { address: 'noreply@example.com', name: 'web' });
	});

	/**
	 * Boot-time validation runs before anything else, so a required mail variable
	 * turns `pnpm dev` into an error on a machine that has never configured mail.
	 */
	test('every mail variable is optional, so an unset environment still boots', ({ assert }) => {
		for (const [key, validate] of Object.entries(mailEnvSchema)) {
			assert.doesNotThrow(() => validate(key, undefined), `${key} is required`);
		}
	});

	test('an unset environment points the transport at the local Mailpit', ({ assert }) => {
		assert.equal(smtpOptions.host, 'localhost');
		assert.equal(smtpOptions.port, 1025);
	});

	test('no credentials are sent when none are configured', ({ assert }) => {
		assert.isUndefined(smtpOptions.auth);
	});
});
