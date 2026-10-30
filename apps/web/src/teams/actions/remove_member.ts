import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import { canManageMembers } from '#teams/domain/team_role';
import TeamRepository from '#teams/repositories/team_repository';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface RemoveMemberParams {
	teamId: UUID;
	actorRole: TeamRole;
	userId: UUID;
}

export type RemoveMemberError =
	| { type: 'not_permitted' }
	| { type: 'not_a_member' }
	| { type: 'would_leave_team_ownerless' };

@inject()
export default class RemoveMember {
	constructor(private readonly teamRepository: TeamRepository) {}

	async execute({ teamId, actorRole, userId }: RemoveMemberParams): Promise<Result<void, RemoveMemberError>> {
		if (!canManageMembers(actorRole)) {
			return err({ type: 'not_permitted' });
		}

		/** Scoped to this team: an id from another team must not reach it. */
		const membership = await this.teamRepository.membershipFor(teamId, userId);

		if (!membership) {
			return err({ type: 'not_a_member' });
		}

		if (membership.role === 'owner') {
			return err({ type: 'would_leave_team_ownerless' });
		}

		await this.teamRepository.removeMember(membership);

		return ok(undefined);
	}
}
