import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import ConfirmTotpEnrollment from '#identity/actions/confirm_totp_enrollment';
import PendingTotpEnrollmentQuery from '#identity/queries/pending_totp_enrollment';
import { totpCodeValidator } from '#identity/validators/two_factor';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class ConfirmTotpEnrollmentController {
	constructor(
		private readonly pendingEnrollment: PendingTotpEnrollmentQuery,
		private readonly confirmTotpEnrollment: ConfirmTotpEnrollment,
	) {}

	async render({ auth, inertia, response }: HttpContext) {
		const enrollment = await this.pendingEnrollment.execute(auth.getUserOrFail());

		if (!enrollment) {
			return response.redirect().toRoute('two_factor.start.render');
		}

		return inertia.render('settings/two-factor/verify', enrollment);
	}

	async execute({ auth, request, response, session }: HttpContext) {
		const { code } = await request.validateUsing(totpCodeValidator);

		const user = auth.getUserOrFail();
		const confirmed = await this.confirmTotpEnrollment.execute({ user, code });

		if (!confirmed.ok) {
			switch (confirmed.error.type) {
				case 'enrollment_not_started':
					/**
					 * A repeat submit (double click, Back then resubmit) arrives after the
					 * first one enabled 2FA and consumed the pending secret. That user has
					 * finished enrolling, so send them on rather than back to step one.
					 */
					return response
						.redirect()
						.toRoute(user.isTwoFactorEnabled ? 'two_factor.recovery.render' : 'two_factor.start.render');
				case 'invalid_code':
					session.flash('error', 'That code is not valid. Check your authenticator app and try again.');
					return response.redirect().toRoute('two_factor.verify.render');
				default:
					return assertNever(confirmed.error);
			}
		}

		return response.redirect().toRoute('two_factor.recovery.render');
	}
}
