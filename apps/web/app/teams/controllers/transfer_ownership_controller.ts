import { inject } from '@adonisjs/core';
import { memberValidator } from '#app/teams/validators/team';
import { assertNever } from '#core/assert_never';
import TransferOwnership from '#teams/actions/transfer_ownership';
import type { UUID } from '#core/types';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class TransferOwnershipController {
	constructor(private readonly transferOwnership: TransferOwnership) {}

	async execute({ auth, request, response, session, workspace }: HttpContext) {
		if (workspace?.kind !== 'team') {
			return response.forbidden();
		}

		const { userId } = await request.validateUsing(memberValidator);
		/** SAFETY: VineJS validated `userId` as a uuid string; UUID is a branded string. */
		const result = await this.transferOwnership.execute({
			teamId: workspace.team.id,
			actorRole: workspace.role,
			fromUserId: auth.getUserOrFail().id,
			toUserId: userId as UUID,
		});

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_permitted':
					return response.forbidden();
				case 'not_a_member':
					return response.notFound();
				default:
					return assertNever(result.error);
			}
		}

		session.flash('success', 'Ownership transferred.');

		return response.redirect().back();
	}
}
