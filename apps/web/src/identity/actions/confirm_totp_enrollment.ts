import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import type User from '#identity/models/user';

export interface ConfirmTotpEnrollmentParams {
	user: User;
	code: string;
}

export type ConfirmTotpEnrollmentError = { type: 'invalid_code' } | { type: 'enrollment_not_started' };

@inject()
export default class ConfirmTotpEnrollment {
	async execute({ user, code }: ConfirmTotpEnrollmentParams): Promise<Result<User, ConfirmTotpEnrollmentError>> {
		/**
		 * Checked first because the model throws when no pending secret exists;
		 * an out-of-order request is an expected outcome, not an exception.
		 */
		if (!user.hasPendingTwoFactor) {
			return err({ type: 'enrollment_not_started' });
		}

		const enrolled = await user.enableTwoFactor(code);

		if (!enrolled) {
			return err({ type: 'invalid_code' });
		}

		return ok(user);
	}
}
