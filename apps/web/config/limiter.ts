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
	 *
	 * Client addresses: `request.ip()` is the socket address because no
	 * `trustProxy` is configured. Behind a reverse proxy or load balancer every
	 * client therefore shares one IP, and the challenge limiter's per-IP budget
	 * collapses into a per-form, per-user one. `trustProxy` is deliberately not
	 * set here: which proxies to trust is a deployment decision, and a loose
	 * setting lets a client spoof `X-Forwarded-For` to mint fresh per-IP budgets.
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
