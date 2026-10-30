import { inject } from '@adonisjs/core';
import SignIn from '#identity/actions/sign_in';
import { PendingLogin } from '#identity/services/pending_login';
import { loginValidator } from '#identity/validators/user';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class LoginController {
	constructor(private readonly signIn: SignIn) {}

	async render({ inertia }: HttpContext) {
		return inertia.render('auth/login', {});
	}

	async execute({ request, auth, response, session }: HttpContext) {
		const { email, password } = await request.validateUsing(loginValidator);

		const signedIn = await this.signIn.execute({ email, password });

		if (!signedIn.ok) {
			session.flash('error', 'Those credentials do not match our records.');

			return response.redirect().toRoute('login.render');
		}

		/**
		 * The password alone must not authenticate a user who owes a second
		 * factor: park the id and leave the session unauthenticated.
		 */
		if (signedIn.value.challengeRequired) {
			PendingLogin.put(session, signedIn.value.user.id);

			return response.redirect().toRoute('login.challenge.render');
		}

		await auth.use('web').login(signedIn.value.user);

		return response.redirect().toRoute('home');
	}
}
