import { inject } from '@adonisjs/core';
import { memberValidator } from '#app/teams/validators/team';
import { assertNever } from '#core/assert_never';
import RemoveMember from '#teams/actions/remove_member';
import type { UUID } from '#core/types';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RemoveMemberController {
	constructor(private readonly removeMember: RemoveMember) {}

	async execute({ request, response, session, workspace }: HttpContext) {
		if (workspace?.kind !== 'team') {
			return response.forbidden();
		}

		const { userId } = await request.validateUsing(memberValidator);
		/** SAFETY: VineJS validated `userId` as a uuid string; UUID is a branded string. */
		const result = await this.removeMember.execute({
			teamId: workspace.team.id,
			actorRole: workspace.role,
			userId: userId as UUID,
		});

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_permitted':
					return response.forbidden();
				case 'not_a_member':
					return response.notFound();
				case 'would_leave_team_ownerless':
					session.flash('error', 'Transfer ownership before removing the owner.');

					return response.redirect().back();
				default:
					return assertNever(result.error);
			}
		}

		session.flash('success', 'Member removed.');

		return response.redirect().back();
	}
}
