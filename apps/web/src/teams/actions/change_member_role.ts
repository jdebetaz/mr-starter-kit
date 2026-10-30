import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import { canManageMembers } from '#teams/domain/team_role';
import TeamRepository from '#teams/repositories/team_repository';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface ChangeMemberRoleParams {
	teamId: UUID;
	actorRole: TeamRole;
	userId: UUID;
	role: TeamRole;
}

export type ChangeMemberRoleError =
	| { type: 'not_permitted' }
	| { type: 'not_a_member' }
	| { type: 'would_leave_team_ownerless' };

@inject()
export default class ChangeMemberRole {
	constructor(private readonly teamRepository: TeamRepository) {}

	async execute({
		teamId,
		actorRole,
		userId,
		role,
	}: ChangeMemberRoleParams): Promise<Result<void, ChangeMemberRoleError>> {
		if (!canManageMembers(actorRole)) {
			return err({ type: 'not_permitted' });
		}

		const membership = await this.teamRepository.membershipFor(teamId, userId);

		if (!membership) {
			return err({ type: 'not_a_member' });
		}

		/**
		 * Demoting the only owner leaves the team with none — and, from the billing
		 * capability on, a subscription nobody can manage. Ownership moves through
		 * TransferOwnership, which promotes a successor in the same transaction.
		 */
		if (membership.role === 'owner' && role !== 'owner') {
			return err({ type: 'would_leave_team_ownerless' });
		}

		await this.teamRepository.updateMemberRole(membership, role);

		return ok(undefined);
	}
}
