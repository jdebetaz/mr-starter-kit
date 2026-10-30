import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
	protected tableName = 'team_invitations';

	async up() {
		this.schema.createTable(this.tableName, (table) => {
			table.uuid('id').notNullable().primary();
			table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('cascade');
			table.uuid('invited_by_id').notNullable().references('id').inTable('users').onDelete('cascade');
			table.string('email', 254).notNullable();
			table.string('role').notNullable();
			// The token lives in `auth_access_tokens`, issued by DbAccessTokensProvider:
			// it owns the hashing and the expiry, so neither is duplicated here.
			table.timestamp('accepted_at', { precision: 6, useTz: true }).nullable();

			table.timestamp('created_at', { precision: 6, useTz: true }).notNullable();
			table.timestamp('updated_at', { precision: 6, useTz: true }).nullable();
		});

		/**
		 * One pending invitation per address per team. Partial, so an accepted
		 * invitation does not block a later re-invitation after someone leaves.
		 */
		this.schema.raw(
			`CREATE UNIQUE INDEX team_invitations_one_pending_per_email ON ${this.tableName} (team_id, email) WHERE accepted_at IS NULL`,
		);
	}

	async down() {
		this.schema.dropTable(this.tableName);
	}
}
