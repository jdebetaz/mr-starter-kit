import { createError } from '@adonisjs/core/exceptions';

/**
 * Raised when a pending secret is read before enrolment has started. It
 * guards an impossible state for a route reached out of order, so it is an
 * exception rather than an expected business outcome.
 */
export const TotpEnrollmentNotStarted = createError(
	'Two-factor enrollment has not been started',
	'E_TOTP_ENROLLMENT_NOT_STARTED',
	409,
);

/**
 * Raised when the confirmed secret is read for a user who has not completed
 * enrolment. Login verification checks `isTwoFactorEnabled` first, so this
 * guards a caller that skipped that check.
 */
export const TotpNotEnabled = createError('Two-factor authentication is not enabled', 'E_TOTP_NOT_ENABLED', 409);
