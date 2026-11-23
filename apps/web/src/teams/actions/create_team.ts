import { inject } from '@adonisjs/core';
import TeamRepository from '#teams/repositories/team_repository';
import type Team from '#teams/models/team';
import type { CreateTeamParams } from '#teams/types/team';

/**
 * Returns the team directly rather than a `Result`: there are no expected
 * failure modes. Team names are deliberately NOT globally unique — this is a
 * multi-tenant kit, and one tenant's team name must not block another's.
 */
@inject()
export default class CreateTeam {
	constructor(private readonly teamRepository: TeamRepository) {}

	execute({ name, owner }: CreateTeamParams): Promise<Team> {
		return this.teamRepository.createWithOwner(name, owner.id);
	}
}
