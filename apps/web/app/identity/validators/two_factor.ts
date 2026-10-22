import vine from '@vinejs/vine';

/**
 * A six-digit authenticator code, as submitted by the code input.
 */
export const totpCodeValidator = vine.create({
	code: vine
		.string()
		.trim()
		.regex(/^\d{6}$/),
});

/**
 * The current password, re-entered to confirm turning 2FA off.
 */
export const disableTotpValidator = vine.create({
	password: vine.string(),
});
