import { Job } from '@adonisjs/queue';
import { test } from '@japa/runner';
import { captureJobs } from '#tests/helpers/queue';

let executed = 0;

class FixtureJob extends Job<{ orderId: number }> {
	async execute(): Promise<void> {
		executed += 1;
	}
}

test.group('Queue fake', (group) => {
	const jobs = captureJobs(group);

	group.each.setup(() => {
		executed = 0;
	});

	test('a dispatched job is captured, not executed', async ({ assert }) => {
		await FixtureJob.dispatch({ orderId: 1 });

		jobs.current.assertPushed(FixtureJob);
		assert.equal(executed, 0);
	});

	test('a job that was never dispatched is reported as such', ({ assert }) => {
		jobs.current.assertNothingPushed();
		assert.equal(executed, 0);
	});
});
