import { inject } from '@adonisjs/core';
import TwoFactorStatusQuery from '#identity/queries/two_factor_status';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class SecuritySettingsController {
	constructor(private readonly twoFactorStatus: TwoFactorStatusQuery) {}

	async render({ auth, inertia }: HttpContext) {
		const status = await this.twoFactorStatus.execute(auth.getUserOrFail());

		return inertia.render('settings/security', { status });
	}
}
