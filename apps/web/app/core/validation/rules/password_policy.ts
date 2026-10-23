import { checkPassword } from '@boilerplate/validation/password-policy';
import vine from '@vinejs/vine';
import type { PasswordPolicy } from '@boilerplate/validation/password-policy';

/**
 * Enforces a password policy, reporting one error per unmet requirement under
 * its own `passwordPolicy.<rule>` key, so a form can mark exactly which
 * requirements are outstanding instead of showing one combined message.
 *
 * It is deliberately named for the verb: a policy *object* is usually in scope
 * under the name `passwordPolicy` wherever this rule is applied.
 *
 * ```ts
 * vine.string().use(enforcePasswordPolicy(passwordPolicy));
 * ```
 */
export const enforcePasswordPolicy = vine.createRule<PasswordPolicy>((value, policy, field) => {
	/**
	 * A field that already failed an earlier rule has nothing useful to say
	 * here: reporting "not strong enough" alongside "must be a string" only
	 * adds noise.
	 */
	if (!field.isValid) {
		return;
	}

	const { requirements } = checkPassword(value as string, policy);

	for (const requirement of requirements) {
		if (requirement.met) {
			continue;
		}

		field.report(
			'The {{ field }} field does not meet the password policy',
			`passwordPolicy.${requirement.rule}`,
			field,
			{ min: requirement.min, max: requirement.max },
		);
	}
});
