import app from '@adonisjs/core/services/app';
import vine from '@vinejs/vine';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';

export interface UncompromisedOptions {
	/**
	 * How many times a password may appear in data leaks before it counts as
	 * compromised. Defaults to 0: seen once is enough.
	 */
	threshold?: number;

	/**
	 * How long to wait for the leak database, in milliseconds. On timeout the
	 * password is treated as uncompromised.
	 */
	timeout?: number;
}

const DEFAULT_THRESHOLD = 0;
const DEFAULT_TIMEOUT = 5000;

/**
 * Rejects a password that appears in known data leaks. Apply it wherever a
 * person chooses a password, and chain it **after** the cheaper local rules:
 * it makes one outgoing request per validated password, and skipping it for a
 * password that already failed saves both the round trip and the leak lookup
 * for a value that was never going to be accepted.
 *
 * ```ts
 * vine.string().use(enforcePasswordPolicy(policy)).use(uncompromised());
 * ```
 */
export const uncompromised = vine.createRule<UncompromisedOptions | undefined>(
	async (value, options, field) => {
		if (!field.isValid) {
			return;
		}

		const verifier = await app.container.make(PwnedPasswordsVerifier);
		/** SAFETY: the rule is only applied to `vine.string()`, which has already validated the type. */
		const occurrences = await verifier.verify(value as string, options?.timeout ?? DEFAULT_TIMEOUT);

		if (occurrences > (options?.threshold ?? DEFAULT_THRESHOLD)) {
			field.report(
				'The {{ field }} has appeared in a data leak. Please choose a different {{ field }}',
				'uncompromisedPassword',
				field,
			);
		}
	},
	{ isAsync: true },
);
