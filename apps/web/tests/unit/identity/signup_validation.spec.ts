import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';
import { loginValidator, signupValidator } from '#identity/validators/user';
import { fakePwnedPasswords } from '#tests/helpers/fake_pwned_passwords';
import { validationErrors } from '#tests/helpers/validation';
import type { FakePwnedPasswords } from '#tests/helpers/fake_pwned_passwords';

/** A passphrase that is long, unleaked, and would fail the old 32-char cap. */
const LONG_PASSPHRASE = 'correct horse battery staple and then some more words';

type SignupOverrides = Partial<{
	fullName: string;
	email: string;
	password: string | undefined;
	passwordConfirmation: string | undefined;
}>;

const signup = (overrides: SignupOverrides = {}) => ({
	fullName: 'Ada Lovelace',
	email: 'ada@example.com',
	password: LONG_PASSPHRASE,
	passwordConfirmation: LONG_PASSPHRASE,
	...overrides,
});

const rulesOf = (errors: { rule: string }[]) => errors.map((error) => error.rule);

const messageFor = (errors: { rule: string; message: string }[], rule: string) =>
	errors.find((error) => error.rule === rule)?.message ?? '';

test.group('Signup validation', (group) => {
	let pwned: FakePwnedPasswords;

	/**
	 * The signup validator's `unique` rule reads the users table, so these
	 * tests only mean anything against a known-empty one.
	 */
	group.each.setup(() => testUtils.db().truncate());

	group.each.setup(() => {
		pwned = fakePwnedPasswords(app.container);

		return () => app.container.restore(PwnedPasswordsVerifier);
	});

	test('it rejects a disposable email address', async ({ assert }) => {
		const errors = await validationErrors(signupValidator, signup({ email: 'ada@mailinator.com' }));

		assert.includeMembers(rulesOf(errors), ['nonDisposableDomain']);
	});

	test('it rejects a password that has appeared in a leak', async ({ assert }) => {
		pwned.leaked(LONG_PASSPHRASE, 12);

		const errors = await validationErrors(signupValidator, signup());

		assert.includeMembers(rulesOf(errors), ['uncompromisedPassword']);
	});

	test('it rejects a password below the policy and names each unmet requirement', async ({ assert }) => {
		const errors = await validationErrors(
			signupValidator,
			signup({ password: 'short', passwordConfirmation: 'short' }),
		);

		assert.includeMembers(rulesOf(errors), ['passwordPolicy.minLength', 'passwordPolicy.minScore']);
	});

	test('it accepts a long passphrase that the old 32-character ceiling would have rejected', async ({ assert }) => {
		assert.isAbove(LONG_PASSPHRASE.length, 32);

		const errors = await validationErrors(signupValidator, signup());

		assert.lengthOf(errors, 0);
	});

	test('the leak check is skipped when the password already failed the policy', async ({ assert }) => {
		pwned.leakedAll(99);

		const errors = await validationErrors(
			signupValidator,
			signup({ password: 'short', passwordConfirmation: 'short' }),
		);

		assert.isAbove(errors.length, 0);
		pwned.assertNoneVerified();
	});

	/**
	 * Pins a wart rather than a feature, so nobody reorders the chain hoping to
	 * save the round trip. `confirmed` reports against the confirmation field
	 * and only runs once the password has passed everything else, so the leak
	 * lookup has already happened by the time a mismatch can be reported.
	 */
	test('a mismatched confirmation is reported, and does not save the leak check', async ({ assert }) => {
		const errors = await validationErrors(signupValidator, signup({ passwordConfirmation: 'something else' }));

		assert.includeMembers(rulesOf(errors), ['confirmed']);
		pwned.assertVerified(LONG_PASSPHRASE);
	});

	/**
	 * The other half of the same mechanism: a password that fails on its own
	 * suppresses the confirmation error entirely, so the form shows one problem
	 * at a time rather than both.
	 */
	test('a leaked password suppresses the confirmation error', async ({ assert }) => {
		pwned.leakedAll(99);

		const errors = await validationErrors(signupValidator, signup({ passwordConfirmation: 'something else' }));

		assert.includeMembers(rulesOf(errors), ['uncompromisedPassword']);
		assert.notInclude(rulesOf(errors), 'confirmed');
	});

	test('an absent password reports only that it is required', async ({ assert }) => {
		pwned.leakedAll(99);

		const errors = await validationErrors(
			signupValidator,
			signup({ password: undefined, passwordConfirmation: undefined }),
		);

		assert.includeMembers(rulesOf(errors), ['required']);
		assert.isEmpty(rulesOf(errors).filter((rule) => rule.startsWith('passwordPolicy.')));
		pwned.assertNoneVerified();
	});

	test('login does not perform a leak check', async ({ assert }) => {
		pwned.leakedAll(99);

		const errors = await validationErrors(loginValidator, {
			email: 'ada@example.com',
			password: 'whatever they typed',
		});

		assert.lengthOf(errors, 0);
		pwned.assertNoneVerified();
	});
});

/**
 * The messages registered in "start/validator.ts" are user-facing copy keyed
 * by rule name. A misspelled key does not fail anything: VineJS quietly falls
 * back to the rule's own generic message, which is exactly the per-requirement
 * detail this feature exists to provide. These tests are what stops that.
 */
test.group('Signup validation messages', (group) => {
	group.each.setup(() => testUtils.db().truncate());

	group.each.setup(() => {
		fakePwnedPasswords(app.container).leakedAll(7);

		return () => app.container.restore(PwnedPasswordsVerifier);
	});

	test('the policy message names the requirement and the number it was measured against', async ({ assert }) => {
		const errors = await validationErrors(
			signupValidator,
			signup({ password: 'short', passwordConfirmation: 'short' }),
		);

		assert.include(messageFor(errors, 'passwordPolicy.minLength'), 'at least 12');
	});

	test('the leaked-password message explains what happened', async ({ assert }) => {
		const errors = await validationErrors(signupValidator, signup());

		assert.include(messageFor(errors, 'uncompromisedPassword'), 'data leak');
	});

	test('the disposable-domain message explains what happened', async ({ assert }) => {
		const errors = await validationErrors(signupValidator, signup({ email: 'ada@mailinator.com' }));

		assert.include(messageFor(errors, 'nonDisposableDomain'), 'Disposable');
	});
});

/**
 * The rules are published as VineJS macros, so the documented chainable form
 * works. Asserting the methods exist is not enough: a macro that ignored its
 * options, or applied the wrong rule, would still be a function.
 */
test.group('Chainable rule API', () => {
	test('a chained rule applies the same check as use()', async ({ assert }) => {
		const validator = vine.create({ email: vine.string().email().nonDisposable() });

		const errors = await validationErrors(validator, { email: 'someone@mailinator.com' });

		assert.includeMembers(rulesOf(errors), ['nonDisposableDomain']);
	});

	test('a chained rule passes its options through', async ({ assert }) => {
		const validator = vine.create({
			email: vine
				.string()
				.email()
				.nonDisposable({ allow: ['mailinator.com'] }),
		});

		const errors = await validationErrors(validator, { email: 'someone@mailinator.com' });

		assert.lengthOf(errors, 0);
	});

	test('every rule is chainable', ({ assert }) => {
		const schema = vine.string();

		assert.isFunction(schema.passwordPolicy);
		assert.isFunction(schema.uncompromised);
		assert.isFunction(schema.nonDisposable);
	});
});
