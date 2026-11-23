import twoFactorConfig from '#config/two_factor';
import type { UUID } from '#core/types';
import type { Session } from '@adonisjs/session';

const SESSION_KEY = 'recovery_codes_grant';

interface RecoveryCodesGrantMarker {
	expiresAt: number;
	userId: UUID;
}

/**
 * A one-shot permission, set when enrollment is confirmed, to mint the first
 * set of recovery codes without a password. It carries no secret: the codes
 * themselves are never put in the session, which may be cookie-backed.
 *
 * The grant is bound to one user. `login()` regenerates the session id but keeps
 * the values store, and `logout()` forgets only the auth key, so an unconsumed
 * grant would otherwise survive into the next user's session on the same browser
 * and let them silently replace their saved codes.
 *
 * Known limitation: under the default `SESSION_DRIVER=cookie`, consuming the
 * grant is a write back into the client's own cookie, so single-use is enforced
 * by the client. A holder of the pre-consumption cookie can replay the grant
 * until it expires. That is bounded to the TTL and to the user's own codes.
 */
export const RecoveryCodesGrant = {
	/** Expiry is fixed here, so a clock moving backwards cannot extend a grant. */
	put(session: Session, userId: UUID): void {
		const marker: RecoveryCodesGrantMarker = {
			expiresAt: Date.now() + twoFactorConfig.recoveryGrantTtl * 1000,
			userId,
		};
		session.put(SESSION_KEY, marker);
	},

	/** Consumes the grant. `true` only if one was present, unexpired and minted for `userId`. */
	take(session: Session, userId: UUID): boolean {
		/** SAFETY: the shape is not trusted; every field is checked below before use. */
		const marker = session.get(SESSION_KEY) as Partial<RecoveryCodesGrantMarker> | undefined;
		session.forget(SESSION_KEY);

		/**
		 * A malformed marker could never expire or be attributed, so it is discarded
		 * rather than trusted. The session store is the I/O boundary: these checks are
		 * the parse, so there is no earlier place to decode the marker.
		 */
		return (
			// oxlint-disable-next-line tenkai/no-runtime-typeof
			typeof marker?.expiresAt === 'number' &&
			// oxlint-disable-next-line tenkai/no-runtime-typeof
			typeof marker.userId === 'string' &&
			Date.now() < marker.expiresAt &&
			marker.userId === userId
		);
	},
};
