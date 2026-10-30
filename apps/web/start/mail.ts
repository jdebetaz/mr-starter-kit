import edge from 'edge.js';
import env from '#start/env';

/**
 * Globals for email templates. `AppMail` renders through Edge directly rather
 * than through the mailer's view helpers, so the `globals` in `config/mail.ts`
 * do not reach these templates — these do.
 */
edge.global('appName', env.get('APP_NAME'));

/**
 * Builds an absolute URL for an email. A relative href has no origin to resolve
 * against once the message leaves the app, so every link in a template goes
 * through this. `APP_URL` is normalised, because a configured trailing slash
 * would otherwise produce `https://example.com//settings`.
 */
edge.global('mailUrl', (path: string): string => {
	const base = env.get('APP_URL').replace(/\/+$/, '');

	return `${base}/${path.replace(/^\/+/, '')}`;
});
