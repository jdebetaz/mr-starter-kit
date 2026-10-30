import { test } from '@japa/runner';
import edge from 'edge.js';
import AppMail from '#core/mails/app_mail';

interface WelcomeProps {
	name: string;
}

/** A message exactly as a capability would write one. */
class FixtureMail extends AppMail<WelcomeProps> {
	subject = 'Fixture';
	view = 'fixture';
	props: WelcomeProps = { name: 'Ada' };

	textBody(): string {
		return 'Hello Ada';
	}
}

class BrokenTemplateMail extends AppMail<Record<string, never>> {
	subject = 'Broken';
	view = 'broken';
	props: Record<string, never> = {};

	textBody(): string {
		return 'Broken';
	}
}

test.group('AppMail', (group) => {
	group.setup(() => {
		edge.registerTemplate('mails/fixture', {
			template: `<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{ name }}</mj-text>
				<mj-text><a href="{{ mailUrl('/settings/security') }}">Security</a></mj-text>
				</mj-column></mj-section></mj-body></mjml>`,
		});
		edge.registerTemplate('mails/broken', { template: `<mjml><mj-body><mj-nonsense /></mj-body></mjml>` });
	});

	test('a message is addressed to the recipient, not to a user row', async ({ assert }) => {
		const mail = new FixtureMail({ email: 'invitee@example.com', name: 'Invitee' });
		await mail.build();

		assert.deepInclude(mail.message.toJSON().message.to, {
			address: 'invitee@example.com',
			name: 'Invitee',
		});
	});

	test('a message carries both an HTML and a plain-text part', async ({ assert }) => {
		const mail = new FixtureMail({ email: 'invitee@example.com' });
		await mail.build();

		const { html, text } = mail.message.toJSON().message;

		assert.isNotEmpty(html);
		assert.equal(text, 'Hello Ada');
	});

	/** `from` is left unset so the mailer applies the configured sender. */
	test('a message declares no sender of its own', ({ assert }) => {
		assert.isUndefined(new FixtureMail({ email: 'invitee@example.com' }).from);
	});

	test('links are absolute even when APP_URL carries a trailing slash', async ({ assert }) => {
		const mail = new FixtureMail({ email: 'invitee@example.com' });
		await mail.build();

		const { html } = mail.message.toJSON().message;

		assert.include(html, 'http://localhost:3334/settings/security');
		assert.notInclude(html, '//settings');
	});

	/**
	 * mjml2html reports a malformed template in its `errors` array rather than
	 * throwing, so without an explicit check a broken layout ships as partial HTML.
	 */
	test('a malformed MJML template raises instead of sending partial HTML', async ({ assert }) => {
		const mail = new BrokenTemplateMail({ email: 'invitee@example.com' });

		await assert.rejects(() => mail.build());
	});
});
