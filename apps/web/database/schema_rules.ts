import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator';

export default {
	tables: {
		users: {
			columns: {
				roles: { tsType: 'string[]' },
			},
		},
	},
} satisfies SchemaRules;
