import { inject } from '@adonisjs/core';
import { challengeLimiter, throttledMessage } from '#app/identity/limiters/challenge_limiter';
import { recoveryCodeValidator } from '#app/identity/validators/two_factor';
import { assertNever } from '#core/assert_never';
import VerifyRecoveryChallenge from '#identity/actions/verify_recovery_challenge';
import { PendingLogin } from '#identity/services/pending_login';
import type { HttpContext } from '@adonisjs/core/http';

/** At or below this many unused codes, the user is told to generate new ones. */
const LOW_CODES_THRESHOLD = 2;

@inject()
export default class RecoveryChallengeController {
	constructor(private readonly verifyRecoveryChallenge: VerifyRecoveryChallenge) {}

	async render({ inertia, response, session }: HttpContext) {
		if (!PendingLogin.peek(session)) {
			return response.redirect().toRoute('login.render');
		}

		return inertia.render('auth/recovery-challenge', {});
	}

	async execute({ auth, request, response, session }: HttpContext) {
		const { code } = await request.validateUsing(recoveryCodeValidator);

		const userId = PendingLogin.peek(session);

		/**
		 * Throttle before verifying: a recovery check walks up to ten scrypt
		 * hashes on the shared libuv threadpool, so it must never run for a
		 * request that is over the limit. Without a pending id the Action returns
		 * before any lookup, so the unthrottled branch does no verification work.
		 */
		if (userId) {
			const attempt = await challengeLimiter.attempt('recovery', userId, request.ip());

			if (!attempt.allowed) {
				response.header('Retry-After', String(attempt.retryAfterSeconds));
				session.flash('error', throttledMessage(attempt.retryAfterSeconds));

				return response.redirect().toRoute('login.challenge.recovery.render');
			}
		}

		const verified = await this.verifyRecoveryChallenge.execute({ userId, code });

		if (!verified.ok) {
			switch (verified.error.type) {
				case 'no_pending_login':
				case 'not_challengeable':
					session.flash('error', 'Your sign-in expired. Please log in again.');

					return response.redirect().toRoute('login.render');
				case 'invalid_recovery_code':
					session.flash('error', 'That recovery code is not valid or was already used.');

					return response.redirect().toRoute('login.challenge.recovery.render');
				default:
					return assertNever(verified.error);
			}
		}

		const { user, remainingCodes } = verified.value;

		PendingLogin.take(session);
		await challengeLimiter.reset('recovery', user.id, request.ip());
		await auth.use('web').login(user);

		if (remainingCodes <= LOW_CODES_THRESHOLD) {
			session.flash(
				'warning',
				`You have ${remainingCodes} recovery code${remainingCodes === 1 ? '' : 's'} left. Generate new ones in your security settings.`,
			);
		}

		return response.redirect().toRoute('home');
	}
}
