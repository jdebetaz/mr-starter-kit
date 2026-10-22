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

	// The fixture is a user who enabled 2FA some time ago, not this instant, so
	// no timestep is consumed yet. Without this reset the enabling code would
	// make the current step's login code read as a replay. Test-only: production
	// code never clears this marker.
	user.totpLastConsumedTimestep = null;
	await user.save();

	return user;
}

/**
 * The valid code for this instant, from the user's confirmed secret.
 */
export function currentCodeFor(user: User): string {
	return user.createTotp(user.getConfirmedSecret()).generate();
}
