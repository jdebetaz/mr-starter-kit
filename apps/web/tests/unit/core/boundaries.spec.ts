import { readdir, readFile } from 'node:fs/promises';
import { test } from '@japa/runner';

const CORE = new URL('../../../src/core/', import.meta.url);
/**
 * Subpath aliases that are not capabilities: core itself, the framework's own
 * directories, and the delivery side (which oxlint already forbids). Anything
 * else under `#` is a capability, so a new one is caught without edits here.
 */
const NOT_A_CAPABILITY = new Set(['core', 'config', 'start', 'database', 'providers', 'generated', 'tests', 'app']);
const SUBPATH_IMPORT = /from '#([a-z_]+)\//g;

async function sourceFiles(dir: URL): Promise<URL[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const files: URL[] = [];

	for (const entry of entries) {
		if (entry.isDirectory()) {
			const nested = await sourceFiles(new URL(`${entry.name}/`, dir));

			files.push(...nested);
		} else if (entry.name.endsWith('.ts')) {
			files.push(new URL(entry.name, dir));
		}
	}

	return files;
}

/**
 * `src/core` holds foundations every capability may use, so it must not depend
 * on any one of them. oxlint's `no-restricted-imports` cannot express "any
 * capability except my own", so this test is the enforcement.
 */
test.group('Capability boundaries', () => {
	test('src/core depends on no capability', async ({ assert }) => {
		const offenders: string[] = [];

		for (const file of await sourceFiles(CORE)) {
			const source = await readFile(file, 'utf8');

			for (const [, alias] of source.matchAll(SUBPATH_IMPORT)) {
				if (!NOT_A_CAPABILITY.has(alias)) {
					offenders.push(`${file.pathname.split('/src/')[1]} imports #${alias}/`);
				}
			}
		}

		assert.deepEqual(offenders, []);
	});
});
