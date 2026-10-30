import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { test } from '@japa/runner';
import AppMail from '#core/mails/app_mail';
import { captureMail } from '#tests/helpers/mail';

const VIEWS = new URL('../../../resources/views/mails/', import.meta.url);
const FIXTURE = new URL('composed_fixture.edge', VIEWS);

class ComposedMail extends AppMail<{ teamName: string }> {
	subject = 'Composed';
	view = 'composed_fixture';
	props = { teamName: 'Acme Rockets' };

	textBody(): string {
		return 'You have been invited to Acme Rockets.';
	}
}

/**
 * The other mail specs register their templates inline, which never touches the
 * shipped layout or the on-disk loader every real message uses. This one writes
 * a real template to `resources/views/mails/` and renders it through both.
 */
test.group('Shared mail layout', (group) => {
	captureMail(group);

	group.setup(() => {
		mkdirSync(VIEWS, { recursive: true });
		writeFileSync(
			FIXTURE,
			`@component('mails/layout')
				<mj-text>You have been invited to {{ teamName }}.</mj-text>
				<mj-button href="{{ mailUrl('/teams/accept') }}">Accept</mj-button>
			@end`,
		);

		return () => rmSync(FIXTURE, { force: true });
	});

	test('a message composing the shared layout renders its content', async ({ assert }) => {
		const mail = new ComposedMail({ email: 'invitee@example.com' });
		await mail.build();

		const { html } = mail.message.toJSON().message;

		assert.include(html, 'You have been invited to Acme Rockets.');
	});

	test('the layout chrome is rendered, not printed as source', async ({ assert }) => {
		const mail = new ComposedMail({ email: 'invitee@example.com' });
		await mail.build();

		const { html } = mail.message.toJSON().message;

		assert.notInclude(html, '@!section');
		assert.notInclude(html, '$slots');
		assert.notInclude(html, '@component');
	});

	test('links built with mailUrl are absolute', async ({ assert }) => {
		const mail = new ComposedMail({ email: 'invitee@example.com' });
		await mail.build();

		const { html } = mail.message.toJSON().message;

		assert.include(html, 'http://localhost:3334/teams/accept');
	});
});
