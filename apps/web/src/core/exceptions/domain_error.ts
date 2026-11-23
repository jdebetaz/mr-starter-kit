/**
 * Base class for the exceptions `src/**` throws. These guard impossible states
 * rather than expected business outcomes, which use `Result` instead.
 *
 * A domain error carries a stable `code` and no HTTP status: mapping a code to
 * a status is delivery's job, and `app/core/exceptions/handler.ts` owns it.
 */
export abstract class DomainError extends Error {
	abstract readonly code: string;

	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}
