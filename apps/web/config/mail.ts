import { defineConfig, transports } from '@adonisjs/mail';
import env from '#start/env';

const mailConfig = defineConfig({
	default: env.get('MAIL_MAILER'),

	/**
	 * The mailers object can be used to configure multiple mailers
	 * each using a different transport or same transport with different
	 * options.
	 */
	from: {
		address: env.get('MAIL_FROM_ADDRESS'),
		name: env.get('MAIL_FROM_NAME'),
	},

	/**
	 * Reached only by the mailer's own view helpers. `AppMail` renders through
	 * Edge directly, so its globals are registered in `start/mail.ts` instead.
	 */
	globals: {},

	/**
	 * The mailers object can be used to configure multiple mailers
	 * each using a different transport or same transport with different
	 * options.
	 */
	mailers: {
		smtp: transports.smtp({
			host: env.get('SMTP_HOST'),
			port: env.get('SMTP_PORT'),
			/**
			 * Uncomment the auth block if your SMTP
			 * server needs authentication
			 */
			/* auth: {
        type: 'login',
        user: env.get('SMTP_USERNAME'),
        pass: env.get('SMTP_PASSWORD'),
      }, */
		}),
	},
});

export default mailConfig;

declare module '@adonisjs/mail/types' {
	export interface MailersList extends InferMailers<typeof mailConfig> {}
}
