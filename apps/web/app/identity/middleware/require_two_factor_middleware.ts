import { isTwoFactorRequiredFor } from '#identity/policies/two_factor_requirement';
import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

/**
 * Require-two-factor middleware obliges users who must have two-factor
 * authentication to enroll before they use the routes it guards. Whether a
 * user must is decided by `isTwoFactorRequiredFor`: the per-user
 * `totpRequired` override first, otherwise the roles in `requiredForRoles`
 * of `config/two_factor.ts`.
 *
 * The kit applies it to no route, so the application stays open until a
 * product decides otherwise. Apply it to the routes that need enforcing,
 * after `auth`, because it never authenticates anyone itself. For example,
 * `.use([middleware.auth(), middleware.requireTwoFactor()])` on a group of
 * routes, or on a single route.
 *
 * A required user without 2FA enabled is redirected to the enrollment start
 * page (`two_factor.start.render`). Everything else passes through:
 * - a request already inside the enrollment flow (route name starting with
 *   `two_factor.`), so the redirect cannot loop
 * - the logout route (`POST /logout`), so a user is never stranded
 * - a user who has 2FA enabled
 * - a user for whom 2FA is not required
 * - a request with no authenticated user, which is left to the auth
 *   middleware so that a missing guard is not hidden
 *
 * Only `two_factor.*` routes and logout are exempt. Do not guard any other
 * page the enrollment flow needs, such as the login pages.
 */
export default class RequireTwoFactorMiddleware {
	async handle(ctx: HttpContext, next: NextFn) {
		const user = ctx.auth.user;

		if (!user || user.isTwoFactorEnabled || !isTwoFactorRequiredFor(user)) {
			return next();
		}

		const route = ctx.route;
		const insideEnrollment = route?.name?.startsWith('two_factor.') ?? false;
		const isLogout = ctx.request.method() === 'POST' && route?.pattern === '/logout';

		if (insideEnrollment || isLogout) {
			return next();
		}

		return ctx.response.redirect().toRoute('two_factor.start.render');
	}
}
