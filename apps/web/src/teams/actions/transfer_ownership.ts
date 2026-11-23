import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import { err, ok, type Result } from '#core/result';
import TeamRepository from '#teams/repositories/team_repository';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

export interface TransferOwnershipParams {
	teamId: UUID;
	actorRole: TeamRole;
	fromUserId: UUID;
	toUserId: UUID;
}

export type TransferOwnershipError = { type: 'not_permitted' } | { type: 'not_a_member' };

@inject()
export default class TransferOwnership {
	constructor(private readonly teamRepository: TeamRepository) {}

	async execute({
		teamId,
		actorRole,
		fromUserId,
		toUserId,
	}: TransferOwnershipParams): Promise<Result<void, TransferOwnershipError>> {
		/** Only an owner hands ownership on; an admin managing members does not. */
		if (actorRole !== 'owner') {
			return err({ type: 'not_permitted' });
		}

		const current = await this.teamRepository.membershipFor(teamId, fromUserId);
		const successor = await this.teamRepository.membershipFor(teamId, toUserId);

		if (!current || current.role !== 'owner' || !successor) {
			return err({ type: 'not_a_member' });
		}

		/**
		 * One transaction, and the old owner is demoted first: the partial unique
		 * index allows a single owner per team, so promoting before demoting would
		 * collide.
		 */
		await db.transaction(async (trx) => {
			current.useTransaction(trx);
			successor.useTransaction(trx);

			current.role = 'admin';
			await current.save();

			successor.role = 'owner';
			await successor.save();

			await this.teamRepository.setOwner(teamId, toUserId, trx);
		});

		return ok(undefined);
	}
}
