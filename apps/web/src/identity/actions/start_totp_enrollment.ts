import { inject } from '@adonisjs/core';
import { ok, type Result } from '#core/result';
import type User from '#identity/models/user';

@inject()
export default class StartTotpEnrollment {
	/**
	 * Only stores a fresh pending secret. The QR code and manual secret shown
	 * next come from `PendingTotpEnrollmentQuery`.
	 */
	async execute(user: User): Promise<Result<void, never>> {
		await user.generateSecret();

		return ok(undefined);
	}
}
