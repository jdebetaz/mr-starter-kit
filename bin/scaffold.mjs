#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { Command, Option } from 'commander';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(projectRoot, 'package.json');
const documents = ['README.md', 'CONTEXT.md'];
const directories = ['.github'];
const unlicensed = 'UNLICENSED';

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const readme = await readFile(join(projectRoot, 'README.md'), 'utf8');

const current = {
	projectName: readme.match(/^# (.+)$/mu)?.[1] ?? 'My Project',
	projectSlug: manifest.name,
	projectDescription: manifest.description,
	authorName: manifest.author,
	license: manifest.license,
};

const questions = [
	{ option: 'projectName', message: 'Project name', fallback: current.projectName },
	{
		option: 'projectSlug',
		message: 'Package/repo slug (kebab-case)',
		fallback: (answers) => answers.projectName.toLowerCase().replaceAll(' ', '-'),
	},
	{ option: 'projectDescription', message: 'Short description of the project', fallback: current.projectDescription },
	{ option: 'authorName', message: 'Author or organization name', fallback: current.authorName },
	{
		option: 'license',
		message: 'Project license',
		choices: [...new Set(['MIT', 'Apache-2.0', "O'Saasy", unlicensed, current.license])],
		fallback: current.license,
	},
];

function withLicenseSection(document, answers) {
	if (answers.license === unlicensed || document.includes('## License')) {
		return document;
	}

	return `${document.trimEnd()}\n\n## License\n\n${answers.license} © ${answers.authorName}. See [LICENSE](LICENSE) for details.\n`;
}

async function restoreDirectories() {
	for (const directory of directories) {
		const mangled = `-${directory.slice(1)}`;
		const mangledPath = join(projectRoot, mangled);

		if (existsSync(join(projectRoot, directory)) || !existsSync(mangledPath)) {
			continue;
		}

		await rename(mangledPath, join(projectRoot, directory));
		console.log(`  renamed ${mangled}/ to ${directory}/`);
	}
}

const program = new Command()
	.name('scaffold')
	.description('Rewrite the project identity in package.json, README.md, and CONTEXT.md')
	.showHelpAfterError();

for (const question of questions) {
	const flag = `--${question.option.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} <value>`;
	const option = new Option(flag, question.message);

	if (question.choices) {
		option.choices(question.choices);
	}

	program.addOption(option);
}

program.parse();

const options = program.opts();
const readline = createInterface({ input, output });
const lines = readline[Symbol.asyncIterator]();
const answers = {};

console.log('\nProject setup\n');

for (const question of questions) {
	if (options[question.option] !== undefined) {
		answers[question.option] = options[question.option];
		continue;
	}

	const fallback = typeof question.fallback === 'function' ? question.fallback(answers) : question.fallback;

	if (question.choices) {
		console.log(`  ${question.choices.map((choice, index) => `${index + 1}) ${choice}`).join('  ')}`);
	}

	process.stdout.write(`? ${question.message} (${fallback}) `);

	const { value, done } = await lines.next();
	const answer = (done ? '' : value.trim()) || fallback;

	answers[question.option] = question.choices?.[Number(answer) - 1] ?? answer;
}

readline.close();

const replacements = [
	[current.projectDescription, answers.projectDescription],
	[current.authorName, answers.authorName],
	[current.projectSlug, answers.projectSlug],
	[current.projectName, answers.projectName],
].filter(([search, replacement]) => search && replacement);

for (const document of documents) {
	const path = join(projectRoot, document);
	let rendered = await readFile(path, 'utf8');

	for (const [search, replacement] of replacements) {
		rendered = rendered.replaceAll(search, replacement);
	}

	await writeFile(path, withLicenseSection(rendered, answers));
	console.log(`  updated ${document}`);
}

await writeFile(
	manifestPath,
	`${JSON.stringify(
		{
			...manifest,
			name: answers.projectSlug,
			description: answers.projectDescription,
			author: answers.authorName,
			license: answers.license,
		},
		null,
		'\t',
	)}\n`,
);
console.log('  updated package.json');

await restoreDirectories();

console.log(`\n${answers.projectName} is ready.\n`);
console.log('Next steps:\n');
console.log('  mise install');
console.log('  pnpm install');
console.log('  git init && git add .\n');
