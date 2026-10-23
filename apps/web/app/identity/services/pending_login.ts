import twoFactorConfig from '#config/two_factor';
import type { UUID } from '#core/types';
import type { Session } from '@adonisjs/session';

const SESSION_KEY = 'pending_login';

interface PendingLoginMarker {
	userId: UUID;
	expiresAt: number;
}

function read(session: Session): UUID | null {
	const marker = session.get(SESSION_KEY) as Partial<PendingLoginMarker> | undefined;

	if (marker === undefined) {
		return null;
	}

	/** A malformed marker could never expire, so it is discarded rather than trusted. */
	if (typeof marker?.userId !== 'string' || typeof marker.expiresAt !== 'number') {
		session.forget(SESSION_KEY);
		return null;
	}

	if (Date.now() >= marker.expiresAt) {
		session.forget(SESSION_KEY);
		return null;
	}

	return marker.userId;
}

/**
 * Parks the id of a user whose password was verified but whose second factor
 * is still owed. Nobody is logged in while it is parked.
 */
export const PendingLogin = {
	/** Expiry is fixed here, so a clock moving backwards cannot extend a marker. */
	put(session: Session, userId: UUID): void {
		const marker: PendingLoginMarker = {
			userId,
			expiresAt: Date.now() + twoFactorConfig.pendingLoginTtl * 1000,
		};
		session.put(SESSION_KEY, marker);
	},

	/** Reads the parked id and removes the marker. */
	take(session: Session): UUID | null {
		const userId = read(session);
		session.forget(SESSION_KEY);
		return userId;
	},

	/** Reads the parked id and leaves the marker in place. */
	peek(session: Session): UUID | null {
		return read(session);
	},
};
