import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import type User from '#identity/models/user';

export interface RegenerateRecoveryCodesParams {
	user: User;
	password: string;
}

export type RegenerateRecoveryCodesError = { type: 'invalid_password' } | { type: 'two_factor_not_enabled' };

/**
 * Replaces the user's recovery codes. Minting bypass credentials is as
 * sensitive as turning 2FA off, so it requires the current password.
 */
@inject()
export default class RegenerateRecoveryCodes {
	async execute({
		user,
		password,
	}: RegenerateRecoveryCodesParams): Promise<Result<string[], RegenerateRecoveryCodesError>> {
		if (!user.isTwoFactorEnabled) {
			return err({ type: 'two_factor_not_enabled' });
		}

		if (!(await user.verifyPassword(password))) {
			return err({ type: 'invalid_password' });
		}

		return ok(await user.generateRecoveryCodes());
	}
}
