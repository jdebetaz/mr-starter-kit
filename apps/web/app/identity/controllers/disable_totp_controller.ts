import { inject } from '@adonisjs/core';
import DisableTotp from '#identity/actions/disable_totp';
import { disableTotpValidator } from '#identity/validators/two_factor';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class DisableTotpController {
	constructor(private readonly disableTotp: DisableTotp) {}

	async execute({ auth, request, response, session }: HttpContext) {
		const { password } = await request.validateUsing(disableTotpValidator);

		const disabled = await this.disableTotp.execute({ user: auth.getUserOrFail(), password });

		if (!disabled.ok) {
			switch (disabled.error.type) {
				case 'two_factor_required':
					session.flash('error', 'Two-factor authentication is required for your account.');
					break;
				case 'invalid_password':
					session.flash('error', 'That password is not correct.');
					break;
			}
			return response.redirect().toRoute('settings.security.render');
		}

		session.flash('success', 'Two-factor authentication is off.');
		return response.redirect().toRoute('settings.security.render');
	}
}
