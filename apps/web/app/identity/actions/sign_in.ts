import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import UserRepository from '#identity/repositories/user_repository';
import type User from '#identity/models/user';

export interface SignInParams {
	email: string;
	password: string;
}

export interface SignInError {
	type: 'invalid_credentials';
}

@inject()
export default class SignIn {
	constructor(private readonly userRepository: UserRepository) {}

	async execute({ email, password }: SignInParams): Promise<Result<User, SignInError>> {
		const user = await this.userRepository.findByEmail(email);

		/**
		 * An unknown address and a wrong password report the same variant, so the
		 * outcome never reveals which addresses are registered.
		 */
		if (!user || !(await user.verifyPassword(password))) {
			return err({ type: 'invalid_credentials' });
		}

		return ok(user);
	}
}
