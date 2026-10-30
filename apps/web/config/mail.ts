import { defineConfig, transports } from '@adonisjs/mail';
import env from '#start/env';
import type { SMTPConfig } from '@adonisjs/mail/types';

/** Matches the Mailpit service in `docker-compose.yml`, so a clone sends somewhere real. */
const MAILPIT_HOST = 'localhost';
const MAILPIT_PORT = 1025;

const username = env.get('MAIL_USERNAME');
const password = env.get('MAIL_PASSWORD');

/**
 * Exported so the configuration can be asserted without standing up a transport.
 * Mailpit accepts unauthenticated mail, so `auth` stays undefined until both a
 * username and a password are configured — sending half a credential pair is a
 * misconfiguration, not a partial login.
 */
export const smtpOptions: SMTPConfig = {
	host: env.get('MAIL_HOST') ?? MAILPIT_HOST,
	port: env.get('MAIL_PORT') ?? MAILPIT_PORT,
	auth: username && password ? { type: 'login', user: username, pass: password } : undefined,
};

/**
 * Applied to every message that sets no sender of its own. Exported as plain
 * data because `defineConfig` returns a lazy ConfigProvider whose fields cannot
 * be read back.
 */
export const defaultSender = {
	address: env.get('MAIL_FROM_ADDRESS') ?? 'noreply@example.com',
	name: env.get('MAIL_FROM_NAME') ?? env.get('APP_NAME'),
};

const mailConfig = defineConfig({
	default: 'smtp',

	from: defaultSender,

	/** Shared with every template rendered by a message. */
	globals: {
		appName: env.get('APP_NAME'),
		appUrl: env.get('APP_URL'),
	},

	mailers: {
		smtp: transports.smtp(smtpOptions),
	},
});

export default mailConfig;

declare module '@adonisjs/mail/types' {
	export interface MailersList extends InferMailers<typeof mailConfig> {}
}
