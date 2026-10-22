import { defineConfig, stores } from '@adonisjs/limiter';

/**
 * Rate limiting configuration.
 */
const limiterConfig = defineConfig({
	/**
	 * Default store used by the limiter.
	 *
	 * The memory store is per-process: counters are not shared between
	 * instances. A deployment running more than one instance throttles each
	 * process independently, so it must switch to the Redis or database
	 * store to enforce a real shared limit.
	 */
	default: 'memory',

	stores: {
		memory: stores.memory({}),
	},
});

export default limiterConfig;

declare module '@adonisjs/limiter/types' {
	export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
