import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import type User from '#identity/models/user';
import type UserRepository from '#identity/repositories/user_repository';
import type { CreateUserPayload } from '#identity/types/user';

export interface RegisterUserError {
	type: 'email_already_taken';
}

@inject()
export default class RegisterUser {
	constructor(private readonly userRepository: UserRepository) {}

	async execute(payload: CreateUserPayload): Promise<Result<User, RegisterUserError>> {
		if (await this.userRepository.findByEmail(payload.email)) {
			return err({ type: 'email_already_taken' });
		}

		return ok(await this.userRepository.createUser(payload));
	}
}
