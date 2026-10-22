import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
	protected tableName = 'users';

	async up() {
		this.schema.alterTable(this.tableName, (table) => {
			// Secrets are stored encrypted: ciphertext is longer than the secret, hence text.
			table.text('totp_pending_secret').nullable();
			table.text('totp_secret').nullable();
			table.timestamp('totp_enabled_at', { precision: 6, useTz: true }).nullable();
			// integer, not bigint: a 30s step stays below 2^31 until around the year 4000,
			// and node-postgres returns bigint as a string.
			table.integer('totp_last_consumed_timestep').nullable();
			table.text('recovery_codes').nullable();
			table.boolean('totp_required').nullable();
		});
	}

	async down() {
		this.schema.alterTable(this.tableName, (table) => {
			table.dropColumns(
				'totp_pending_secret',
				'totp_secret',
				'totp_enabled_at',
				'totp_last_consumed_timestep',
				'recovery_codes',
				'totp_required',
			);
		});
	}
}
