import TeamMember from '#teams/models/team_member';
import type User from '#identity/models/user';
import type { TeamRole } from '#teams/domain/team_role';
import type { TeamSummary } from '#teams/types/team';

/** The teams a user may switch into, for the workspace switcher. */
export default class UserTeamsQuery {
	async execute(user: User): Promise<TeamSummary[]> {
		const memberships = await TeamMember.query()
			.select('team_members.team_id', 'team_members.role', 'teams.name')
			.join('teams', 'teams.id', 'team_members.team_id')
			.where('team_members.user_id', user.id)
			.orderBy('teams.name');

		return memberships.map((membership) => ({
			id: membership.teamId,
			/**
			 * SAFETY: `name` is selected from the joined `teams` row above, where the
			 * column is NOT NULL; `role` is written only from `TeamRole`.
			 */
			name: membership.$extras.name as string,
			// oxlint-disable-next-line tenkai/require-safety-comment-for-type-assertion
			role: membership.role as TeamRole,
		}));
	}
}
