import app from '@adonisjs/core/services/app';
import { defineConfig } from '@adonisjs/lucid';
import env from '#start/env';

const dbConfig = defineConfig({
	/**
	 * Default connection used for all queries.
	 */
	connection: 'pg',

	connections: {
		pg: {
			client: 'pg',
			connection: {
				host: env.get('DB_HOST'),
				port: env.get('DB_PORT'),
				user: env.get('DB_USER'),
				password: env.get('DB_PASSWORD'),
				database: env.get('DB_DATABASE'),
			},
			migrations: {
				naturalSort: true,
				paths: ['database/migrations'],
			},
			schemaGeneration: {
				enabled: true,
				outputPath: 'database/schema.ts',
				rulesPaths: ['#database/schema_rules'],
			},
			debug: app.inDev,
		},
	},
});

export default dbConfig;
