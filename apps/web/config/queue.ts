import { defineConfig, drivers, exponentialBackoff } from '@adonisjs/queue';
import env from '#start/env';

export default defineConfig({
	default: env.get('QUEUE_DRIVER', 'redis'),

	adapters: {
		redis: drivers.redis({
			connectionName: 'main',
		}),
		sync: drivers.sync(),
	},

	/**
	 * `maxRetries` defaults to 0, so without this a job that hits a transient
	 * failure is lost on its first error. Exponential backoff keeps a retry storm
	 * off a dependency that is already struggling.
	 */
	retry: {
		maxRetries: 3,
		backoff: exponentialBackoff(),
	},

	worker: {
		concurrency: 5,
		idleDelay: '2s',

		/** Finish the job in flight before exiting, so a deploy does not drop work. */
		gracefulShutdown: true,

		/**
		 * A job whose worker died is reclaimed after this long, at most this many
		 * times, and then fails through the job's `failed()` hook. These are the
		 * documented defaults, written down so they are discoverable.
		 */
		stalledThreshold: '30s',
		stalledInterval: '30s',
		maxStalledCount: 1,
	},

	/**
	 * Jobs are application code, so they live beside Actions and repositories in
	 * `src/<capability>/jobs/`, not in the delivery layer. See
	 * docs/architecture/application.md.
	 */
	locations: ['./src/*/jobs/**/*.{ts,js}'],
});
