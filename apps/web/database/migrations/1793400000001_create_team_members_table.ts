import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
	protected tableName = 'team_members';

	async up() {
		this.schema.createTable(this.tableName, (table) => {
			table.uuid('id').notNullable().primary();
			table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('cascade');
			table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('cascade');
			table.string('role').notNullable();

			table.timestamp('created_at', { precision: 6, useTz: true }).notNullable();
			table.timestamp('updated_at', { precision: 6, useTz: true }).nullable();

			/** A user belongs to a team once. */
			table.unique(['team_id', 'user_id']);
		});

		/**
		 * Exactly one owner per team. A partial unique index is what makes the rule
		 * true under a race; the Actions check first and return a typed error, but
		 * this is the final defence.
		 */
		this.schema.raw(
			`CREATE UNIQUE INDEX team_members_one_owner_per_team ON ${this.tableName} (team_id) WHERE role = 'owner'`,
		);
	}

	async down() {
		this.schema.dropTable(this.tableName);
	}
}
