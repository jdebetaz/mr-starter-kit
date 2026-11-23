import { inject } from '@adonisjs/core';
import { inviteMemberValidator } from '#app/teams/validators/team';
import { assertNever } from '#core/assert_never';
import InviteMember from '#teams/actions/invite_member';
import type { HttpContext } from '@adonisjs/core/http';

@inject()
export default class InviteMemberController {
	constructor(private readonly inviteMember: InviteMember) {}

	async execute({ auth, request, response, session, workspace }: HttpContext) {
		if (workspace?.kind !== 'team') {
			return response.forbidden();
		}

		const { email, role } = await request.validateUsing(inviteMemberValidator);
		const result = await this.inviteMember.execute({
			team: workspace.team,
			inviter: auth.getUserOrFail(),
			inviterRole: workspace.role,
			email,
			role,
		});

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_permitted':
					return response.forbidden();
				case 'already_a_member':
					session.flash('error', 'That person is already in this team.');

					return response.redirect().back();
				case 'already_invited':
					session.flash('error', 'That address already has a pending invitation.');

					return response.redirect().back();
				default:
					return assertNever(result.error);
			}
		}

		session.flash('success', `Invitation sent to ${email}.`);

		return response.redirect().back();
	}
}
