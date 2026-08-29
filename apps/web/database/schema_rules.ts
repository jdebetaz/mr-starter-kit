import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator';

export default {
	tables: {
		users: {
			columns: {
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
