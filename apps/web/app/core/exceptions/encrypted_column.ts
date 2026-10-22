import { createError } from '@adonisjs/core/exceptions';

/**
 * Raised when an `@encrypted` column holds a ciphertext the current `APP_KEY`
 * cannot read, for example after key rotation, a tampered row, or a value
 * encrypted under a different purpose. Returning `null` instead would make a
 * key rotation look like missing data and silently drop whatever invariant the
 * column protects, so it must fail loudly.
 */
export const EncryptedColumnUnreadable = createError<[string]>(
	'Encrypted column "%s" could not be decrypted',
	'E_ENCRYPTED_COLUMN_UNREADABLE',
	500,
);
