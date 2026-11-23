import { Secret } from '@adonisjs/core/helpers';
import encryptionService from '@adonisjs/core/services/encryption';
import { column } from '@adonisjs/lucid/orm';
import { EncryptedColumnUnreadable } from '#core/exceptions/encrypted_column';
import type { Encryption } from '@adonisjs/core/encryption';
import type { ColumnOptions, DecoratorFn, LucidRow } from '@adonisjs/lucid/types/model';

/**
 * The slice of the encryption service a column needs. Narrow so tests and
 * callers can pass a stub without standing up the real manager.
 */
export type ColumnCipher = Pick<Encryption, 'encrypt' | 'decrypt'>;

/**
 * Reads and writes the attribute through `Secret`, so the model hands out a
 * value that redacts itself in logs, `JSON.stringify`, and string
 * interpolation; only `release()` returns the plaintext.
 *
 * The attribute itself stays plain underneath. Lucid diffs `$attributes`
 * structurally, and a `Secret` keeps its value in a private field: two
 * different secrets would compare equal and a rotated value would never be
 * written. Keeping the attribute plain also leaves `prepare`/`consume`,
 * `where` clauses, and dirty checking working exactly as Lucid expects.
 *
 * Must run before `column()`, which reads the descriptor to learn that the
 * attribute has an accessor.
 *
 * `target` and the accessor types mirror Lucid's `DecoratorFn` and its untyped
 * `$attributes` bag, which is what `Object.defineProperty` is handed here.
 */
// oxlint-disable-next-line tenkai/no-object-parameters
const defineSecretAccessor = (target: object, property: string): void => {
	Object.defineProperty(target, property, {
		configurable: true,
		enumerable: true,

		// oxlint-disable-next-line tenkai/no-unknown-returns
		get(this: LucidRow): unknown {
			const value = this.$attributes[property];

			return value === null || value === undefined ? value : new Secret(value);
		},

		// oxlint-disable-next-line tenkai/no-unknown-parameters
		set(this: LucidRow, value: unknown) {
			this.$setAttribute(property, value instanceof Secret ? value.release() : value);
		},
	});
};

/**
 * A column held as a `Secret` and never serialized. Use it for anything a
 * client must not receive and a log must not show, even by accident:
 * password hashes, recovery-code hashes, invitation tokens.
 *
 * ```ts
 * @secret()
 * declare apiToken: Secret<string> | null
 *
 * user.apiToken = new Secret(token);
 * user.apiToken?.release();
 * ```
 */
export const secret = (options: Partial<ColumnOptions> = {}): DecoratorFn => {
	return (target, property) => {
		defineSecretAccessor(target, property);
		column({ serializeAs: null, ...options })(target, property);
	};
};

export type EncryptedColumnOptions = Partial<ColumnOptions> & {
	/**
	 * Binds the ciphertext to a context, so a value lifted out of one column
	 * cannot be replayed into another. Pass something stable and specific, such
	 * as `'users.totp_secret'`. Changing it makes existing rows unreadable.
	 */
	purpose?: string;

	/**
	 * Overrides the application encryption service. For tests and for columns
	 * that must use a separate key.
	 */
	encryption?: ColumnCipher;
};

/**
 * A `secret` column that is also encrypted at rest with the application key.
 * Reads decrypt and writes encrypt, so the model only ever sees the plain
 * value and dirty checking still compares plaintext.
 *
 * The value goes through the message builder, so any JSON-serializable value
 * round-trips, not only strings.
 *
 * ```ts
 * @encrypted({ purpose: 'users.totp_secret' })
 * declare totpSecret: Secret<string> | null
 * ```
 */
export const encrypted = ({ purpose, encryption, ...options }: EncryptedColumnOptions = {}): DecoratorFn => {
	// Resolved per call, not at decoration time: decorators run while the module
	// graph is still loading, before the container can hand out the service.
	const cipher = (): ColumnCipher => encryption ?? encryptionService;

	return (target, property) => {
		defineSecretAccessor(target, property);

		column({
			serializeAs: null,
			...options,

			// `prepare` and `consume` below take Lucid's own signature: the column
			// hook is handed whatever the model or the driver holds, before this
			// code decides what it is.
			// oxlint-disable-next-line tenkai/no-unknown-parameters
			prepare: (value: unknown, attribute: string, model) => {
				const plain = options.prepare ? options.prepare(value, attribute, model) : value;

				// A null column stays null: encrypting it would make "not set" and
				// "set to nothing" indistinguishable, and break `where x is null`.
				if (plain === null || plain === undefined) {
					return plain;
				}

				return cipher().encrypt(plain, { purpose });
			},

			// oxlint-disable-next-line tenkai/no-unknown-parameters
			consume: (value: unknown, attribute: string, model) => {
				if (value === null || value === undefined) {
					return options.consume ? options.consume(value, attribute, model) : value;
				}

				const plain = cipher().decrypt<unknown>(String(value), purpose);

				if (plain === null) {
					throw new EncryptedColumnUnreadable(attribute);
				}

				return options.consume ? options.consume(plain, attribute, model) : plain;
			},
		})(target, property);
	};
};
