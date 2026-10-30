import type { UUID } from '#core/types';
import type User from '#identity/models/user';
import type { TeamRole } from '#teams/domain/team_role';

export interface CreateTeamParams {
	name: string;
	owner: User;
}

export interface AddMemberPayload {
	teamId: UUID;
	userId: UUID;
	role: TeamRole;
}
