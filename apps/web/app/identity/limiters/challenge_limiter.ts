import { errors } from '@adonisjs/limiter';
import limiter from '@adonisjs/limiter/services/main';
import type { UUID } from '#core/types';

export type ChallengeForm = 'totp' | 'recovery';

export type ChallengeAttempt = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Tight budget per (user, IP) and per form: a mistyped TOTP never closes the recovery path. */
const perIp = {
	totp: limiter.use({ requests: 5, duration: '15 mins' }),
	recovery: limiter.use({ requests: 5, duration: '15 mins' }),
} satisfies Record<ChallengeForm, ReturnType<typeof limiter.use>>;

/** Looser cap per user across all IPs and both forms, bounding a distributed guesser. */
const perUser = limiter.use({ requests: 20, duration: '1 hour' });

const ipKey = (form: ChallengeForm, userId: UUID, ip: string): string => `challenge_${form}_${userId}_${ip}`;
const userKey = (userId: UUID): string => `challenge_user_${userId}`;

async function spend(budget: ReturnType<typeof limiter.use>, key: string): Promise<ChallengeAttempt> {
	try {
		await budget.consume(key);

		return { allowed: true };
	} catch (error) {
		if (error instanceof errors.E_TOO_MANY_REQUESTS) {
			return { allowed: false, retryAfterSeconds: error.response.availableIn };
		}

		throw error;
	}
}

/**
 * Caps second-factor guesses. Each attempt spends from the (user, IP, form)
 * budget and from the per-user budget, so a remote attacker who knows the
 * password cannot drain the budget the victim's own IP draws from, while the
 * per-user cap still bounds a distributed guesser.
 *
 * `attempt` must run before any verification: checking a recovery code walks
 * up to ten scrypt hashes on the shared libuv threadpool, so an unthrottled
 * endpoint would stall unrelated requests as well.
 */
export const challengeLimiter = {
	async attempt(form: ChallengeForm, userId: UUID, ip: string): Promise<ChallengeAttempt> {
		const local = await spend(perIp[form], ipKey(form, userId, ip));

		if (!local.allowed) {
			return local;
		}

		return spend(perUser, userKey(userId));
	},

	/** Forgets the spent tries once the user has proved the second factor. */
	async reset(form: ChallengeForm, userId: UUID, ip: string): Promise<void> {
		await perIp[form].delete(ipKey(form, userId, ip));
		await perUser.delete(userKey(userId));
	},
};

export function throttledMessage(retryAfterSeconds: number): string {
	const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

	return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
