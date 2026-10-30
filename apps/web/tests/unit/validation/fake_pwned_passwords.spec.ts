import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';
import { uncompromised } from '#core/validation/rules/uncompromised';
import { fakePwnedPasswords } from '#tests/helpers/fake_pwned_passwords';
import { validationErrors } from '#tests/helpers/validation';

const passwordValidator = vine.create({ password: vine.string().use(uncompromised()) });

const rulesOf = (errors: { rule: string }[]) => errors.map((error) => error.rule);

test.group('Fake pwned passwords', (group) => {
	group.each.teardown(() => {
		app.container.restore(PwnedPasswordsVerifier);
	});

	test('a marked password is reported leaked with its count', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leaked('secret123', 12);

		const errors = await validationErrors(passwordValidator, { password: 'secret123' });

		assert.includeMembers(rulesOf(errors), ['uncompromisedPassword']);
		pwned.assertVerified('secret123');
	});

	test('an unmarked password is uncompromised', async ({ assert }) => {
		fakePwnedPasswords(app.container).leaked('secret123');

		const errors = await validationErrors(passwordValidator, { password: 'a different one' });

		assert.lengthOf(errors, 0);
	});

	test('leakedAll marks every password, and explicit counts still win', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leakedAll(2).leaked('specific', 9);

		const anyCount = await pwned.verify('anything at all', 5000);

		assert.equal(anyCount, 2);

		const specificCount = await pwned.verify('specific', 5000);

		assert.equal(specificCount, 9);
	});

	test('simulateOutage reports everything uncompromised, including marked passwords', async ({ assert }) => {
		fakePwnedPasswords(app.container).leaked('secret123', 99).simulateOutage();

		const errors = await validationErrors(passwordValidator, { password: 'secret123' });

		assert.lengthOf(errors, 0);
	});

	test('assertNoneVerified holds when the field failed an earlier rule', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leakedAll();
		const validator = vine.create({ password: vine.string().minLength(50).use(uncompromised()) });

		const errors = await validationErrors(validator, { password: 'short' });

		assert.isAbove(errors.length, 0);
		pwned.assertNoneVerified();
	});

	test('assertVerified fails when the password was never checked', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container);

		assert.throws(() => pwned.assertVerified('never submitted'));
	});

	test('restore puts the real verifier back and clears recorded checks', async ({ assert }) => {
		const pwned = fakePwnedPasswords(app.container).leakedAll();
		await validationErrors(passwordValidator, { password: 'secret123' });

		pwned.restore();

		const verifier = await app.container.make(PwnedPasswordsVerifier);

		assert.instanceOf(verifier, PwnedPasswordsVerifier);
		pwned.assertNoneVerified();
	});
});
