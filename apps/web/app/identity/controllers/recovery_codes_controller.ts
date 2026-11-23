import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import GenerateRecoveryCodes from '#identity/actions/generate_recovery_codes';
import { RecoveryCodesGrant } from '#identity/services/recovery_codes_grant';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RecoveryCodesController {
	constructor(private readonly generateRecoveryCodes: GenerateRecoveryCodes) {}

	/**
	 * Codes are minted only as the hand-off from a just-confirmed enrollment,
	 * which leaves a single-use grant in the session. Without it (refresh, Back,
	 * bookmark, or a stolen session) the page shows the "already issued" state:
	 * a GET can neither revoke codes the user has saved nor mint new ones with
	 * no password. Replacing them is the password-confirmed regenerate action.
	 */
	async render({ auth, inertia, response, session }: HttpContext) {
		const user = auth.getUserOrFail();

		if (!user.isTwoFactorEnabled) {
			return response.redirect().toRoute('two_factor.start.render');
		}

		if (!RecoveryCodesGrant.take(session, user.id)) {
			return inertia.render('settings/two-factor/recovery', {
				codes: null,
				remaining: user.remainingRecoveryCodesCount,
			});
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

		/** The plaintext lives in the page props; keep it out of readable history state. */
		inertia.encryptHistory();

		return inertia.render('settings/two-factor/recovery', {
			codes: generated.value,
			remaining: generated.value.length,
		});
	}

	/**
	 * The acknowledgement: the user confirms they saved the codes shown by `render`.
	 */
	async execute({ inertia, response, session }: HttpContext) {
		inertia.clearHistory();
		session.flash('success', 'Two-factor authentication is on.');

		return response.redirect().toRoute('settings.security.render');
	}
}
