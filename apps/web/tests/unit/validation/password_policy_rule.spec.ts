import { definePasswordPolicy } from '@boilerplate/validation/password-policy';
import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { enforcePasswordPolicy } from '#core/validation/rules/password_policy';
import { validationErrors } from '#tests/helpers/validation';

test.group('Password policy rule', () => {
	test('it reports one error per unmet requirement', async ({ assert }) => {
		const validator = vine.create({
			password: vine.string().use(enforcePasswordPolicy(definePasswordPolicy({ minLength: 12, numbers: true }))),
		});

		const errors = await validationErrors(validator, { password: 'secret' });

		assert.includeMembers(
			errors.map((error) => error.rule),
			['passwordPolicy.minLength', 'passwordPolicy.numbers'],
		);
	});

	test('it passes a password meeting every requirement', async ({ assert }) => {
		const validator = vine.create({
			password: vine.string().use(enforcePasswordPolicy(definePasswordPolicy({ minLength: 12, numbers: true }))),
		});

		const errors = await validationErrors(validator, { password: 'correct horse 7 battery' });

		assert.lengthOf(errors, 0);
	});

	test('it does not run when the field already failed an earlier rule', async ({ assert }) => {
		const validator = vine.create({
			password: vine
				.string()
				.minLength(50)
				.use(enforcePasswordPolicy(definePasswordPolicy({ numbers: true }))),
		});

		const errors = await validationErrors(validator, { password: 'short' });

		assert.notInclude(
			errors.map((error) => error.rule),
			'passwordPolicy.numbers',
		);
	});
});
