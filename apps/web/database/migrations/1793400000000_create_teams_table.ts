import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
	protected tableName = 'teams';

	async up() {
		this.schema.createTable(this.tableName, (table) => {
			table.uuid('id').notNullable().primary();
			table.string('name').notNullable();
			table.uuid('owner_id').notNullable().references('id').inTable('users').onDelete('restrict');

			table.timestamp('created_at', { precision: 6, useTz: true }).notNullable();
			table.timestamp('updated_at', { precision: 6, useTz: true }).nullable();
		});
	}

	async down() {
		this.schema.dropTable(this.tableName);
	}
}
