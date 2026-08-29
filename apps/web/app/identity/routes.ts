import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.get('signup', [controllers.identity.NewAccount, 'create']);
		router.post('signup', [controllers.identity.NewAccount, 'store']);

		router.get('login', [controllers.identity.Session, 'create']);
		router.post('login', [controllers.identity.Session, 'store']);
	})
	.use(middleware.guest());

router
	.group(() => {
		router.post('logout', [controllers.identity.Session, 'destroy']);
	})
	.use(middleware.auth());
