import TeamMember from '#teams/models/team_member';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface TeamMemberRow {
	userId: UUID;
	email: string;
	fullName: string | null;
	role: TeamRole;
}

/** The member list for a team's settings page. */
export default class TeamMembersQuery {
	async execute(teamId: UUID): Promise<TeamMemberRow[]> {
		const rows = await TeamMember.query()
			.select('team_members.user_id', 'team_members.role', 'users.email', 'users.full_name')
			.join('users', 'users.id', 'team_members.user_id')
			.where('team_members.team_id', teamId)
			.orderBy('users.email');

		return rows.map((row) => ({
			userId: row.userId,
			/** SAFETY: both columns come from the joined users row; email is NOT NULL. */
			email: row.$extras.email as string,
			// oxlint-disable-next-line tenkai/require-safety-comment-for-type-assertion
			fullName: (row.$extras.full_name as string | null) ?? null,
			// oxlint-disable-next-line tenkai/require-safety-comment-for-type-assertion
			role: row.role as TeamRole,
		}));
	}
}
