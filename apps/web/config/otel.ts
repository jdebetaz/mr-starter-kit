import { defineConfig, destinations } from '@adonisjs/otel';
import env from '#start/env';

const otlpEndpoint = env.get('OTEL_EXPORTER_OTLP_ENDPOINT');

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
