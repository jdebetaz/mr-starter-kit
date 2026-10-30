import { Secret } from '@adonisjs/core/helpers';
import BaseRepository from '#core/repositories/base_repository';
import TeamInvitation from '#teams/models/team_invitation';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';

interface IssueInvitationPayload {
	teamId: UUID;
	invitedById: UUID;
	email: string;
	role: TeamRole;
}

/** What the caller needs to build the link; the token is never persisted in clear. */
export interface IssuedInvitation {
	invitation: TeamInvitation;
	token: string;
}

export default class TeamInvitationRepository extends BaseRepository<typeof TeamInvitation> {
	constructor() {
		super(TeamInvitation);
	}

	async issue(payload: IssueInvitationPayload): Promise<IssuedInvitation> {
		const invitation = await TeamInvitation.create(payload);
		const token = await TeamInvitation.invitationTokens.create(invitation, ['teams:accept']);

		return { invitation, token: token.value!.release() };
	}

	findPendingFor(teamId: UUID, email: string): Promise<TeamInvitation | null> {
		return TeamInvitation.query().where('team_id', teamId).where('email', email).whereNull('accepted_at').first();
	}

	/**
	 * Verifies the token and loads the invitation it belongs to. Verification
	 * covers the hash and the expiry, so an expired token resolves to null here
	 * rather than being checked separately.
	 */
	async findByToken(token: string): Promise<TeamInvitation | null> {
		const verified = await TeamInvitation.invitationTokens.verify(new Secret(token));

		if (!verified) {
			return null;
		}

		/**
		 * SAFETY: the provider writes `tokenable_id` from a TeamInvitation's own
		 * primary key, which is a UUID; the column is typed loosely because the
		 * table serves every tokenable model.
		 */
		return this.findById(verified.tokenableId as UUID);
	}

	/**
	 * Deletes the invitation and the token with it, so a revoked link verifies
	 * as unknown rather than as a known-but-dead invitation.
	 */
	async revoke(invitation: TeamInvitation): Promise<void> {
		const tokens = await TeamInvitation.invitationTokens.all(invitation);

		for (const token of tokens) {
			await TeamInvitation.invitationTokens.delete(invitation, token.identifier);
		}

		await invitation.delete();
	}

	pendingFor(teamId: UUID): Promise<TeamInvitation[]> {
		return TeamInvitation.query().where('team_id', teamId).whereNull('accepted_at').exec();
	}
}
