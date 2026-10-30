import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { nonDisposable } from '#app/core/validation/rules/non_disposable';
import { validationErrors } from '#tests/helpers/validation';

/** The chain a real validator uses: only well-formed addresses reach the rule. */
const emailValidator = (options?: Parameters<typeof nonDisposable>[0]) =>
	vine.create({ email: vine.string().email().use(nonDisposable(options)) });

/**
 * Without `email()`, so a malformed-but-normalizable address still reaches the
 * rule. `email()` would reject a trailing dot before the rule ever ran.
 */
const bareValidator = () => vine.create({ email: vine.string().use(nonDisposable()) });

const rejected = async (validator: ReturnType<typeof emailValidator>, email: string) => {
	const errors = await validationErrors(validator, { email });

	return errors.some((error) => error.rule === 'nonDisposableDomain');
};

test.group('Non disposable rule', () => {
	test('a listed disposable domain is rejected', async ({ assert }) => {
		const wasRejected = await rejected(emailValidator(), 'someone@mailinator.com');

		assert.isTrue(wasRejected);
	});

	test('a subdomain of a listed domain is rejected', async ({ assert }) => {
		const wasRejected = await rejected(emailValidator(), 'someone@inbox.mailinator.com');

		assert.isTrue(wasRejected);
	});

	test('a suffix that is not a subdomain is accepted', async ({ assert }) => {
		/**
		 * "xmailinator.com" ends with "mailinator.com" but is a different domain,
		 * and is not itself on the blocklist. A bare `endsWith` would reject it.
		 */
		const wasRejected = await rejected(emailValidator(), 'someone@xmailinator.com');

		assert.isFalse(wasRejected);
	});

	test('the domain is matched case-insensitively', async ({ assert }) => {
		const wasRejected = await rejected(emailValidator(), 'USER@Mailinator.COM');

		assert.isTrue(wasRejected);
	});

	test('a trailing dot on the domain is ignored', async ({ assert }) => {
		const wasRejected = await rejected(bareValidator(), 'user@mailinator.com.');

		assert.isTrue(wasRejected);
	});

	test('allow accepts a listed domain', async ({ assert }) => {
		const validator = emailValidator({ allow: ['mailinator.com'] });

		const wasRejected = await rejected(validator, 'someone@mailinator.com');

		assert.isFalse(wasRejected);
	});

	test('allow also accepts subdomains of the allowed domain', async ({ assert }) => {
		const validator = emailValidator({ allow: ['mailinator.com'] });

		const wasRejected = await rejected(validator, 'someone@inbox.mailinator.com');

		assert.isFalse(wasRejected);
	});

	test('block rejects an extra domain', async ({ assert }) => {
		const validator = emailValidator({ block: ['example.org'] });

		const wasRejected = await rejected(validator, 'someone@example.org');

		assert.isTrue(wasRejected);
	});

	test('block also rejects subdomains of the blocked domain', async ({ assert }) => {
		const validator = emailValidator({ block: ['example.org'] });

		const wasRejected = await rejected(validator, 'someone@mail.example.org');

		assert.isTrue(wasRejected);
	});

	test('an ordinary address passes', async ({ assert }) => {
		const wasRejected = await rejected(emailValidator(), 'someone@gmail.com');

		assert.isFalse(wasRejected);
	});

	test('it does not run when the field already failed an earlier rule', async ({ assert }) => {
		const validator = vine.create({ email: vine.string().email().use(nonDisposable()) });

		const errors = await validationErrors(validator, { email: 'not-an-email' });

		assert.notInclude(
			errors.map((error) => error.rule),
			'nonDisposableDomain',
		);
	});
});
