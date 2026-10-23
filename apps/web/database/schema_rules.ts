import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator';

export default {
	tables: {
		users: {
			columns: {
				// Second-factor material never leaves the server through serialize(), and
				// the secret columns are encrypted at rest, bound to their own purpose.
				// Keys are database column names.
				totp_secret: {
					tsType: 'Secret<string>',
					imports: [
						{ source: '#core/orm/columns', namedImports: ['encrypted'] },
						{ source: '@adonisjs/core/helpers', typeImports: ['Secret'] },
					],
					decorators: [{ name: '@encrypted', args: { purpose: 'users.totp_secret' } }],
				},
				totp_pending_secret: {
					tsType: 'Secret<string>',
					imports: [
						{ source: '#core/orm/columns', namedImports: ['encrypted'] },
						{ source: '@adonisjs/core/helpers', typeImports: ['Secret'] },
					],
					decorators: [{ name: '@encrypted', args: { purpose: 'users.totp_pending_secret' } }],
				},
				// Holds scrypt hashes, so encrypting buys nothing. It must also stay
				// readable as stored: verifyRecoveryCode consumes a code with a
				// compare-and-set against this column's stored value.
				recovery_codes: {
					tsType: 'Secret<string>',
					imports: [
						{ source: '#core/orm/columns', namedImports: ['secret'] },
						{ source: '@adonisjs/core/helpers', typeImports: ['Secret'] },
					],
					decorators: [{ name: '@secret' }],
				},
				roles: {
					tsType: 'Role[]',
					imports: [{ source: '#identity/types/role', typeImports: ['Role'] }],
					decorators: [{ name: '@column' }],
				},
			},
		},
	},
	columns: {
		id: {
			tsType: 'UUID',
			decorator: '@column({ isPrimary: true })',
			imports: [{ source: '#core/types', typeImports: ['UUID'] }],
		},
	},

	types: {
		uuid: {
			tsType: 'UUID',
			decorator: '@column()',
			imports: [{ source: '#core/types', typeImports: ['UUID'] }],
		},
	},
} satisfies SchemaRules;
