import { defineConfig, drivers } from '@adonisjs/queue';
import env from '#start/env';

export default defineConfig({
	default: env.get('QUEUE_DRIVER', 'redis'),

	adapters: {
		redis: drivers.redis({
			connectionName: 'main',
		}),
		sync: drivers.sync(),
	},

	worker: {
		concurrency: 5,
		idleDelay: '2s',
	},

	/**
	 * Jobs are application code, so they live beside Actions and repositories in
	 * `src/<capability>/jobs/`, not in the delivery layer. See
	 * docs/architecture/application.md.
	 */
	locations: ['./src/*/jobs/**/*.{ts,js}'],
});
