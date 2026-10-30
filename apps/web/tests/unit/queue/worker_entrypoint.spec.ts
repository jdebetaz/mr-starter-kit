import { readFile } from 'node:fs/promises';
import { test } from '@japa/runner';

const ENTRYPOINTS = ['bin/server.ts', 'bin/worker.ts'];

async function firstImportOf(entrypoint: string): Promise<string> {
	const source = await readFile(new URL(`../../../${entrypoint}`, import.meta.url), 'utf8');
	const line = source.split('\n').find((candidate) => /^\s*(import|await import)/.test(candidate));

	return line?.trim() ?? '';
}

/**
 * OpenTelemetry auto-instrumentation patches modules as they load, so anything
 * imported before `../otel.js` is never instrumented. Nothing fails and no span
 * is obviously missing — the only way to catch it is to assert on the source.
 */
test.group('Entrypoint instrumentation', () => {
	for (const entrypoint of ENTRYPOINTS) {
		test(`${entrypoint} imports otel before anything else`, async ({ assert }) => {
			const firstImport = await firstImportOf(entrypoint);

			assert.include(firstImport, '../otel.js');
		});
	}
});
