import { inject } from '@adonisjs/core';
import { assertNever } from '#core/assert_never';
import AcceptInvitation from '#teams/actions/accept_invitation';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import { ActiveWorkspace } from '#teams/services/active_workspace';
import type { HttpContext } from '@adonisjs/core/http';

/**
 * The page an invitation link opens, and the form on it.
 *
 * `render` is a GET from an email, so it only reads: accepting is the POST.
 * A link that joined a team on GET would be redeemed by any mail scanner or
 * link prefetcher that touched the message.
 */
@inject()
export default class AcceptInvitationController {
	constructor(
		private readonly acceptInvitation: AcceptInvitation,
		private readonly invitationRepository: TeamInvitationRepository,
		private readonly teamRepository: TeamRepository,
	) {}

	async render({ auth, inertia, params, response }: HttpContext) {
		const invitation = await this.invitationRepository.findByToken(params.token);

		if (!invitation || invitation.isAccepted) {
			return response.notFound();
		}

		const team = await this.teamRepository.findById(invitation.teamId);

		if (!team) {
			return response.notFound();
		}

		return inertia.render('teams/invitation', {
			invitation: {
				teamName: team.name,
				email: invitation.email,
				role: invitation.role,
				/** So the page can say "you are signed in as someone else" before they try. */
				matchesSignedInUser: auth.getUserOrFail().email === invitation.email,
			},
			token: params.token,
		});
	}

	async execute({ auth, params, response, session }: HttpContext) {
		const result = await this.acceptInvitation.execute({ token: params.token, user: auth.getUserOrFail() });

		if (!result.ok) {
			switch (result.error.type) {
				case 'not_found':
					return response.notFound();
				case 'wrong_recipient':
					return response.forbidden();
				case 'already_accepted':
				case 'already_a_member':
					session.flash('error', 'That invitation has already been used.');

					return response.redirect().toRoute('teams.settings.render');
				default:
					return assertNever(result.error);
			}
		}

		ActiveWorkspace.put(session, result.value.teamId);
		session.flash('success', 'You have joined the team.');

		return response.redirect().toRoute('teams.settings.render');
	}
}
