import { DomainError } from '#core/exceptions/domain_error';

/**
 * Raised when an email's MJML template does not compile. `mjml2html` reports
 * problems in its result rather than throwing and still returns partial HTML,
 * so this turns a silently broken message into a loud failure.
 */
export class MailTemplateInvalid extends DomainError {
	readonly code = 'E_MAIL_TEMPLATE_INVALID';

	constructor(view: string, errors: string[]) {
		super(`Email template "${view}" could not be compiled: ${errors.join('; ')}`);
	}
}
