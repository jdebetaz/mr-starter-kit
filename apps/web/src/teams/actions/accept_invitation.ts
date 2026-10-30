import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import { DateTime } from 'luxon';
import { err, ok, type Result } from '#core/result';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import type User from '#identity/models/user';
import type { TeamRole } from '#teams/domain/team_role';
import type TeamMember from '#teams/models/team_member';

export interface AcceptInvitationParams {
	token: string;
	user: User;
}

/**
 * `not_found` covers an unknown token, an expired one and a revoked one alike:
 * the token provider's `verify` fails the first two identically, and a revoked
 * invitation is deleted. Collapsing them is also the safer answer, since it
 * tells a guesser nothing about whether a token ever existed.
 */
export type AcceptInvitationError = { type: 'not_found' } | { type: 'already_accepted' } | { type: 'wrong_recipient' };

@inject()
export default class AcceptInvitation {
	constructor(
		private readonly teamRepository: TeamRepository,
		private readonly invitationRepository: TeamInvitationRepository,
	) {}

	async execute({ token, user }: AcceptInvitationParams): Promise<Result<TeamMember, AcceptInvitationError>> {
		const invitation = await this.invitationRepository.findByToken(token);

		if (!invitation) {
			return err({ type: 'not_found' });
		}

		if (invitation.isAccepted) {
			return err({ type: 'already_accepted' });
		}

		/** The link is a bearer token in an inbox: it must not re-target. */
		if (invitation.email !== user.email) {
			return err({ type: 'wrong_recipient' });
		}

		/** SAFETY: the `role` column is only ever written from `TeamRole`, by InviteMember. */
		const role = invitation.role as TeamRole;

		/** Marking it accepted and creating the membership must not come apart. */
		const membership = await db.transaction(async (trx) => {
			invitation.useTransaction(trx);
			invitation.acceptedAt = DateTime.now();
			await invitation.save();

			return this.teamRepository.addMember({ teamId: invitation.teamId, userId: user.id, role }, trx);
		});

		return ok(membership);
	}
}
