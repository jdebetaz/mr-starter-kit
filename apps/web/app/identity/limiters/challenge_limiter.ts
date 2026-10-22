import { errors } from '@adonisjs/limiter';
import limiter from '@adonisjs/limiter/services/main';
import type { UUID } from '#core/types';

const attempts = limiter.use({ requests: 5, duration: '15 mins' });

export type ChallengeAttempt = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const keyFor = (userId: UUID): string => `login_challenge_${userId}`;

/**
 * Caps second-factor guesses at five per fifteen minutes per pending user.
 * One budget covers both the TOTP and the recovery-code forms, so switching
 * form does not double the guesses.
 *
 * `attempt` spends one try, and must run before any verification: checking a
 * recovery code walks up to ten scrypt hashes on the shared libuv threadpool,
 * so an unthrottled endpoint would stall unrelated requests as well.
 */
export const challengeLimiter = {
	async attempt(userId: UUID): Promise<ChallengeAttempt> {
		try {
			await attempts.consume(keyFor(userId));
			return { allowed: true };
		} catch (error) {
			if (error instanceof errors.E_TOO_MANY_REQUESTS) {
				return { allowed: false, retryAfterSeconds: error.response.availableIn };
			}
			throw error;
		}
	},

	/** Forgets the spent tries once the user has proved the second factor. */
	async reset(userId: UUID): Promise<void> {
		await attempts.delete(keyFor(userId));
	},
};
