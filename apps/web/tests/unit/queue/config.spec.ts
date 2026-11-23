import queue from '@adonisjs/queue/services/main';
import { test } from '@japa/runner';
import queueConfig, { QUEUE_REDIS_CONNECTION } from '#config/queue';
import redisConfig from '#config/redis';
import env from '#start/env';

/**
 * This group installs nothing of its own: the test environment's driver is what
 * keeps the suite off Redis, and that has to hold for a spec that does nothing
 * to arrange it.
 */
test.group('Queue configuration', () => {
	test('the suite runs on the sync driver, so no test reaches Redis', ({ assert }) => {
		assert.equal(env.get('QUEUE_DRIVER'), 'sync');
		assert.isDefined(queue.use('sync'));
	});

	test('redis is the driver everywhere else', ({ assert }) => {
		assert.property(queueConfig.adapters, 'redis');
	});

	/**
	 * The web process enqueues and the worker drains. If they resolved different
	 * Redis connections, jobs would pile up where nothing is listening and
	 * neither side would report an error.
	 */
	test('the queue uses the application connection, not one of its own', ({ assert }) => {
		assert.equal(QUEUE_REDIS_CONNECTION, redisConfig.connection);
		assert.property(redisConfig.connections, QUEUE_REDIS_CONNECTION);
	});

	test('jobs are discovered under src, not app', ({ assert }) => {
		assert.deepEqual(queueConfig.locations, ['./src/*/jobs/**/*.{ts,js}']);
	});
});
