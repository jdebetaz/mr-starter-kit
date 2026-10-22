import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';

/**
 * Persists a user that has completed TOTP enrolment, so specs can start
 * from a user whose second factor is on.
 */
export async function enabledUser(attributes?: Parameters<typeof createUser>[0]): Promise<User> {
	const user = await createUser(attributes);
	await user.generateSecret();
	// Enrol with the previous step's code: enabling consumes its timestep, and
	// specs then log in with the current step's code, which must still be fresh.
	const enablingCode = user.createTotp(user.getEnrollmentSecret()).generate({ timestamp: Date.now() - 30_000 });
	const confirmed = await user.enableTwoFactor(enablingCode);

	if (!confirmed) {
		throw new Error('enabledUser could not confirm the freshly generated secret');
	}

	return user;
}

/**
 * The valid code for this instant, from the user's confirmed secret.
 */
export function currentCodeFor(user: User): string {
	return user.createTotp(user.getConfirmedSecret()).generate();
}
