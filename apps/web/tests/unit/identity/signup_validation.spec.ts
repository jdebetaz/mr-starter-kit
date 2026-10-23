import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';
import { loginValidator, signupValidator } from '#identity/validators/user';
import { fakePwnedPasswords } from '#tests/helpers/fake_pwned_passwords';
import { validationErrors } from '#tests/helpers/validation';

/** A passphrase that is long, unleaked, and would fail the old 32-char cap. */
const LONG_PASSPHRASE = 'correct horse battery staple and then some more words';

const signup = (overrides: Record<string, unknown> = {}) => ({
	fullName: 'Ada Lovelace',
	email: 'ada@example.com',
	password: LONG_PASSPHRASE,
	passwordConfirmation: LONG_PASSPHRASE,
	...overrides,
});

const rulesOf = (errors: { rule: string }[]) => errors.map((error) => error.rule);

test.group('Signup validation', (group) => {
	group.each.setup(() => {
		fakePwnedPasswords(app.container);
		return () => app.container.restore(PwnedPasswordsVerifier);
	});

	test('it rejects a disposable email address', async ({ assert }) => {
		const errors = await validationErrors(signupValidator, signup({ email: 'ada@mailinator.com' }));

		assert.includeMembers(rulesOf(errors), ['nonDisposableDomain']);
	});

	test('it rejects a password that has appeared in a leak', async ({ assert }) => {
		fakePwnedPasswords(app.container).leaked(LONG_PASSPHRASE, 12);

		const errors = await validationErrors(signupValidator, signup());

		assert.includeMembers(rulesOf(errors), ['uncompromisedPassword']);
	});

	test('it rejects a password below the policy and names each unmet requirement', async ({ assert }) => {
		const errors = await validationErrors(
			signupValidator,
			signup({ password: 'short', passwordConfirmation: 'short' }),
		);

		assert.includeMembers(rulesOf(errors), ['passwordPolicy.minLength']);
	});

	test('it accepts a long passphrase that the old 32-character ceiling would have rejected', async ({ assert }) => {
		assert.isAbove(LONG_PASSPHRASE.length, 32);

		const errors = await validationErrors(signupValidator, signup());

		assert.lengthOf(errors, 0);
	});

	test('the leak check is skipped when the password already failed the policy', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leakedAll(99);

		const errors = await validationErrors(
			signupValidator,
			signup({ password: 'short', passwordConfirmation: 'short' }),
		);

		assert.isAbove(errors.length, 0);
		pwned.assertNoneVerified();
	});

	test('login does not perform a leak check', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leakedAll(99);

		const errors = await validationErrors(loginValidator, {
			email: 'ada@example.com',
			password: 'whatever they typed',
		});

		assert.lengthOf(errors, 0);
		pwned.assertNoneVerified();
	});
});

test.group('Chainable rule API', () => {
	test('the rules are available as chainable methods, as the docs describe', ({ assert }) => {
		const schema = vine.string();

		assert.isFunction(schema.passwordPolicy);
		assert.isFunction(schema.uncompromised);
		assert.isFunction(schema.nonDisposable);
	});
});
