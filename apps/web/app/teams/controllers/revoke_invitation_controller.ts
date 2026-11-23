import { inject } from '@adonisjs/core';
import { invitationValidator } from '#app/teams/validators/team';
import { assertNever } from '#core/assert_never';
import RevokeInvitation from '#teams/actions/revoke_invitation';
import type { UUID } from '#core/types';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class RevokeInvitationController {
	constructor(private readonly revokeInvitation: RevokeInvitation) {}

	async execute({ request, response, session, workspace }: HttpContext) {
		if (workspace?.kind !== 'team') {
			return response.forbidden();
		}

		const { invitationId } = await request.validateUsing(invitationValidator);
		/** SAFETY: VineJS validated `invitationId` as a uuid string. */
		const result = await this.revokeInvitation.execute({
			invitationId: invitationId as UUID,
			actorRole: workspace.role,
			teamId: workspace.team.id,
		});

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_permitted':
					return response.forbidden();
				case 'not_found':
					return response.notFound();
				default:
					return assertNever(result.error);
			}
		}

		session.flash('success', 'Invitation revoked.');

		return response.redirect().back();
	}
}
