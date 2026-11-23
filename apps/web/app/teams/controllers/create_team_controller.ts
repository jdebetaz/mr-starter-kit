import { inject } from '@adonisjs/core';
import { createTeamValidator } from '#app/teams/validators/team';
import CreateTeam from '#teams/actions/create_team';
import { ActiveWorkspace } from '#teams/services/active_workspace';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class CreateTeamController {
	constructor(private readonly createTeam: CreateTeam) {}

	async execute({ auth, request, response, session }: HttpContext) {
		const { name } = await request.validateUsing(createTeamValidator);
		const team = await this.createTeam.execute({ name, owner: auth.getUserOrFail() });

		/** Creating a team switches into it: it is what the user just asked for. */
		ActiveWorkspace.put(session, team.id);

		return response.redirect().toRoute('teams.settings.render');
	}
}
