#!/usr/bin/env node

import 'dotenv/config';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { generateReleaseContent } from './lib/release-content.mjs';
import { colors, confirm, log, run, runInherited, runStep } from './lib/release-utils.mjs';

const program = new Command()
	.name('release')
	.description('Tag, push, and publish a GitHub release from main')
	.option('--ci', 'skip the confirmation prompt')
	.showHelpAfterError()
	.parse();

const { ci: isCI } = program.opts();

async function resolveReleaseContent(tag, commits) {
	try {
		const content = await generateReleaseContent({ tag, commits });

		if (!content) {
			log.warn('AI release generation is not configured; GitHub will generate the title and notes.');
		}

		return content;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log.warn(`AI release generation failed (${message}); GitHub will generate the title and notes.`);
		return null;
	}
}

async function main() {
	log.info(`\n${colors.bold('MR Starter Kit release')}\n`);

	await runStep('Validate release branch', async () => {
		const currentBranch = await run('git', ['branch', '--show-current']);

		if (currentBranch !== 'main') {
			throw new Error(`you must be on the 'main' branch (currently on '${currentBranch || 'no branch'}')`);
		}
	});

	await runStep('Fetch main and release tags', () => {
		return runInherited('git', ['fetch', 'origin', 'main', '--tags']);
	});

	const [localSha, remoteSha] = await runStep('Verify main is synchronized', () => {
		return Promise.all([run('git', ['rev-parse', 'HEAD']), run('git', ['rev-parse', 'origin/main'])]);
	});

	if (localSha !== remoteSha) {
		throw new Error('local main is not in sync with origin/main; pull or push first');
	}

	const release = await runStep('Prepare release metadata', async () => {
		const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
		const prefix = `v${today}`;
		const existingTags = await run('git', ['tag', '--list', `${prefix}*`, '--sort=-version:refname']);
		const lastTag = existingTags.split('\n').filter(Boolean)[0];
		const nextTag = lastTag ? `${prefix}.${Number(lastTag.split('.').at(-1)) + 1}` : `${prefix}.1`;
		const lastRelease = (await run('git', ['tag', '--sort=-creatordate'])).split('\n').filter(Boolean)[0];
		const releaseRange = lastRelease ? `${lastRelease}..HEAD` : 'HEAD';
		const commits = await run('git', ['log', '--reverse', '--no-merges', '--format=%h %s', releaseRange]);
		const commitLog = await run('git', [
			'log',
			'--no-merges',
			'--format=%C(yellow)%h%C(reset) %C(bold blue)%<(12)%al%C(reset) %s%C(auto)%d%C(reset)',
			releaseRange,
		]);

		return {
			commitLog,
			commitCount: commits ? commits.split('\n').length : 0,
			commits,
			lastRelease,
			nextTag,
			releaseRange,
		};
	});

	log.info(`\n${colors.bold('Release summary')}`);
	log.info(`  Tag:     ${colors.cyan(release.nextTag)}`);
	log.info(`  Range:   ${colors.dim(release.releaseRange)}`);
	log.info(`  Commits: ${colors.cyan(String(release.commitCount))}\n`);

	if (release.commitLog) {
		log.info(colors.bold(`Commits since ${release.lastRelease || 'the beginning'}:`));
		log.info(release.commitLog);
	} else {
		log.warn('No new commits found.');
	}
	log.info();

	if (isCI) {
		log.info(colors.dim('Confirmation skipped (--ci).'));
	} else {
		const confirmed = await confirm(`Create release ${colors.cyan(release.nextTag)}?`);

		if (!confirmed) {
			log.warn(`Release ${release.nextTag} cancelled.`);
			return;
		}
	}

	const releaseContent = await runStep('Resolve release content', () => {
		return resolveReleaseContent(release.nextTag, release.commits);
	});

	log.info(`\n${colors.bold('Release content')}`);
	log.info(`  Source: ${colors.cyan(releaseContent ? 'AI' : 'GitHub')}`);

	if (releaseContent) {
		log.info(`  Title:  ${colors.bold(releaseContent.title)}`);
		log.info(`\n${releaseContent.notes}\n`);
	}

	let notesDirectory;

	if (releaseContent) {
		notesDirectory = await runStep('Prepare temporary release notes', async () => {
			const directory = await mkdtemp(join(tmpdir(), 'mr-starter-kit-release-'));
			await writeFile(join(directory, 'notes.md'), `${releaseContent.notes}\n`);
			return directory;
		});
	}

	const releaseArgs = ['release', 'create', release.nextTag, '--latest'];

	if (releaseContent && notesDirectory) {
		releaseArgs.push('--title', releaseContent.title);
		releaseArgs.push('--notes-file', join(notesDirectory, 'notes.md'));
	} else {
		releaseArgs.push('--generate-notes');

		if (release.lastRelease) {
			releaseArgs.push('--notes-start-tag', release.lastRelease);
		}
	}

	try {
		await runStep(`Create tag ${release.nextTag}`, () => {
			return runInherited('git', ['tag', '-m', release.nextTag, release.nextTag]);
		});
		await runStep(`Push tag ${release.nextTag}`, () => {
			return runInherited('git', ['push', 'origin', release.nextTag]);
		});
		await runStep(`Create GitHub release ${release.nextTag}`, () => {
			return runInherited('gh', releaseArgs);
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
	log.success(`Release ${release.nextTag} created.`);
	log.info(colors.dim('GitHub Actions will build and push the release image.'));
}

try {
	await main();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	log.error(`Release failed: ${message}`);

	if (process.env.RELEASE_DEBUG === 'true' && error instanceof Error && error.stack) {
		log.info(colors.dim(error.stack));
	}

	process.exitCode = 1;
}
