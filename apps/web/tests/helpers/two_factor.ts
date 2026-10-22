import encryption from '@adonisjs/core/services/encryption';
import { TOTP } from 'otpauth';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';

/**
 * Persists a user that has completed TOTP enrolment, so specs can start
 * from a user whose second factor is on.
 */
export async function enabledUser(attributes?: Parameters<typeof createUser>[0]): Promise<User> {
	const user = await createUser(attributes);
	await user.generateSecret();
	const confirmed = await user.enableTwoFactor(user.createTotp(user.getEnrollmentSecret()).generate());

	if (!confirmed) {
		throw new Error('enabledUser could not confirm the freshly generated secret');
	}

	return user;
}

/**
 * The valid code for this instant, from the user's confirmed secret.
 */
export function currentCodeFor(user: User): string {
	const encrypted = user.totpSecret;
	const secret = encrypted ? encryption.decrypt<string>(encrypted) : null;

	if (!secret) {
		throw new Error('currentCodeFor needs a user with a readable confirmed TOTP secret');
	}

	return new TOTP({ secret }).generate();
}
