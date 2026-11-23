import { inject } from '@adonisjs/core';
import { switchWorkspaceValidator } from '#app/teams/validators/team';
import TeamRepository from '#teams/repositories/team_repository';
import { ActiveWorkspace } from '#teams/services/active_workspace';
import type { UUID } from '#core/types';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class SwitchWorkspaceController {
	constructor(private readonly teamRepository: TeamRepository) {}

	async execute({ auth, request, response, session }: HttpContext) {
		const { teamId } = await request.validateUsing(switchWorkspaceValidator);
		const user = auth.getUserOrFail();

		if (!teamId) {
			ActiveWorkspace.clear(session);

			return response.redirect().back();
		}

		/**
		 * Membership is the authorization: without it this endpoint is a takeover.
		 *
		 * SAFETY: the validator above accepts `teamId` only as a uuid string, and
		 * UUID is a branded string, so the two assertions in this method restate a
		 * shape VineJS has already checked.
		 */
		const membership = await this.teamRepository.membershipFor(teamId as UUID, user.id);

		if (!membership) {
			return response.forbidden();
		}

		/** SAFETY: as above — VineJS validated `teamId` as a uuid string. */
		ActiveWorkspace.put(session, teamId as UUID);

		return response.redirect().back();
	}
}
