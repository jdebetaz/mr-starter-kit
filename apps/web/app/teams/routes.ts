import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.post('workspace/switch', [controllers.teams.SwitchWorkspace, 'execute']).as('workspace.switch');
	})
	.use(middleware.auth());
