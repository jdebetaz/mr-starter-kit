import { execFile as execFileCallback, spawn } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

export const colors = {
	bold: (value) => `\u001b[1m${value}\u001b[22m`,
	cyan: (value) => `\u001b[36m${value}\u001b[39m`,
	dim: (value) => `\u001b[2m${value}\u001b[22m`,
	green: (value) => `\u001b[32m${value}\u001b[39m`,
	red: (value) => `\u001b[31m${value}\u001b[39m`,
	yellow: (value) => `\u001b[33m${value}\u001b[39m`,
};

export const log = {
	info(message = '') {
		console.log(message);
	},
	step(message) {
		console.log(colors.cyan(`[step] ${message}`));
	},
	success(message) {
		console.log(colors.green(`[done] ${message}`));
	},
	warn(message) {
		console.warn(colors.yellow(`[warn] ${message}`));
	},
	error(message) {
		console.error(colors.red(`[fail] ${message}`));
	},
};

function formatDuration(startedAt) {
	const elapsed = Date.now() - startedAt;
	return elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;
}

export async function runStep(label, action) {
	log.step(label);
	const startedAt = Date.now();

	try {
		const result = await action();
		log.success(`Completed in ${formatDuration(startedAt)}`);
		return result;
	} catch (error) {
		log.error(`Failed after ${formatDuration(startedAt)}`);
		throw error;
	}
}

export async function run(command, args, options = {}) {
	const { stdout } = await execFile(command, args, {
		...options,
	});

	return stdout.trim();
}

export async function runInherited(command, args) {
	await new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit' });

		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}

			const reason = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`;
			reject(new Error(`${command} ${args.join(' ')} failed with ${reason}`));
		});
	});
}

export async function confirm(message) {
	const readline = createInterface({ input, output });
	const answer = await readline.question(`${message} ${colors.dim('[y/N]')} `);
	readline.close();
	return /^[Yy]$/.test(answer);
}
