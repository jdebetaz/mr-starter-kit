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
		clearCaptured();
	});
}

/**
 * Empties the suite-wide fake rather than replacing it. Installing a second
 * fake here would leave it in place after the group, so a later group could
 * pass on this one's fake instead of the bootstrap's — which would quietly
 * retire the regression test for "a test sends real mail".
 */
function clearCaptured(): void {
	fakeMailer().mails.clear();
}

/** The messages sent so far, for assertions `mails.assertSent` cannot express. */
export function sentMails(): BaseMail[] {
	return fakeMailer().mails.sent();
}

function fakeMailer(): FakeMailer {
	const mailer = mail.use();

	if (!(mailer instanceof FakeMailer)) {
		throw new Error('The mailer is not faked; tests/bootstrap.ts should have faked it.');
	}

	return mailer;
}
