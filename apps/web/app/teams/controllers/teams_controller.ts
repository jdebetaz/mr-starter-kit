import { inject } from '@adonisjs/core';
import { TeamPolicy } from '#app/teams/policies/team_policy';
import PendingInvitationsQuery from '#teams/queries/pending_invitations_query';
import TeamMembersQuery from '#teams/queries/team_members_query';
import UserTeamsQuery from '#teams/queries/user_teams_query';
import type { HttpContext } from '@adonisjs/core/http';

/**
 * The team settings page. It owns the whole page composition; each mutation on
 * it has its own focused `execute` controller, per docs/architecture/application.md.
 */
@inject()
export default class TeamsController {
	constructor(
		private readonly teamMembers: TeamMembersQuery,
		private readonly pendingInvitations: PendingInvitationsQuery,
		private readonly userTeams: UserTeamsQuery,
	) {}

	async render({ auth, inertia, workspace }: HttpContext) {
		const user = auth.getUserOrFail();
		const teams = await this.userTeams.execute(user);

		if (workspace?.kind !== 'team') {
			return inertia.render('teams/settings', { teams, team: null, members: [], invitations: [], can: null });
		}

		const members = await this.teamMembers.execute(workspace.team.id);
		const invitations = TeamPolicy.manageMembers(workspace)
			? await this.pendingInvitations.execute(workspace.team.id)
			: [];

		return inertia.render('teams/settings', {
			teams,
			team: { id: workspace.team.id, name: workspace.team.name },
			members,
			invitations,
			can: {
				manageMembers: TeamPolicy.manageMembers(workspace),
				transferOwnership: TeamPolicy.transferOwnership(workspace),
			},
		});
	}
}
