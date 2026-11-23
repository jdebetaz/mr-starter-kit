import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import { canManageMembers } from '#teams/domain/team_role';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface RevokeInvitationParams {
	invitationId: UUID;
	/** The actor's role in the team the invitation belongs to. */
	actorRole: TeamRole;
	teamId: UUID;
}

export type RevokeInvitationError = { type: 'not_permitted' } | { type: 'not_found' };

@inject()
export default class RevokeInvitation {
	constructor(private readonly invitationRepository: TeamInvitationRepository) {}

	async execute({
		invitationId,
		actorRole,
		teamId,
	}: RevokeInvitationParams): Promise<Result<void, RevokeInvitationError>> {
		if (!canManageMembers(actorRole)) {
			return err({ type: 'not_permitted' });
		}

		const invitation = await this.invitationRepository.findById(invitationId);

		/** Scoped to the team: an id alone must not reach another team's invitation. */
		if (!invitation || invitation.teamId !== teamId || invitation.isAccepted) {
			return err({ type: 'not_found' });
		}

		await this.invitationRepository.revoke(invitation);

		return ok(undefined);
	}
}
