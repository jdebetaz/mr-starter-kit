import type { UUID } from '#core/types';
import type { Session } from '@adonisjs/session';

const SESSION_KEY = 'active_workspace';

/**
 * Parks the id of the team the user is currently acting in. Absent means the
 * personal workspace.
 *
 * The id is only a hint: a membership can be revoked between requests, so the
 * middleware re-resolves it against the database on every request rather than
 * trusting what switching wrote. Following `PendingLogin`, a malformed marker
 * is discarded rather than trusted.
 */
export const ActiveWorkspace = {
	read(session: Session): UUID | null {
		/** SAFETY: the shape is not trusted; it is checked before use. */
		const teamId = session.get(SESSION_KEY) as unknown;

		// oxlint-disable-next-line tenkai/no-runtime-typeof
		if (typeof teamId !== 'string') {
			return null;
		}

		/** SAFETY: checked to be a string above; UUID is a branded string. */
		return teamId as UUID;
	},

	put(session: Session, teamId: UUID): void {
		session.put(SESSION_KEY, teamId);
	},

	clear(session: Session): void {
		session.forget(SESSION_KEY);
	},
};
