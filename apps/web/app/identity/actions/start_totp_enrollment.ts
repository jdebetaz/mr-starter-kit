import { inject } from '@adonisjs/core';
import { ok, type Result } from '#core/result';
import type User from '#identity/models/user';

export interface StartTotpEnrollmentResult {
	qrCode: string;
	manualSecret: string;
}

@inject()
export default class StartTotpEnrollment {
	async execute(user: User): Promise<Result<StartTotpEnrollmentResult, never>> {
		await user.generateSecret();

		return ok({
			qrCode: await user.generateQRCode(),
			manualSecret: user.getEnrollmentSecret(),
		});
	}
}
