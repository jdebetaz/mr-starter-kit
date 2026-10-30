import { inject } from '@adonisjs/core';
import { err, ok, type Result } from '#core/result';
import TeamRepository from '#teams/repositories/team_repository';
import type Team from '#teams/models/team';
import type { CreateTeamParams } from '#teams/types/team';

export interface CreateTeamError {
	type: 'name_already_taken';
}

@inject()
export default class CreateTeam {
	constructor(private readonly teamRepository: TeamRepository) {}

	async execute({ name, owner }: CreateTeamParams): Promise<Result<Team, CreateTeamError>> {
		const existing = await this.teamRepository.findByName(name);

		if (existing) {
			return err({ type: 'name_already_taken' });
		}

		const team = await this.teamRepository.createWithOwner(name, owner.id);

		return ok(team);
	}
}
