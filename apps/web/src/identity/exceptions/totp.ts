import { DomainError } from '#core/exceptions/domain_error';

/**
 * Raised when a pending secret is read before enrolment has started. It
 * guards an impossible state for a route reached out of order, so it is an
 * exception rather than an expected business outcome.
 */
export class TotpEnrollmentNotStarted extends DomainError {
	readonly code = 'E_TOTP_ENROLLMENT_NOT_STARTED';

	constructor() {
		super('Two-factor enrollment has not been started');
	}
}

/**
 * Raised when the confirmed secret is read for a user who has not completed
 * enrolment. Login verification checks `isTwoFactorEnabled` first, so this
 * guards a caller that skipped that check.
 */
export class TotpNotEnabled extends DomainError {
	readonly code = 'E_TOTP_NOT_ENABLED';

	constructor() {
		super('Two-factor authentication is not enabled');
	}
}
