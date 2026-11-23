import queue from '@adonisjs/queue/services/main';
import type { Group } from '@japa/runner/core';

/** Derived rather than imported: @boringnode/queue is a transitive dependency. */
type FakeAdapter = ReturnType<typeof queue.fake>;

/** Live handle on the per-test fake. Read `current` inside a test, not at group setup. */
export interface CapturedJobs {
	readonly current: FakeAdapter;
}

/**
 * Replaces every queue adapter with the fake for each test in the group and
 * restores afterwards, so a spec asserts on what was dispatched rather than on
 * what a worker did with it.
 */
export function captureJobs(group: Group): CapturedJobs {
	let fake: FakeAdapter | null = null;

	group.each.setup(() => {
		fake = queue.fake();

		return () => {
			queue.restore();
			fake = null;
		};
	});

	return {
		get current(): FakeAdapter {
			if (!fake) {
				throw new Error('captureJobs: read `.current` inside a test, after the setup hook has run.');
			}

			return fake;
		},
	};
}
