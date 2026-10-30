import { test } from '@japa/runner';
import edge from 'edge.js';
import AppMail from '#core/mails/app_mail';
import { captureMail } from '#tests/helpers/mail';

/** No `textBody()`: the plain-text part is derived from the compiled HTML. */
class DerivedTextMail extends AppMail<{ teamName: string }> {
	subject = 'Derived';
	view = 'derived_text';
	props = { teamName: 'Acme Rockets' };
}

test.group('Plain-text part', (group) => {
	captureMail(group);

	group.setup(() => {
		edge.registerTemplate('mails/derived_text', {
			template: `<mjml><mj-body><mj-section><mj-column>
				<mj-text>You have been invited to {{ teamName }}.</mj-text>
				<mj-button href="{{ mailUrl('/teams/accept') }}">Accept</mj-button>
			</mj-column></mj-section></mj-body></mjml>`,
		});
	});

	test('the text part carries the message copy', async ({ assert }) => {
		const mail = new DerivedTextMail({ email: 'invitee@example.com' });
		await mail.build();

		assert.include(mail.message.toJSON().message.text, 'You have been invited to Acme Rockets.');
	});

	test('the text part carries no markup', async ({ assert }) => {
		const mail = new DerivedTextMail({ email: 'invitee@example.com' });
		await mail.build();

		const { text } = mail.message.toJSON().message;

		assert.notInclude(text, '<');
		assert.notInclude(text, 'doctype');
	});

	/** A reader in a text-only client still needs somewhere to click. */
	test('a link survives as its absolute URL', async ({ assert }) => {
		const mail = new DerivedTextMail({ email: 'invitee@example.com' });
		await mail.build();

		assert.include(mail.message.toJSON().message.text, 'http://localhost:3334/teams/accept');
	});
});
