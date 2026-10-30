import { inject } from '@adonisjs/core';
import { changeMemberRoleValidator } from '#app/teams/validators/team';
import { assertNever } from '#core/assert_never';
import ChangeMemberRole from '#teams/actions/change_member_role';
import type { UUID } from '#core/types';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class ChangeMemberRoleController {
	constructor(private readonly changeMemberRole: ChangeMemberRole) {}

	async execute({ request, response, session, workspace }: HttpContext) {
		if (workspace?.kind !== 'team') {
			return response.forbidden();
		}

		const { userId, role } = await request.validateUsing(changeMemberRoleValidator);
		/** SAFETY: VineJS validated `userId` as a uuid string; UUID is a branded string. */
		const result = await this.changeMemberRole.execute({
			teamId: workspace.team.id,
			actorRole: workspace.role,
			userId: userId as UUID,
			role,
		});

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_permitted':
					return response.forbidden();
				case 'not_a_member':
					return response.notFound();
				case 'use_transfer_ownership':
					session.flash('error', 'Transfer ownership instead of promoting to owner.');

					return response.redirect().back();
				case 'would_leave_team_ownerless':
					session.flash('error', 'Transfer ownership instead of demoting the owner.');

					return response.redirect().back();
				default:
					return assertNever(result.error);
			}
		}

		session.flash('success', 'Role updated.');

		return response.redirect().back();
	}
}
