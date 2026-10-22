import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator';

export default {
	tables: {
		users: {
			columns: {
				// Second-factor material never leaves the server through serialize().
				// Keys are database column names.
				totp_secret: {
					tsType: 'string',
					decorators: [{ name: '@column', args: { serializeAs: null } }],
				},
				totp_pending_secret: {
					tsType: 'string',
					decorators: [{ name: '@column', args: { serializeAs: null } }],
				},
				recovery_codes: {
					tsType: 'string',
					decorators: [{ name: '@column', args: { serializeAs: null } }],
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
