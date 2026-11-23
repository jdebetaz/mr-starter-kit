import { canManageBilling, canManageMembers } from '#teams/domain/team_role';
import type { Workspace } from '#teams/types/team';

/**
 * Authorization takes the workspace, never the signed-in user: the same person
 * is an owner in one team and a member in another, and the question is always
 * about the one they are acting in.
 */
export const TeamPolicy = {
	manageMembers(workspace: Workspace | undefined): boolean {
		return workspace?.kind === 'team' && canManageMembers(workspace.role);
	},

	manageBilling(workspace: Workspace | undefined): boolean {
		return workspace?.kind === 'team' && canManageBilling(workspace.role);
	},

	transferOwnership(workspace: Workspace | undefined): boolean {
		return workspace?.kind === 'team' && workspace.role === 'owner';
	},
};
