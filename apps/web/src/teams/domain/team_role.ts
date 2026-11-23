/**
 * Roles scoped to one membership. Deliberately separate from identity's global
 * `Role`: that one says what a user is across the application, this one says
 * what they may do inside a single team. Conflating them would make "admin"
 * mean two different things.
 */
export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

/** Owners and admins may purchase, change and cancel the team's plan. */
export function canManageBilling(role: TeamRole): boolean {
	return role === 'owner' || role === 'admin';
}

/** Owners and admins may invite, remove and re-role other members. */
export function canManageMembers(role: TeamRole): boolean {
	return role === 'owner' || role === 'admin';
}
