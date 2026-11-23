import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import UserRepository from '#identity/repositories/user_repository';
import type { UUID } from '#core/types';
import type User from '#identity/models/user';

export interface VerifyRecoveryChallengeParams {
	userId: UUID | null;
	code: string;
}

export type VerifyRecoveryChallengeError =
	| { type: 'no_pending_login' }
	| { type: 'not_challengeable' }
	| { type: 'invalid_recovery_code' };

/**
 * Deliberately not wrapped in a transaction: consuming a recovery code is a
 * compare-and-set write on the default client.
 */
@inject()
export default class VerifyRecoveryChallenge {
	constructor(private readonly userRepository: UserRepository) {}

	async execute({
		userId,
		code,
	}: VerifyRecoveryChallengeParams): Promise<
		Result<{ user: User; remainingCodes: number }, VerifyRecoveryChallengeError>
	> {
		if (!userId) {
			return err({ type: 'no_pending_login' });
		}

		const user = await this.userRepository.findById(userId);

		if (!user || !user.isTwoFactorEnabled) {
			return err({ type: 'not_challengeable' });
		}

		const codeMatches = await user.verifyRecoveryCode(code);

		if (!codeMatches) {
			return err({ type: 'invalid_recovery_code' });
		}

		return ok({ user, remainingCodes: user.remainingRecoveryCodesCount });
	}
}
