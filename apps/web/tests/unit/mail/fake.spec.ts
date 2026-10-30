import { FakeMailer } from '@adonisjs/mail';
import mail from '@adonisjs/mail/services/main';
import { test } from '@japa/runner';
import edge from 'edge.js';
import AppMail from '#core/mails/app_mail';
import { sentMails } from '#tests/helpers/mail';

class NoticeMail extends AppMail<Record<string, never>> {
	subject = 'Notice';
	view = 'notice';
	props: Record<string, never> = {};

	textBody(): string {
		return 'Notice';
	}
}

/**
 * This group installs nothing of its own. If these pass only because a helper
 * set the fake up, they are not testing what they claim: that a spec which
 * forgets to fake the mailer still cannot reach a transport.
 */
test.group('Mail fake', (group) => {
	group.setup(() => {
		edge.registerTemplate('mails/notice', {
			template: `<mjml><mj-body><mj-section><mj-column><mj-text>Notice</mj-text></mj-column></mj-section></mj-body></mjml>`,
		});
	});

	test('the mailer is faked for every suite without per-test setup', ({ assert }) => {
		assert.instanceOf(mail.use('smtp'), FakeMailer);
	});

	test('a sent message is captured instead of transported', async ({ assert }) => {
		await mail.send(new NoticeMail({ email: 'reader@example.com' }));

		const captured = sentMails();

		assert.lengthOf(captured, 1);
		assert.instanceOf(captured[0], NoticeMail);
	});
});
