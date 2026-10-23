import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import RegenerateRecoveryCodes from '#identity/actions/regenerate_recovery_codes';
import { passwordConfirmationValidator } from '#identity/validators/two_factor';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RegenerateRecoveryCodesController {
	constructor(private readonly regenerateRecoveryCodes: RegenerateRecoveryCodes) {}

	/**
	 * Replaces the user's codes after password confirmation. The new plaintext
	 * is returned as the direct response, never flashed: the session driver may
	 * be cookie-backed, which would write the codes into a client cookie.
	 */
	/**
	 * This path has no page of its own: the POST renders in place, so a refresh
	 * or bookmark lands here as a GET. Send it to the recovery page, which shows
	 * the already-issued state.
	 */
	async render({ response }: HttpContext) {
		return response.redirect().toRoute('two_factor.recovery.render');
	}

	async execute({ auth, inertia, request, response, session }: HttpContext) {
		const { password } = await request.validateUsing(passwordConfirmationValidator);

		const regenerated = await this.regenerateRecoveryCodes.execute({ user: auth.getUserOrFail(), password });

		if (!regenerated.ok) {
			switch (regenerated.error.type) {
				case 'two_factor_not_enabled':
					return response.redirect().toRoute('two_factor.start.render');
				case 'invalid_password':
					session.flash('error', 'That password is not correct.');
					return response.redirect().toRoute('two_factor.recovery.render');
				default:
					return assertNever(regenerated.error);
			}
		}

		inertia.encryptHistory();
		return inertia.render('settings/two-factor/recovery', {
			codes: regenerated.value,
			remaining: regenerated.value.length,
		});
	}
}
