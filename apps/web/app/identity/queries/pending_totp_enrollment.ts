import type User from '#identity/models/user';

export interface PendingTotpEnrollment {
	qrCode: string;
	manualSecret: string;
}

/**
 * Read model for the verify step: the QR code and manual secret of an
 * enrolment already in progress. It only reads the pending secret, so
 * revisiting the page never rotates it under a user who is mid-scan.
 * Returns null when no enrolment has been started.
 */
export default class PendingTotpEnrollmentQuery {
	async execute(user: User): Promise<PendingTotpEnrollment | null> {
		if (!user.hasPendingTwoFactor) {
			return null;
		}

		return {
			qrCode: await user.generateQRCode(),
			manualSecret: user.getEnrollmentSecret(),
		};
	}
}
