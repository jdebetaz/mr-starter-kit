import vine from '@vinejs/vine';
import { TEAM_ROLES } from '#teams/domain/team_role';

/** An absent `teamId` means the personal workspace. */
export const switchWorkspaceValidator = vine.compile(
	vine.object({
		teamId: vine.string().uuid().optional(),
	}),
);

export const createTeamValidator = vine.compile(
	vine.object({
		name: vine.string().trim().minLength(2).maxLength(80),
	}),
);

/** Owner is never invited: a team has exactly one, and it transfers. */
export const inviteMemberValidator = vine.compile(
	vine.object({
		email: vine.string().trim().email().normalizeEmail(),
		role: vine.enum(TEAM_ROLES.filter((role) => role !== 'owner')),
	}),
);

export const memberValidator = vine.compile(
	vine.object({
		userId: vine.string().uuid(),
	}),
);

/** Owner is excluded: promotion is a transfer, not a role change. */
export const changeMemberRoleValidator = vine.compile(
	vine.object({
		userId: vine.string().uuid(),
		role: vine.enum(TEAM_ROLES.filter((role) => role !== 'owner')),
	}),
);

export const invitationValidator = vine.compile(
	vine.object({
		invitationId: vine.string().uuid(),
	}),
);
