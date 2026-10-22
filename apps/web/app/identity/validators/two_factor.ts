import vine from '@vinejs/vine';

/**
 * A six-digit authenticator code. Spaces and dashes ("123 456", "123-456") are
 * accepted here and stripped by the user model, which owns normalization.
 */
export const totpCodeValidator = vine.create({
	code: vine
		.string()
		.trim()
		.regex(/^\d{3}[\s-]?\d{3}$/),
});

/**
 * The current password, re-entered to confirm turning 2FA off.
 */
export const disableTotpValidator = vine.create({
	password: vine.string(),
});
