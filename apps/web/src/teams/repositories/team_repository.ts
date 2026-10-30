import db from '@adonisjs/lucid/services/db';
import BaseRepository from '#core/repositories/base_repository';
import Team from '#teams/models/team';
import TeamMember from '#teams/models/team_member';
import type { UUID } from '#core/types';
import type { TeamRole } from '#teams/domain/team_role';
import type { AddMemberPayload } from '#teams/types/team';
import type { TransactionClientContract } from '@adonisjs/lucid/types/database';

export default class TeamRepository extends BaseRepository<typeof Team> {
	constructor() {
		super(Team);
	}

	/**
	 * Creates the team and its owner's membership atomically: a team with no
	 * owner would violate the invariant the partial unique index protects.
	 */
	async createWithOwner(name: string, ownerId: UUID): Promise<Team> {
		return db.transaction(async (trx) => {
			const team = await Team.create({ name, ownerId }, { client: trx });

			await TeamMember.create({ teamId: team.id, userId: ownerId, role: 'owner' }, { client: trx });

			return team;
		});
	}

	membershipFor(teamId: UUID, userId: UUID): Promise<TeamMember | null> {
		return TeamMember.query().where('team_id', teamId).where('user_id', userId).first();
	}

	addMember({ teamId, userId, role }: AddMemberPayload, trx?: TransactionClientContract): Promise<TeamMember> {
		return TeamMember.create({ teamId, userId, role }, trx ? { client: trx } : undefined);
	}

	/**
	 * Joins through users, because an invitation is addressed to an email.
	 * Compared case-insensitively: the invite validator normalizes the address
	 * but registration does not, so `Foo@example.com` and `foo@example.com` are
	 * the same human and must not become two memberships.
	 */
	async hasMemberWithEmail(teamId: UUID, email: string): Promise<boolean> {
		const member = await TeamMember.query()
			.where('team_members.team_id', teamId)
			.join('users', 'users.id', 'team_members.user_id')
			.whereRaw('lower(users.email) = lower(?)', [email])
			.first();

		return member !== null;
	}

	membersOf(teamId: UUID): Promise<TeamMember[]> {
		return TeamMember.query().where('team_id', teamId).exec();
	}

	async updateMemberRole(membership: TeamMember, role: TeamRole): Promise<void> {
		membership.role = role;
		await membership.save();
	}

	async removeMember(membership: TeamMember): Promise<void> {
		await membership.delete();
	}

	/** Keeps `teams.owner_id` in step with the owning membership row. */
	async setOwner(teamId: UUID, ownerId: UUID, trx: TransactionClientContract): Promise<void> {
		await Team.query({ client: trx }).where('id', teamId).update({ owner_id: ownerId });
	}

	async ownerCount(teamId: UUID): Promise<number> {
		const owners = await TeamMember.query()
			.where('team_id', teamId)
			.where('role', 'owner' satisfies TeamRole);

		return owners.length;
	}
}
