import router from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

router
	.group(() => {
		router.get('signup', [controllers.identity.Register, 'render']);
		router.post('signup', [controllers.identity.Register, 'execute']);

		router.get('login', [controllers.identity.Login, 'render']);
		router.post('login', [controllers.identity.Login, 'execute']);

		router.get('login/challenge', [controllers.identity.TotpChallenge, 'render']).as('login.challenge.render');
		router.post('login/challenge', [controllers.identity.TotpChallenge, 'execute']).as('login.challenge.execute');

		router
			.get('login/challenge/recovery', [controllers.identity.RecoveryChallenge, 'render'])
			.as('login.challenge.recovery.render');
		router
			.post('login/challenge/recovery', [controllers.identity.RecoveryChallenge, 'execute'])
			.as('login.challenge.recovery.execute');
	})
	.use(middleware.guest());

router
	.group(() => {
		router.post('logout', [controllers.identity.Session, 'execute']);
	})
	.use(middleware.auth());

router
	.group(() => {
		router
			.get('settings/security', [controllers.identity.SecuritySettings, 'render'])
			.as('settings.security.render');

		router
			.get('settings/security/two-factor', [controllers.identity.StartTotpEnrollment, 'render'])
			.as('two_factor.start.render');
		router
			.post('settings/security/two-factor', [controllers.identity.StartTotpEnrollment, 'execute'])
			.as('two_factor.start.execute');

		router
			.get('settings/security/two-factor/verify', [controllers.identity.ConfirmTotpEnrollment, 'render'])
			.as('two_factor.verify.render');
		router
			.post('settings/security/two-factor/verify', [controllers.identity.ConfirmTotpEnrollment, 'execute'])
			.as('two_factor.verify.execute');

		router
			.get('settings/security/two-factor/recovery', [controllers.identity.RecoveryCodes, 'render'])
			.as('two_factor.recovery.render');
		router
			.post('settings/security/two-factor/recovery', [controllers.identity.RecoveryCodes, 'execute'])
			.as('two_factor.recovery.execute');

		router.get('settings/security/two-factor/recovery/regenerate', [
			controllers.identity.RegenerateRecoveryCodes,
			'render',
		]);
		router
			.post('settings/security/two-factor/recovery/regenerate', [
				controllers.identity.RegenerateRecoveryCodes,
				'execute',
			])
			.as('two_factor.recovery.regenerate.execute');

		router
			.post('settings/security/two-factor/disable', [controllers.identity.DisableTotp, 'execute'])
			.as('two_factor.disable.execute');
	})
	.use(middleware.auth());
