import edge from 'edge.js';
import { buildMailUrl } from '#core/mails/mail_url';
import env from '#start/env';

/**
 * Globals for email templates. `AppMail` renders through Edge directly rather
 * than through the mailer's view helpers, so the `globals` in `config/mail.ts`
 * do not reach these templates — these do.
 */
edge.global('appName', env.get('APP_NAME'));

/** Absolute link for a template. See `buildMailUrl` for why links are absolute. */
edge.global('mailUrl', (path: string): string => buildMailUrl(env.get('APP_URL'), path));
