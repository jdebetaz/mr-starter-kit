export interface Ok<TValue> {
	readonly ok: true;
	readonly value: TValue;
}

export interface Err<TError> {
	readonly ok: false;
	readonly error: TError;
}

/**
 * Outcome of an Action that callers can reasonably react to. Error variants
 * carry application facts only, never HTTP concerns.
 */
export type Result<TValue, TError> = Ok<TValue> | Err<TError>;

export function ok<TValue>(value: TValue): Ok<TValue> {
	return { ok: true, value };
}

export function err<TError>(error: TError): Err<TError> {
	return { ok: false, error };
}
