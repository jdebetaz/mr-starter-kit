import twoFactorConfig from '#config/two_factor';
import type User from '#identity/models/user';

/**
 * Decides whether a user is obliged to have two-factor authentication.
 *
 * A per-user override wins outright in both directions: `true` requires it
 * even when no role does, and `false` exempts a user whose roles would
 * require it. Without an override (`null`), the user is required when they
 * hold any role listed in `requiredForRoles`.
 *
 * It reads configuration and an already-loaded model and touches no database.
 */
export function isTwoFactorRequiredFor(user: User): boolean {
	if (user.totpRequired !== null) {
		return user.totpRequired;
	}

	return user.hasRole(twoFactorConfig.requiredForRoles);
}
