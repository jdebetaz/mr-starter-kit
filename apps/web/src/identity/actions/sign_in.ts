import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import UserRepository from '#identity/repositories/user_repository';
import type User from '#identity/models/user';

export interface SignInParams {
	email: string;
	password: string;
}

export interface SignInSuccess {
	user: User;
	/** True when the user owes a second factor before they may be logged in. */
	challengeRequired: boolean;
}

export interface SignInError {
	type: 'invalid_credentials';
}

@inject()
export default class SignIn {
	constructor(private readonly userRepository: UserRepository) {}

	async execute({ email, password }: SignInParams): Promise<Result<SignInSuccess, SignInError>> {
		const user = await this.userRepository.findByEmail(email);

		/**
		 * An unknown address and a wrong password report the same variant, so the
		 * outcome never reveals which addresses are registered.
		 */
		if (!user) {
			return err({ type: 'invalid_credentials' });
		}

		const passwordMatches = await user.verifyPassword(password);

		if (!passwordMatches) {
			return err({ type: 'invalid_credentials' });
		}

		return ok({ user, challengeRequired: user.isTwoFactorEnabled });
	}
}
