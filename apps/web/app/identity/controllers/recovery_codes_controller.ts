import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import GenerateRecoveryCodes from '#identity/actions/generate_recovery_codes';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RecoveryCodesController {
	constructor(private readonly generateRecoveryCodes: GenerateRecoveryCodes) {}

	/**
	 * Idempotent: codes are minted only the first time, when the user has none.
	 * Any later visit (refresh, Back, bookmark) shows the "already issued" state,
	 * so a GET can never revoke codes the user has saved. Replacing them is the
	 * explicit regenerate action.
	 */
	async render({ auth, inertia, response }: HttpContext) {
		const user = auth.getUserOrFail();

		if (!user.isTwoFactorEnabled) {
			return response.redirect().toRoute('two_factor.start.render');
		}

		if (user.remainingRecoveryCodesCount > 0) {
			return inertia.render('settings/two-factor/recovery', { codes: null });
		}

		const generated = await this.generateRecoveryCodes.execute(user);

		if (!generated.ok) {
			switch (generated.error.type) {
				case 'two_factor_not_enabled':
					return response.redirect().toRoute('two_factor.start.render');
				default:
					return assertNever(generated.error.type);
			}
		}

		return inertia.render('settings/two-factor/recovery', { codes: generated.value });
	}

	/**
	 * The acknowledgement: the user confirms they saved the codes shown by `render`.
	 */
	async execute({ response, session }: HttpContext) {
		session.flash('success', 'Two-factor authentication is on.');
		return response.redirect().toRoute('settings.security.render');
	}
}
