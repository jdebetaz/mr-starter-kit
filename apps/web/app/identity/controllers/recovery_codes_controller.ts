import { inject } from '@adonisjs/core';
import GenerateRecoveryCodes from '#identity/actions/generate_recovery_codes';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RecoveryCodesController {
	constructor(private readonly generateRecoveryCodes: GenerateRecoveryCodes) {}

	async render({ auth, inertia, response }: HttpContext) {
		const generated = await this.generateRecoveryCodes.execute(auth.getUserOrFail());

		if (!generated.ok) {
			switch (generated.error.type) {
				case 'two_factor_not_enabled':
					return response.redirect().toRoute('two_factor.start.render');
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
