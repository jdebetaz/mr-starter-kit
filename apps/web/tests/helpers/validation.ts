import type { VineValidator } from '@vinejs/vine';

interface ValidationMessage {
	message: string;
	rule: string;
	field: string;
	/** Rule-defined: each rule decides what it attaches, so there is no shared value type. */
	// oxlint-disable-next-line tenkai/no-unsafe-dictionary-type
	meta?: Record<string, unknown>;
}

/**
 * Runs a validator and returns the errors it reported, so a test can assert on
 * which rules fired rather than on a formatted message. An input that passes
 * returns an empty array.
 */
export async function validationErrors(
	/** Deliberately permissive: this helper takes whatever a spec builds. */
	validator: VineValidator<any, any>,
	/** The payload under test: a spec passes malformed input on purpose, so it has no schema here. */
	// oxlint-disable-next-line tenkai/no-unsafe-dictionary-type
	data: Record<string, unknown>,
): Promise<ValidationMessage[]> {
	try {
		await validator.validate(data);

		return [];
	} catch (error) {
		/** SAFETY: shape is not trusted; the `Array.isArray` check below rethrows anything else. */
		const messages = (error as { messages?: ValidationMessage[] }).messages;

		/** Anything without a `messages` array is a real failure, not a validation result. */
		if (!Array.isArray(messages)) {
			throw error;
		}

		return messages;
	}
}
