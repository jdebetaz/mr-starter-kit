import { test } from '@japa/runner';
import queueConfig from '#config/queue';

/**
 * `maxRetries` defaults to 0, so without a configured policy a job that hits a
 * transient failure is simply lost — for a Stripe webhook that is a dropped
 * subscription change. These assertions pin the defaults that would otherwise
 * be wrong.
 */
test.group('Queue retry policy', () => {
	test('a job is retried rather than lost on a transient failure', ({ assert }) => {
		assert.equal(queueConfig.retry?.maxRetries, 3);
	});

	test('retries back off exponentially instead of hammering', ({ assert }) => {
		assert.isFunction(queueConfig.retry?.backoff);
	});

	test('the worker drains in-flight jobs on shutdown', ({ assert }) => {
		assert.isTrue(queueConfig.worker?.gracefulShutdown);
	});
});
