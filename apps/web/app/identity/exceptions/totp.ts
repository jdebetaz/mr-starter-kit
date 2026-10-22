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
 * Raised when a stored TOTP secret cannot be decrypted, for example after
 * `APP_KEY` rotation or a tampered column. Treating it as "not enrolled"
 * would turn key rotation into a two-factor bypass, so it must fail loudly.
 */
export const TotpSecretUnreadable = createError(
	'Stored TOTP secret could not be decrypted',
	'E_TOTP_SECRET_UNREADABLE',
	500,
);
