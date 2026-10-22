import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import VerifyTotpChallenge from '#identity/actions/verify_totp_challenge';
import { challengeLimiter } from '#identity/limiters/challenge_limiter';
import { PendingLogin } from '#identity/services/pending_login';
import { totpCodeValidator } from '#identity/validators/two_factor';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class TotpChallengeController {
	constructor(private readonly verifyTotpChallenge: VerifyTotpChallenge) {}

	async render({ inertia, response, session }: HttpContext) {
		if (!PendingLogin.peek(session)) {
			return response.redirect().toRoute('login.render');
		}

		return inertia.render('auth/challenge', {});
	}

	async execute({ auth, request, response, session }: HttpContext) {
		const { code } = await request.validateUsing(totpCodeValidator);

		const userId = PendingLogin.peek(session);

		/** Throttle first: nothing below may run for a request that is over the limit. */
		if (userId) {
			const attempt = await challengeLimiter.attempt(userId);

			if (!attempt.allowed) {
				session.flash('error', throttledMessage(attempt.retryAfterSeconds));
				return response.redirect().toRoute('login.challenge.render');
			}
		}

		const verified = await this.verifyTotpChallenge.execute({ userId, code });

		if (!verified.ok) {
			switch (verified.error.type) {
				case 'no_pending_login':
				case 'not_challengeable':
					session.flash('error', 'Your sign-in expired. Please log in again.');
					return response.redirect().toRoute('login.render');
				case 'invalid_code':
					session.flash('error', 'That code is not valid. Check your authenticator app and try again.');
					return response.redirect().toRoute('login.challenge.render');
				default:
					return assertNever(verified.error);
			}
		}

		PendingLogin.take(session);
		await challengeLimiter.reset(verified.value.id);
		await auth.use('web').login(verified.value);
		return response.redirect().toRoute('home');
	}
}

function throttledMessage(retryAfterSeconds: number): string {
	const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
	return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
