# Background jobs

Background work runs on [`@adonisjs/queue`](https://docs.adonisjs.com/guides/digging-deeper/queues)
over Redis. Billing uses it to acknowledge a Stripe webhook immediately and process it
afterwards, and to sweep expiring trials on a schedule.

The kit is built against `@adonisjs/queue` **0.7.0**, pinned exactly rather than
caret-ranged: the package is experimental and its API may change between minor releases.

## Running it

```bash
pnpm docker:up
```

That starts Redis alongside Postgres and Mailpit. Then, in a second terminal:

```bash
pnpm --filter @boilerplate/web worker
```

**`pnpm dev` does not start the worker.** Jobs dispatched by the app sit in Redis until a
worker runs — in development and in production alike, where the worker is a second process
beside the web one.

The entrypoint is `bin/worker.ts` rather than `node ace queue:work` directly, because
`bin/console.ts` does not import `../otel.js` first and an Ace-launched worker would run
with no instrumentation. In development, `node ace queue:work --hmr` reloads jobs on change.

## Writing a job

Jobs are application code, so they live in `src/<capability>/jobs/` beside that
capability's Actions and repositories — not in `app/`, and not in the `app/jobs/` directory
`node ace make:job` defaults to. `config/queue.ts` discovers them at
`./src/*/jobs/**/*.{ts,js}`.

```ts
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';

interface ProcessWebhookPayload {
	eventId: string;
}

export default class ProcessWebhook extends Job<ProcessWebhookPayload> {
	static options: JobOptions = { queue: 'default' };

	async execute(): Promise<void> {
		const { eventId } = this.payload;
		// ...
	}

	/** Called once the retries are exhausted and the job has permanently failed. */
	async failed(error: Error): Promise<void> {
		// ...
	}
}
```

Dispatch it from an Action: `await ProcessWebhook.dispatch({ eventId })`. The builder takes
`.toQueue(name)`, `.priority(1..10)`, `.in('24h')`, `.dedup({ id, ttl })` and others; see
the guide.

Use `@inject()` and a constructor calling `super()` if a job needs a dependency.

## Retries

`maxRetries` defaults to **0** in the library, which means a job that hits a transient
failure is lost on its first error. `config/queue.ts` therefore sets a policy for every job:

- three retries, with `exponentialBackoff()` so a struggling dependency is not hammered;
- `gracefulShutdown: true`, so a deploy lets the job in flight finish rather than dropping it;
- `stalledThreshold`, `stalledInterval` and `maxStalledCount` written out at their defaults,
  so they are discoverable — a job whose worker died is reclaimed once, then fails through
  `failed()`.

A job overrides any of it with `static options`.

## Scheduling

Recurring work is registered in `start/scheduler.ts`:

```ts
await SweepExpiringTrials.schedule({}).every('15m');
await ReconcileSubscriptions.schedule({}).cron('0 3 * * *').timezone('Europe/Zurich');
```

That file is preloaded in the `web` environment, so **registration happens when the HTTP
server starts and the worker executes due runs**. A schedule's id defaults to the job class
name, so re-registering on deploy updates it in place and keeps its run count and next run.
`node ace queue:scheduler:list` shows what is registered, and
`node ace queue:scheduler:remove <id>` drops one.

## Testing

The suite runs on the `sync` adapter (`QUEUE_DRIVER=sync` in `.env.test`), so no test needs
Redis or a worker, and a dispatched job runs inline where that is what you want to assert.

To assert on dispatch instead of execution, opt in per group:

```ts
const jobs = captureJobs(group); // from #tests/helpers/queue

test('it enqueues the webhook', async () => {
	await handleWebhook();
	jobs.current.assertPushed(ProcessWebhook);
});
```

`captureJobs` installs the library's fake per test and restores afterwards. The fake also
offers `assertNotPushed`, `assertPushedCount` and `assertNothingPushed`, and passes payloads
through JSON — so a `Date` comes back as a string.

Unlike mail, the queue is **not** faked globally: `sync` already keeps the suite off the
network, and a global fake would stop any spec from exercising a job's own code.
