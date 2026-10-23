# Observability

The web app ships with OpenTelemetry through [`@adonisjs/otel`](https://docs.adonisjs.com/guides/digging-deeper/opentelemetry). Traces, metrics, and logs leave the process over OTLP/HTTP, so any collector or vendor that speaks OTLP can receive them. No collector runs in `docker-compose.yml`: the app is wired, not bound to a backend.

## Wiring

Four pieces make it work, and the order matters:

- `apps/web/otel.ts` calls `init()`. It installs the ESM loader hook that auto-instrumentation needs, then starts the SDK.
- `apps/web/bin/server.ts` imports `../otel.js` as its **first** statement. Every other import in that file is dynamic, so the hook is in place before `pg`, `http`, or `pino` are loaded. Moving that import, or turning a dynamic import above it into a static one, silently empties the traces.
- `apps/web/config/otel.ts` holds the configuration.
- `@adonisjs/otel/otel_provider` records exceptions on the active span, and `@adonisjs/otel/otel_middleware` runs first in the router stack to name spans after the route pattern and attach the authenticated user.

Only the HTTP server is instrumented. `bin/console.ts` and `bin/test.ts` do not import `otel.ts`.

## Turning it on

The SDK stays off until an OTLP endpoint is configured, so a fresh clone runs without a collector and without export retries in the logs. Point `OTEL_EXPORTER_OTLP_ENDPOINT` at the base URL of your collector and the signal paths are appended for you:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

A local Grafana LGTM stack is the quickest way to see something:

```bash
docker run -p 3000:3000 -p 4318:4318 grafana/otel-lgtm
```

Hosted backends usually want credentials. The OTLP exporters read them straight from the environment, no code change needed:

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer%20token
```

Sampling works the same way — the SDK reads the standard variables:

```dotenv
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

## Turning it off

Leaving `OTEL_EXPORTER_OTLP_ENDPOINT` empty keeps the SDK from starting, but `init()` still installs the loader hook. To skip initialization entirely, set `OTEL_SDK_DISABLED=true` in the process environment before startup:

```bash
OTEL_SDK_DISABLED=true node bin/server.js
```

It has to be a real environment variable. A value read later from `.env` arrives after `init()` has run. The test environment is already excluded in `config/otel.ts`.

## What is instrumented

Auto-instrumentation covers HTTP, Postgres through `pg`, and Pino, which stamps `trace_id` and `span_id` onto every log record. `net`, `dns`, `socket.io`, and the MySQL drivers stay off.

Postgres deserves a note: `@adonisjs/otel` disables it by default, and `config/otel.ts` turns it back on, because the SQL a request ran is usually the first thing worth seeing under an HTTP span. Spans carry `db.statement` — the query text, not the bound parameters.

`destinations` is a map, so telemetry can fan out to several backends, each one taking all signals or a subset:

```ts
destinations: {
  default: destinations.otlp({ endpoint: otlpEndpoint, signals: 'all' }),
  audit: destinations.otlp({ endpoint: auditEndpoint, signals: ['logs'] }),
}
```

## Instrumenting your own code

Auto-instrumentation stops at the framework boundary. Business operations worth a span of their own go through `record`, which closes the span, records thrown exceptions, and sets the error status:

```ts
import { record, setAttributes } from '@adonisjs/otel/helpers';

await record('invoice.issue', async (span) => {
	span.setAttributes({ 'invoice.id': invoice.id });
	return this.issue(invoice);
});
```

`setAttributes`, `recordEvent`, and `setUser` enrich whichever span is active, from anywhere in the call stack. For a background worker or an outgoing call to another service, `injectTraceContext` and `extractTraceContext` carry the trace across the boundary.

Actions and Queries are the natural place for these spans — they are the named business operations. Keep controllers out of it: the middleware already names the request span after its route.
