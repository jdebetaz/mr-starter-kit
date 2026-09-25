import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.get('signup', [controllers.identity.Register, 'render']);
		router.post('signup', [controllers.identity.Register, 'execute']);

		router.get('login', [controllers.identity.Login, 'render']);
		router.post('login', [controllers.identity.Login, 'execute']);
	})
	.use(middleware.guest());

router
	.group(() => {
		router.post('logout', [controllers.identity.Session, 'execute']);
	})
	.use(middleware.auth());
