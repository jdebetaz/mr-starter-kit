import { createError } from '@adonisjs/core/exceptions';
import type { Role } from '#identity/types/role';
import type { Authenticators } from '@adonisjs/auth/types';
import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

const Unauthenticated = createError('Authentication required', 'E_UNAUTHORIZED', 401);
const Forbidden = createError('Insufficient role', 'E_ACCESS_DENIED', 403);

export interface RoleMiddlewareOptions {
	/**
	 * Roles that grant access. Holding any one of them is enough, which is the
	 * same rule as `User.hasRole()`.
	 */
	roles: Role[];

	/**
	 * Guards to authenticate with, in order. Defaults to the default guard.
	 */
	guards?: (keyof Authenticators)[];
}

/**
 * Role middleware denies access to routes that require a role the
 * authenticated user does not hold.
 *
 * It authenticates the request itself, so it does not need the auth
 * middleware alongside it. An unauthenticated request is rejected as
 * unauthorized, and an authenticated user without the role as forbidden.
 *
 * For example, an administration route may be guarded with
 * `.use(middleware.role({ roles: ['ROLE_ADMIN'] }))`
 */
export default class RoleMiddleware {
	async handle(ctx: HttpContext, next: NextFn, options: RoleMiddlewareOptions) {
		const authenticated = await ctx.auth.checkUsing(options.guards);
		const user = authenticated ? ctx.auth.user : undefined;

		if (!user) {
			throw new Unauthenticated();
		}

		if (!user.hasRole(options.roles)) {
			throw new Forbidden();
		}

		return next();
	}
}
