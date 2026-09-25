#!/usr/bin/env node

import 'dotenv/config';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { generateReleaseContent } from './lib/release-content.mjs';
import { colors, confirm, log, run, runInherited, runStep } from './lib/release-utils.mjs';

const program = new Command()
	.name('release:rewrite')
	.description('Rewrite the title and notes of a published GitHub release')
	.argument('<tag>', 'release tag to rewrite')
	.option('--dry-run', 'generate and preview content without changing the release')
	.option('--ci', 'skip the confirmation prompt')
	.showHelpAfterError()
	.parse();

const { ci: isCI, dryRun: isDryRun } = program.opts();
const [tag] = program.args;

async function main() {
	log.info(`\n${colors.bold('Risk Manager release rewrite')}\n`);

	await runStep('Fetch release tags', () => {
		return runInherited('git', ['fetch', 'origin', '--tags']);
	});

	const release = await runStep('Prepare release metadata', async () => {
		const tags = (await run('git', ['tag', '--list', 'v*', '--sort=-creatordate'])).split('\n').filter(Boolean);
		const tagIndex = tags.indexOf(tag);

		if (tagIndex === -1) {
			throw new Error(`release tag '${tag}' was not found locally`);
		}

		const previousTag = tags[tagIndex + 1] || null;
		const releaseRange = previousTag ? `${previousTag}..${tag}` : tag;
		const commits = await run('git', ['log', '--reverse', '--no-merges', '--format=%h %s', releaseRange]);

		if (!commits) {
			throw new Error(`no commits found in '${releaseRange}'`);
		}

		const commitLog = await run('git', [
			'log',
			'--no-merges',
			'--format=%C(yellow)%h%C(reset) %C(bold blue)%<(12)%al%C(reset) %s%C(auto)%d%C(reset)',
			releaseRange,
		]);

		return {
			commitCount: commits.split('\n').length,
			commitLog,
			commits,
			previousTag,
			releaseRange,
		};
	});

	await runStep(`Verify GitHub release ${tag}`, () => {
		return run('gh', ['release', 'view', tag, '--json', 'tagName']);
	});

	log.info(`\n${colors.bold('Release summary')}`);
	log.info(`  Tag:     ${colors.cyan(tag)}`);
	log.info(`  Range:   ${colors.dim(release.releaseRange)}`);
	log.info(`  Commits: ${colors.cyan(String(release.commitCount))}\n`);
	log.info(colors.bold(`Commits since ${release.previousTag || 'the beginning'}:`));
	log.info(release.commitLog);
	log.info();

	const releaseContent = await runStep('Generate replacement content', async () => {
		const content = await generateReleaseContent({ tag, commits: release.commits });

		if (!content) {
			throw new Error('AI release generation is not configured; the existing release was not changed');
		}

		return content;
	});

	log.info(`\n${colors.bold('Replacement content')}`);
	log.info(`  Source: ${colors.cyan('AI')}`);
	log.info(`  Title:  ${colors.bold(releaseContent.title)}`);
	log.info(`\n${releaseContent.notes}\n`);

	if (isDryRun) {
		log.success(`Dry run complete for ${tag}; the GitHub release was not modified.`);
		return;
	}

	if (isCI) {
		log.info(colors.dim('Confirmation skipped (--ci).'));
	} else {
		const confirmed = await confirm(`Rewrite release ${colors.cyan(tag)}?`);

		if (!confirmed) {
			log.warn(`Rewrite of ${tag} cancelled.`);
			return;
		}
	}

	let notesDirectory;
	try {
		notesDirectory = await runStep('Prepare temporary release notes', async () => {
			const directory = await mkdtemp(join(tmpdir(), 'risk-manager-release-'));
			await writeFile(join(directory, 'notes.md'), `${releaseContent.notes}\n`);
			return directory;
		});

		await runStep(`Rewrite GitHub release ${tag}`, () => {
			return runInherited('gh', [
				'release',
				'edit',
				tag,
				'--verify-tag',
				'--title',
				releaseContent.title,
				'--notes-file',
				join(notesDirectory, 'notes.md'),
			]);
		});
	} finally {
		if (notesDirectory) {
			try {
				await rm(notesDirectory, { recursive: true, force: true });
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				log.warn(`Could not remove temporary release notes (${message}).`);
			}
		}
	}

	log.info();
	log.success(`Release ${tag} updated.`);
}

try {
	await main();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	log.error(`Release rewrite failed: ${message}`);

	if (process.env.RELEASE_DEBUG === 'true' && error instanceof Error && error.stack) {
		log.info(colors.dim(error.stack));
	}

	process.exitCode = 1;
}
