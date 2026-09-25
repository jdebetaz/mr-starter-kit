import { inject } from '@adonisjs/core';
import RegisterUser from '#identity/actions/register_user';
import { signupValidator } from '#identity/validators/user';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RegisterController {
	constructor(private readonly registerUser: RegisterUser) {}

	async render({ inertia }: HttpContext) {
		return inertia.render('auth/signup', {});
	}

	async execute({ request, auth, response, session }: HttpContext) {
		const { passwordConfirmation: _passwordConfirmation, ...payload } = await request.validateUsing(signupValidator);

		const registered = await this.registerUser.execute(payload);

		if (!registered.ok) {
			session.flash('error', 'That email address is already registered.');
			return response.redirect().toRoute('register.render');
		}

		await auth.use('web').login(registered.value);
		return response.redirect().toRoute('home');
	}
}
