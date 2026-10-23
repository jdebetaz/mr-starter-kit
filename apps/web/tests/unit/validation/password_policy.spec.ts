import { checkPassword, definePasswordPolicy, toPasswordRulesString } from '@boilerplate/validation/password-policy';
import { test } from '@japa/runner';

test.group('Password policy', () => {
	test('a policy with no options requires only 8 characters', ({ assert }) => {
		const policy = definePasswordPolicy();

		assert.deepEqual(policy.minLength, 8);
		assert.isFalse(policy.mixedCase);
		assert.isNull(policy.maxLength);
		assert.equal(policy.minScore, 0);
	});

	test('requirements report each enabled rule and whether it is met', ({ assert }) => {
		const policy = definePasswordPolicy({ minLength: 12, mixedCase: true, numbers: true });

		const result = checkPassword('secret', policy);

		assert.isFalse(result.valid);
		assert.deepEqual(result.requirements, [
			{ rule: 'minLength', met: false, min: 12 },
			{ rule: 'mixedCase', met: false },
			{ rule: 'numbers', met: false },
		]);
	});

	test('a disabled requirement is absent from the list', ({ assert }) => {
		const result = checkPassword('anything', definePasswordPolicy({ minLength: 4 }));

		assert.lengthOf(result.requirements, 1);
	});

	test('a long lowercase passphrase outscores a short complex password', ({ assert }) => {
		const policy = definePasswordPolicy();

		const passphrase = checkPassword('correct horse battery staple', policy).score;
		const gibberish = checkPassword('Tr0ub4!', policy).score;

		assert.isAbove(passphrase, gibberish);
	});

	test('an empty password returns a coherent result rather than throwing', ({ assert }) => {
		const result = checkPassword('', definePasswordPolicy({ minLength: 8, numbers: true }));

		assert.isFalse(result.valid);
		assert.equal(result.score, 0);
		assert.isTrue(result.requirements.every((requirement) => !requirement.met));
	});

	test('a non-ASCII password counts characters, not UTF-16 code units', ({ assert }) => {
		/**
		 * "pässwörd🔐" is 9 characters but 10 UTF-16 code units, because the emoji
		 * is a surrogate pair. A naive `.length` would report 10 and wrongly call a
		 * 10-character minimum met, so the assertion is that it is NOT met.
		 */
		const result = checkPassword('pässwörd🔐', definePasswordPolicy({ minLength: 10 }));

		assert.isFalse(result.requirements[0].met);
	});

	test('toPasswordRulesString emits what password managers read', ({ assert }) => {
		const rules = toPasswordRulesString(definePasswordPolicy({ minLength: 12, mixedCase: true, numbers: true }));

		assert.include(rules, 'minlength: 12;');
		assert.include(rules, 'required: lower;');
		assert.include(rules, 'required: upper;');
		assert.include(rules, 'required: digit;');
	});
});
