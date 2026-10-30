import { defineConfig, destinations } from '@adonisjs/otel';
import { QueueManager } from '@adonisjs/queue';
import { QueueInstrumentation } from '@adonisjs/queue/otel';
import env from '#start/env';

const otlpEndpoint = env.get('OTEL_EXPORTER_OTLP_ENDPOINT');

const queueInstrumentation = new QueueInstrumentation({
	/**
	 * 'link' (default) starts a new trace for each job execution
	 * and links it to the dispatch span. 'parent' makes the
	 * execution a child of the dispatch span, in the same trace.
	 */
	executionSpanLinkMode: 'link',
});
queueInstrumentation.manuallyRegister({ QueueManager });

const otelConfig = defineConfig({
	/**
	 * The SDK only boots once an OTLP endpoint is configured. A fresh clone
	 * therefore runs without a collector and without failing export retries.
	 */
	enabled: Boolean(otlpEndpoint) && env.get('NODE_ENV') !== 'test',

	/**
	 * Identity of this service in the traces.
	 */
	serviceName: env.get('APP_NAME'),
	serviceVersion: env.get('APP_VERSION'),
	environment: env.get('APP_ENV'),

	instrumentations: {
		/**
		 * Off in the package defaults. The app talks to Postgres through `pg`,
		 * and the SQL spans are the ones worth having under an HTTP span.
		 */
		'@opentelemetry/instrumentation-pg': { enabled: true },
		'@adonisjs/queue': queueInstrumentation,
	},

	/**
	 * Single OTLP destination receiving traces, metrics and logs. Add more keys
	 * to fan telemetry out to several backends.
	 */
	destinations: {
		default: destinations.otlp({
			endpoint: otlpEndpoint,
			signals: 'all',
		}),
	},
});

export default otelConfig;
