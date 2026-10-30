import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.post('workspace/switch', [controllers.teams.SwitchWorkspace, 'execute']).as('workspace.switch');

		router.get('settings/team', [controllers.teams.Teams, 'render']).as('teams.settings.render');

		router
			.get('teams/invitations/:token', [controllers.teams.AcceptInvitation, 'render'])
			.as('teams.invitations.render');
		router
			.post('teams/invitations/:token', [controllers.teams.AcceptInvitation, 'execute'])
			.as('teams.invitations.accept');
		router.post('teams', [controllers.teams.CreateTeam, 'execute']).as('teams.create');

		router
			.post('settings/team/members/invite', [controllers.teams.InviteMember, 'execute'])
			.as('teams.members.invite');
		router.delete('settings/team/members', [controllers.teams.RemoveMember, 'execute']).as('teams.members.remove');
		router
			.patch('settings/team/members/role', [controllers.teams.ChangeMemberRole, 'execute'])
			.as('teams.members.role');
		router
			.post('settings/team/ownership', [controllers.teams.TransferOwnership, 'execute'])
			.as('teams.ownership.transfer');
		router
			.delete('settings/team/invitations', [controllers.teams.RevokeInvitation, 'execute'])
			.as('teams.invitations.revoke');
	})
	.use(middleware.auth());
