import AppMail from '#core/mails/app_mail';
import type { MailRecipient } from '#core/mails/app_mail';

export interface TeamInvitationProps {
	teamName: string;
	inviterName: string;
	acceptPath: string;
}

/**
 * Sent to an address that may have no account yet — which is why `AppMail`
 * takes a recipient rather than a `User`.
 */
export default class TeamInvitationMail extends AppMail<TeamInvitationProps> {
	subject = 'You have been invited to a team';
	view = 'team_invitation';

	constructor(
		recipient: MailRecipient,
		readonly props: TeamInvitationProps,
	) {
		super(recipient);
	}
}
