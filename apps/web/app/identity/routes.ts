import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.get('signup', [controllers.NewAccount, 'create']);
		router.post('signup', [controllers.NewAccount, 'store']);

		router.get('login', [controllers.Session, 'create']);
		router.post('login', [controllers.Session, 'store']);
	})
	.use(middleware.guest());

router
	.group(() => {
		router.post('logout', [controllers.Session, 'destroy']);
	})
	.use(middleware.auth());
