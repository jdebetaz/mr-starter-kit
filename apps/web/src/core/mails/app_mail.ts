import { BaseMail } from '@adonisjs/mail';
import edge from 'edge.js';
import { convert } from 'html-to-text';
import mjml2html from 'mjml';
import { MailTemplateInvalid } from '#core/mails/exceptions';

/**
 * Who a message goes to. Deliberately not a `User`: an invitation is addressed
 * to someone who has no account yet, which is the whole point of inviting them.
 * A caller holding a user passes `{ email: user.email, name: user.fullName }`.
 */
export interface MailRecipient {
	email: string;
	name?: string;
}

/**
 * Base class for the application's transactional email. A subclass names the
 * MJML view under `resources/views/mails/`, the props it renders with, and its
 * plain-text alternative; this class renders, compiles and addresses it.
 *
 * `from` is deliberately left unset so the sender configured in `config/mail.ts`
 * applies. A message that must come from elsewhere sets it explicitly.
 */
export default abstract class AppMail<TProps extends object> extends BaseMail {
	/** Template name under `resources/views/mails/`, without the extension. */
	abstract view: string;

	/** Data the template renders with. */
	abstract props: TProps;

	constructor(protected readonly recipient: MailRecipient) {
		super();
	}

	/**
	 * Turns the compiled HTML into the plain-text alternative. Derived rather
	 * than hand-written: a transactional email with no text part is scored down
	 * by spam filters and renders empty in text-only clients, and a second copy
	 * of the same words is one more thing to forget to update.
	 *
	 * Links keep their href, because a reader in a text-only client still needs
	 * somewhere to go.
	 */
	protected textBody(html: string): string {
		return convert(html, {
			wordwrap: 78,
			selectors: [
				{ selector: 'img', format: 'skip' },
				{ selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
			],
		});
	}

	async prepare(): Promise<void> {
		const template = await edge.render(`mails/${this.view}`, this.props);
		/** MJML 5 returns a promise, unlike v4 which returned the result directly. */
		const compiled = await mjml2html(template);

		/**
		 * mjml2html reports a malformed template in `errors` and still returns
		 * whatever HTML it managed to build, so without this check a broken
		 * template ships as a partial or empty message.
		 */
		if (compiled.errors.length > 0) {
			throw new MailTemplateInvalid(
				this.view,
				compiled.errors.map((error) => error.message),
			);
		}

		this.message
			.to(this.recipient.email, this.recipient.name)
			.html(compiled.html)
			.text(this.textBody(compiled.html));
	}
}
