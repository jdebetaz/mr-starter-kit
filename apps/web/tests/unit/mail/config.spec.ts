import mail from '@adonisjs/mail/services/main';
import { test } from '@japa/runner';
import edge from 'edge.js';
import AppMail from '#core/mails/app_mail';
import env from '#start/env';
import { captureMail, sentMails } from '#tests/helpers/mail';

class SenderProbeMail extends AppMail<Record<string, never>> {
	subject = 'Sender probe';
	view = 'sender_probe';
	props: Record<string, never> = {};

	textBody(): string {
		return 'Sender probe';
	}
}

test.group('Mail configuration', (group) => {
	captureMail(group);

	group.setup(() => {
		edge.registerTemplate('mails/sender_probe', {
			template: `<mjml><mj-body><mj-section><mj-column><mj-text>Probe</mj-text></mj-column></mj-section></mj-body></mjml>`,
		});
	});

	/**
	 * `AppMail` sets no sender of its own, so this is what proves the configured
	 * one actually reaches a message rather than being dropped.
	 */
	test('a message with no sender of its own goes out as the configured sender', async ({ assert }) => {
		await mail.send(new SenderProbeMail({ email: 'reader@example.com' }));

		const [sent] = sentMails();

		assert.deepEqual(sent?.message.toJSON().message.from, {
			address: env.get('MAIL_FROM_ADDRESS'),
			name: env.get('MAIL_FROM_NAME'),
		});
	});
});
