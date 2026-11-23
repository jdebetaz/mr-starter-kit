import TeamInvitation from '#teams/models/team_invitation';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface PendingInvitationRow {
	id: UUID;
	email: string;
	role: TeamRole;
}

/** Invitations a team's settings page can still revoke. */
export default class PendingInvitationsQuery {
	async execute(teamId: UUID): Promise<PendingInvitationRow[]> {
		const invitations = await TeamInvitation.query()
			.select('id', 'email', 'role')
			.where('team_id', teamId)
			.whereNull('accepted_at')
			.orderBy('email');

		return invitations.map((invitation) => ({
			id: invitation.id,
			email: invitation.email,
			/** SAFETY: the role column is only ever written from `TeamRole`. */
			role: invitation.role as TeamRole,
		}));
	}
}
