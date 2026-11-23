import { Secret } from '@adonisjs/core/helpers';
import encryption from '@adonisjs/core/services/encryption';
import { BaseModel } from '@adonisjs/lucid/orm';
import { test } from '@japa/runner';
import { encrypted, secret } from '#core/orm/columns';
import type { ColumnCipher } from '#core/orm/columns';
import type { LucidRow, ModelColumnOptions } from '@adonisjs/lucid/types/model';

/**
 * A reversible stand-in for the encryption service, so assertions can read
 * what was written without the ciphertext being opaque.
 *
 * SAFETY: `encrypt` only has to round-trip with `decrypt` below, which is the
 * only reader of what it produces. Both take the encryption service's own
 * signature, where the payload is whatever the column holds.
 */
const cipher: ColumnCipher = {
	// oxlint-disable-next-line tenkai/no-unknown-parameters
	encrypt: ((payload: unknown) => `enc(${JSON.stringify(payload)})`) as ColumnCipher['encrypt'],
	decrypt: <T>(value: string) => {
		const match = /^enc\((.*)\)$/.exec(value);

		/** SAFETY: the text inside `enc(...)` is JSON this fake wrote in `encrypt` above. */
		return match ? (JSON.parse(match[1]!) as T) : null;
	},
};

class Vault extends BaseModel {
	@secret()
	declare token: Secret<string> | null;

	@secret({ serializeAs: 'label' })
	declare label: Secret<string> | null;

	@encrypted({ encryption: cipher })
	declare apiKey: Secret<string> | null;

	@encrypted({ purpose: 'vaults.scopedKey' })
	declare scopedKey: Secret<string> | null;
}

function columnOf(name: string): ModelColumnOptions {
	const definition = Vault.$getColumn(name);

	if (!definition) {
		throw new Error(`Vault has no "${name}" column`);
	}

	return definition;
}

/**
 * `toDatabase` and `fromDatabase` call Lucid's own column hooks, so they take
 * and return exactly what those hooks do: the attribute before anything has
 * decided what it is.
 *
 * SAFETY: the hooks only ever read attributes off the row, and a `Vault` is the
 * model the column was defined on. The two types are not structurally
 * comparable, because `LucidRow` declares members the class gets at runtime.
 */
// oxlint-disable-next-line tenkai/no-unknown-parameters, tenkai/no-unknown-returns
function toDatabase(name: string, value: unknown): unknown {
	/** SAFETY: see above; the hook only reads attributes off the row it is given. */
	// oxlint-disable-next-line tenkai/no-chained-type-assertions
	return columnOf(name).prepare!(value, name, new Vault() as unknown as LucidRow);
}

// oxlint-disable-next-line tenkai/no-unknown-parameters, tenkai/no-unknown-returns
function fromDatabase(name: string, value: unknown): unknown {
	/** SAFETY: see above; the hook only reads attributes off the row it is given. */
	// oxlint-disable-next-line tenkai/no-chained-type-assertions
	return columnOf(name).consume!(value, name, new Vault() as unknown as LucidRow);
}

/**
 * A model that looks like it came back from a query, so `$dirty` compares
 * against originals instead of reporting every attribute.
 *
 * `attributes` is a raw adapter result, which is what `$consumeAdapterResult`
 * takes: column values straight from the driver, before Lucid maps them.
 */
// oxlint-disable-next-line tenkai/no-unsafe-dictionary-type
function persistedVault(attributes: Record<string, unknown>): Vault {
	const vault = new Vault();
	vault.$consumeAdapterResult(attributes);
	vault.$hydrateOriginals();
	vault.$isPersisted = true;

	return vault;
}

test.group('Core column decorators | secret', () => {
	test('hands out the value wrapped in a Secret', ({ assert }) => {
		const vault = new Vault();
		vault.token = new Secret('shhh');

		assert.instanceOf(vault.token, Secret);
		assert.equal(vault.token!.release(), 'shhh');
	});

	test('redacts the value in logs and JSON', ({ assert }) => {
		const vault = new Vault();
		vault.token = new Secret('shhh');

		assert.notInclude(`${vault.token}`, 'shhh');
		assert.notInclude(JSON.stringify({ token: vault.token }), 'shhh');
	});

	test('stores the plain value in the attribute', ({ assert }) => {
		const vault = new Vault();
		vault.token = new Secret('shhh');

		assert.equal(vault.$attributes.token, 'shhh');
		assert.isUndefined(columnOf('token').prepare);
	});

	test('leaves null untouched', ({ assert }) => {
		const vault = new Vault();
		vault.token = null;

		assert.isNull(vault.token);
	});

	test('is withheld from serialize()', ({ assert }) => {
		const vault = new Vault();
		vault.token = new Secret('shhh');

		assert.isNull(columnOf('token').serializeAs);
		assert.notProperty(vault.serialize(), 'token');
	});

	test('still redacts when serializeAs is given', ({ assert }) => {
		const vault = new Vault();
		vault.label = new Secret('shhh');

		assert.notInclude(JSON.stringify(vault.serialize()), 'shhh');
	});

	test('reports a rotated secret as dirty', ({ assert }) => {
		const vault = persistedVault({ token: 'old' });
		vault.token = new Secret('new');

		assert.deepEqual(vault.$dirty, { token: 'new' });
	});

	test('reports an unchanged secret as clean', ({ assert }) => {
		const vault = persistedVault({ token: 'old' });
		vault.token = new Secret('old');

		assert.isFalse(vault.$isDirty);
	});
});

test.group('Core column decorators | encrypted', () => {
	test('encrypts on write and decrypts on read', ({ assert }) => {
		const stored = toDatabase('apiKey', 'sk-live-123');

		assert.equal(stored, 'enc("sk-live-123")');
		assert.equal(fromDatabase('apiKey', stored), 'sk-live-123');
	});

	test('round-trips any JSON-serializable value', ({ assert }) => {
		const codes = ['abcde-fghij', 'klmno-pqrst'];

		assert.deepEqual(fromDatabase('apiKey', toDatabase('apiKey', codes)), codes);
	});

	test('leaves null untouched in both directions', ({ assert }) => {
		assert.isNull(toDatabase('apiKey', null));
		assert.isNull(fromDatabase('apiKey', null));
	});

	test('hands out the decrypted value wrapped in a Secret', ({ assert }) => {
		const vault = persistedVault({ api_key: 'enc("sk-live-123")' });

		assert.instanceOf(vault.apiKey, Secret);
		assert.equal(vault.apiKey!.release(), 'sk-live-123');
		assert.notProperty(vault.serialize(), 'apiKey');
	});

	test('reports a rotated secret as dirty', ({ assert }) => {
		const vault = persistedVault({ api_key: 'enc("sk-live-123")' });
		vault.apiKey = new Secret('sk-live-456');

		assert.deepEqual(vault.$dirty, { apiKey: 'sk-live-456' });
	});

	test('fails loudly when the ciphertext cannot be read', ({ assert }) => {
		assert.throws(
			() => fromDatabase('apiKey', 'not-a-ciphertext'),
			'Encrypted column "apiKey" could not be decrypted',
		);
	});

	test('uses the application encryption service by default', ({ assert }) => {
		const stored = toDatabase('scopedKey', 'JBSWY3DPEHPK3PXP');

		assert.notInclude(String(stored), 'JBSWY3DPEHPK3PXP');
		assert.equal(encryption.decrypt(String(stored), 'vaults.scopedKey'), 'JBSWY3DPEHPK3PXP');
		assert.equal(fromDatabase('scopedKey', stored), 'JBSWY3DPEHPK3PXP');
	});

	test('rejects a ciphertext encrypted for another purpose', ({ assert }) => {
		const foreign = encryption.encrypt('JBSWY3DPEHPK3PXP', { purpose: 'vaults.otherKey' });

		assert.throws(() => fromDatabase('scopedKey', foreign), 'Encrypted column "scopedKey" could not be decrypted');
	});
});
