import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import UserRepository from '#identity/repositories/user_repository';
import type User from '#identity/models/user';
import type { CreateUserPayload } from '#identity/types/user';

export interface RegisterUserError {
	type: 'email_already_taken';
}

@inject()
export default class RegisterUser {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(payload: CreateUserPayload): Promise<Result<User, RegisterUserError>> {
		const existingUser = await this.userRepository.findByEmail(payload.email);

		if (existingUser) {
			return err({ type: 'email_already_taken' });
		}

		const user = await this.userRepository.createUser(payload);

		return ok(user);
	}
}
