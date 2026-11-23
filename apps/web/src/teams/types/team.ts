import type { UUID } from '#core/types';
import type User from '#identity/models/user';
import type { TeamRole } from '#teams/domain/team_role';
import type Team from '#teams/models/team';

export interface CreateTeamParams {
	name: string;
	owner: User;
}

export interface AddMemberPayload {
	teamId: UUID;
	userId: UUID;
	role: TeamRole;
}

/**
 * What a request is acting in. Authorization — and, from the billing capability
 * on, entitlement — questions take a Workspace rather than a User, because a
 * user may hold a personal plan and belong to a paid team at the same time.
 */
export type Workspace = { kind: 'personal'; user: User } | { kind: 'team'; team: Team; role: TeamRole };

/** A team the signed-in user may switch into. */
export interface TeamSummary {
	id: UUID;
	name: string;
	role: TeamRole;
}
