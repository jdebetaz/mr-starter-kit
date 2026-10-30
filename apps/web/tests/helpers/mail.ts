import { FakeMailer } from '@adonisjs/mail';
import mail from '@adonisjs/mail/services/main';
import type { BaseMail } from '@adonisjs/mail';
import type { Group } from '@japa/runner/core';

/**
 * Resets the captured messages before each test in the group, so a spec never
 * sees mail sent by another one. Call it once at the top of a group that
 * asserts on email.
 *
 * This is for assertions, not for safety: the mailer is already faked for every
 * suite in `tests/bootstrap.ts`, and that is what makes sending impossible.
 */
export function captureMail(group: Group): void {
	group.each.setup(() => {
		mail.restore();
		mail.fake();
	});
}

/** The messages sent so far, for assertions `mails.assertSent` cannot express. */
export function sentMails(): BaseMail[] {
	const mailer = mail.use();

	if (!(mailer instanceof FakeMailer)) {
		throw new Error('The mailer is not faked; tests/bootstrap.ts should have faked it.');
	}

	return mailer.mails.sent();
}
