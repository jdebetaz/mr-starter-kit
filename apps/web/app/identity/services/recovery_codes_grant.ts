import twoFactorConfig from '#config/two_factor';
import type { Session } from '@adonisjs/session';

const SESSION_KEY = 'recovery_codes_grant';

interface RecoveryCodesGrantMarker {
	expiresAt: number;
}

/**
 * A one-shot permission, set when enrollment is confirmed, to mint the first
 * set of recovery codes without a password. It carries no secret: the codes
 * themselves are never put in the session, which may be cookie-backed.
 */
export const RecoveryCodesGrant = {
	/** Expiry is fixed here, so a clock moving backwards cannot extend a grant. */
	put(session: Session): void {
		const marker: RecoveryCodesGrantMarker = {
			expiresAt: Date.now() + twoFactorConfig.recoveryGrantTtl * 1000,
		};
		session.put(SESSION_KEY, marker);
	},

	/** Consumes the grant. `true` only if one was present and unexpired. */
	take(session: Session): boolean {
		const marker = session.get(SESSION_KEY) as Partial<RecoveryCodesGrantMarker> | undefined;
		session.forget(SESSION_KEY);

		/** A malformed marker could never expire, so it is discarded rather than trusted. */
		return typeof marker?.expiresAt === 'number' && Date.now() < marker.expiresAt;
	},
};
