import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import type User from '#identity/models/user';

export interface GenerateRecoveryCodesError {
	type: 'two_factor_not_enabled';
}

@inject()
export default class GenerateRecoveryCodes {
	async execute(user: User): Promise<Result<string[], GenerateRecoveryCodesError>> {
		if (!user.isTwoFactorEnabled) {
			return err({ type: 'two_factor_not_enabled' });
		}

		return ok(await user.generateRecoveryCodes());
	}
}
