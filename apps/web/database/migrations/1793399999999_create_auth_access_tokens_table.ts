import { BaseSchema } from '@adonisjs/lucid/schema';

/**
 * Backing store for `DbAccessTokensProvider`. It is shared by every tokenable
 * model, distinguished by `type` — team invitations today, API tokens or
 * anything else later.
 */
export default class extends BaseSchema {
	protected tableName = 'auth_access_tokens';

	async up() {
		this.schema.createTable(this.tableName, (table) => {
			table.increments('id').primary();
			table.uuid('tokenable_id').notNullable();
			table.string('type').notNullable();
			table.string('name').nullable();
			table.string('hash').notNullable();
			table.text('abilities').notNullable();

			table.timestamp('created_at', { precision: 6, useTz: true }).notNullable();
			table.timestamp('updated_at', { precision: 6, useTz: true }).notNullable();
			table.timestamp('last_used_at', { precision: 6, useTz: true }).nullable();
			table.timestamp('expires_at', { precision: 6, useTz: true }).nullable();

			table.index(['tokenable_id', 'type']);
		});
	}

	async down() {
		this.schema.dropTable(this.tableName);
	}
}
