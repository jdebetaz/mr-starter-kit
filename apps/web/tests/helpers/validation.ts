import type { VineValidator } from '@vinejs/vine';

interface ValidationMessage {
	message: string;
	rule: string;
	field: string;
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
	data: Record<string, unknown>,
): Promise<ValidationMessage[]> {
	try {
		await validator.validate(data);
		return [];
	} catch (error) {
		const messages = (error as { messages?: ValidationMessage[] }).messages;

		/** Anything without a `messages` array is a real failure, not a validation result. */
		if (!Array.isArray(messages)) {
			throw error;
		}

		return messages;
	}
}
