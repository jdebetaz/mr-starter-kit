import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import GenerateRecoveryCodes from '#identity/actions/generate_recovery_codes';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RegenerateRecoveryCodesController {
	constructor(private readonly generateRecoveryCodes: GenerateRecoveryCodes) {}

	/**
	 * Replaces the user's codes. The new plaintext is returned as the direct
	 * response, never flashed: the session driver may be cookie-backed, which
	 * would write the codes into a client cookie.
	 */
	async execute({ auth, inertia, response }: HttpContext) {
		const generated = await this.generateRecoveryCodes.execute(auth.getUserOrFail());

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
}
