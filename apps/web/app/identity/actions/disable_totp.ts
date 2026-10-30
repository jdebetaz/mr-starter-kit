import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import { isTwoFactorRequiredFor } from '#identity/policies/two_factor_requirement';
import type User from '#identity/models/user';

export interface DisableTotpParams {
	user: User;
	password: string;
}

export type DisableTotpError = { type: 'invalid_password' } | { type: 'two_factor_required' };

@inject()
export default class DisableTotp {
	async execute({ user, password }: DisableTotpParams): Promise<Result<User, DisableTotpError>> {
		/**
		 * Checked before the password so a user who must keep 2FA is refused
		 * without ever learning whether their password was right.
		 */
		if (isTwoFactorRequiredFor(user)) {
			return err({ type: 'two_factor_required' });
		}

		const passwordMatches = await user.verifyPassword(password);

		if (!passwordMatches) {
			return err({ type: 'invalid_password' });
		}

		await user.disableTwoFactor();

		return ok(user);
	}
}
