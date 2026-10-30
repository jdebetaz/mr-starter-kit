import { inject } from '@adonisjs/core';
import mail from '@adonisjs/mail/services/main';
import { err, ok, type Result } from '#core/result';
import { canManageMembers } from '#teams/domain/team_role';
import TeamInvitationMail from '#teams/mails/team_invitation_mail';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import type User from '#identity/models/user';
import type { TeamRole } from '#teams/domain/team_role';
import type Team from '#teams/models/team';
import type { IssuedInvitation } from '#teams/repositories/team_invitation_repository';

export interface InviteMemberParams {
	team: Team;
	inviter: User;
	/** The inviter's role in this team, resolved by the caller from the workspace. */
	inviterRole: TeamRole;
	email: string;
	role: TeamRole;
}

export type InviteMemberError = { type: 'not_permitted' } | { type: 'already_a_member' } | { type: 'already_invited' };

@inject()
export default class InviteMember {
	constructor(
		private readonly teamRepository: TeamRepository,
		private readonly invitationRepository: TeamInvitationRepository,
	) {}

	async execute(params: InviteMemberParams): Promise<Result<IssuedInvitation, InviteMemberError>> {
		const { team, inviter, inviterRole, email, role } = params;

		if (!canManageMembers(inviterRole)) {
			return err({ type: 'not_permitted' });
		}

		const alreadyAMember = await this.teamRepository.hasMemberWithEmail(team.id, email);

		if (alreadyAMember) {
			return err({ type: 'already_a_member' });
		}

		const pending = await this.invitationRepository.findPendingFor(team.id, email);

		if (pending) {
			return err({ type: 'already_invited' });
		}

		const issued = await this.invitationRepository.issue({
			teamId: team.id,
			invitedById: inviter.id,
			email,
			role,
		});

		await mail.send(
			new TeamInvitationMail(
				{ email },
				{
					teamName: team.name,
					inviterName: inviter.fullName ?? inviter.email,
					acceptPath: `/teams/invitations/${issued.token}`,
				},
			),
		);

		return ok(issued);
	}
}
