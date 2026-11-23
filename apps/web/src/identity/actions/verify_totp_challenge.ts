import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import UserRepository from '#identity/repositories/user_repository';
import type { UUID } from '#core/types';
import type User from '#identity/models/user';

export interface VerifyTotpChallengeParams {
	userId: UUID | null;
	code: string;
}

export type VerifyTotpChallengeError =
	| { type: 'no_pending_login' }
	| { type: 'not_challengeable' }
	| { type: 'invalid_code' };

/**
 * Deliberately not wrapped in a transaction: the replay and recovery-code
 * guards are compare-and-set writes on the default client.
 */
@inject()
export default class VerifyTotpChallenge {
	constructor(private readonly userRepository: UserRepository) {}

	async execute({ userId, code }: VerifyTotpChallengeParams): Promise<Result<User, VerifyTotpChallengeError>> {
		if (!userId) {
			return err({ type: 'no_pending_login' });
		}

		const user = await this.userRepository.findById(userId);

		if (!user || !user.isTwoFactorEnabled) {
			return err({ type: 'not_challengeable' });
		}

		const codeMatches = await user.verifyTotpForLogin(code);

		if (!codeMatches) {
			return err({ type: 'invalid_code' });
		}

		return ok(user);
	}
}
