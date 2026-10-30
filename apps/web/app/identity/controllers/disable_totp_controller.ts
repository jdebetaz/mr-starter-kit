import { inject } from '@adonisjs/core';
import { passwordConfirmationValidator } from '#app/identity/validators/two_factor';
import { assertNever } from '#core/assert_never';
import DisableTotp from '#identity/actions/disable_totp';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class DisableTotpController {
	constructor(private readonly disableTotp: DisableTotp) {}

	async execute({ auth, request, response, session }: HttpContext) {
		const { password } = await request.validateUsing(passwordConfirmationValidator);

		const disabled = await this.disableTotp.execute({ user: auth.getUserOrFail(), password });

		if (!disabled.ok) {
			switch (disabled.error.type) {
				case 'two_factor_required':
					session.flash('error', 'Two-factor authentication is required for your account.');
					break;
				case 'invalid_password':
					session.flash('error', 'That password is not correct.');
					break;
				default:
					return assertNever(disabled.error);
			}

			return response.redirect().toRoute('settings.security.render');
		}

		session.flash('success', 'Two-factor authentication is off.');

		return response.redirect().toRoute('settings.security.render');
	}
}
