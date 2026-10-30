import { readFile } from 'node:fs/promises';
import { test } from '@japa/runner';
import queueConfig from '#config/queue';

/**
 * `node ace make:job` writes to `app/jobs/` by default, which the configured
 * glob never discovers. A job generated that way is silently never registered:
 * dispatching succeeds, the worker treats it as unknown, retries it, and it
 * eventually fails — with nothing obviously wrong in the log. The stub is
 * overridden locally so generation and discovery agree.
 */
test.group('make:job stub', () => {
	test('generated jobs land where the queue looks for them', async ({ assert }) => {
		const stub = await readFile(new URL('../../../stubs/make/job/main.stub', import.meta.url), 'utf8');

		assert.include(stub, "app.makePath('src', entity.path, 'jobs'");
		assert.notInclude(stub, "app.makePath('app/jobs'");
		assert.deepEqual(queueConfig.locations, ['./src/*/jobs/**/*.{ts,js}']);
	});
});
