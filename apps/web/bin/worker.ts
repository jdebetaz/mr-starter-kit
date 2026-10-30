/**
 * OpenTelemetry initialization - MUST be the first import
 * @see https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
 */
import '../otel.js';

/*
|--------------------------------------------------------------------------
| Queue worker entrypoint
|--------------------------------------------------------------------------
|
| The "worker.ts" file is the entrypoint for the process that drains the job
| queue. It is a second process: the HTTP server never runs jobs, and nothing
| is processed until this is running.
|
| It exists rather than calling `node ace queue:work` directly because
| "console.ts" does not import "../otel.js" first, so an Ace-launched worker
| would run with no instrumentation at all.
|
*/

await import('reflect-metadata');
const { Ignitor, prettyPrintError } = await import('@adonisjs/core');

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url);

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
	if (filePath.startsWith('./') || filePath.startsWith('../')) {
		return import(new URL(filePath, APP_ROOT).href);
	}

	return import(filePath);
};

new Ignitor(APP_ROOT, { importer: IMPORTER })
	.tap((app) => {
		app.booting(async () => {
			await import('#start/env');
		});

		/**
		 * SIGTERM is how a platform asks the worker to stop. Terminating the app
		 * lets the queue finish the job in flight instead of dropping it.
		 */
		app.listen('SIGTERM', () => app.terminate());
		app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate());
	})
	.ace()
	.handle(['queue:work', ...process.argv.splice(2)])
	.catch((error) => {
		process.exitCode = 1;
		prettyPrintError(error);
	});
