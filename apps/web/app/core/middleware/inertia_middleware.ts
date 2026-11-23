import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware';
import UserTransformer from '#app/identity/transformers/user_transformer';
import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';

export default class InertiaMiddleware extends BaseInertiaMiddleware {
	share(ctx: HttpContext) {
		/**
		 * The share method is called everytime an Inertia page is rendered. In
		 * certain cases, a page may get rendered before the session middleware
		 * or the auth middleware are executed. For example: During a 404 request.
		 *
		 * In that case, we must always assume that HttpContext is not fully hydrated
		 * with all the properties
		 *
		 * SAFETY: widening only. Every property read from the result is optional,
		 * so a context missing `auth` is handled rather than assumed away.
		 */
		const { auth } = ctx as Partial<HttpContext>;

		/**
		 * Data shared with all Inertia pages. Make sure you are using
		 * transformers for rich data-types like Models.
		 */
		return {
			errors: ctx.inertia.always(this.getValidationErrors(ctx)),
			user: ctx.inertia.always(auth?.user ? UserTransformer.transform(auth.user) : undefined),

			/**
			 * Which workspace the request is acting in. Every page needs it, and
			 * resolving it per page would invite reading it from the wrong place.
			 */
			workspace: ctx.inertia.always(this.#shareWorkspace(ctx)),
		};
	}

	/**
	 * Undefined before the auth and workspace middleware have run, e.g. on a 404.
	 *
	 * Flat rather than a discriminated union: Inertia's shared-props type rejects
	 * a union whose members differ in which keys they carry.
	 */
	#shareWorkspace(ctx: HttpContext) {
		/** SAFETY: widening only, as in `share` above; `workspace` is read optionally. */
		const { workspace } = ctx as Partial<HttpContext>;

		if (!workspace) {
			return undefined;
		}

		if (workspace.kind === 'personal') {
			return { kind: workspace.kind, team: null, role: null };
		}

		return {
			kind: workspace.kind,
			team: { id: workspace.team.id, name: workspace.team.name },
			role: workspace.role,
		};
	}

	/**
	 * The flash bag is sent to every Inertia page as a top-level "flash" field
	 * (a sibling of "props") and is read on the client using "usePage().flash".
	 *
	 * Just like the share method, the flash method may run before the session
	 * middleware, so HttpContext must be treated as partially hydrated.
	 */
	flash(ctx: HttpContext) {
		/** SAFETY: widening only, as in `share` above; `session` is read optionally. */
		const { session } = ctx as Partial<HttpContext>;

		/**
		 * Fetching the first error from the flash messages
		 *
		 * SAFETY: these three keys are only ever flashed as strings, by the
		 * controllers in this app; a missing key reads as `undefined`.
		 */
		return {
			error: session?.flashMessages.get('error') as string | undefined,
			success: session?.flashMessages.get('success') as string | undefined,
			warning: session?.flashMessages.get('warning') as string | undefined,
		};
	}

	async handle(ctx: HttpContext, next: NextFn) {
		await this.init(ctx);

		const output = await next();
		this.dispose(ctx);

		return output;
	}
}

declare module '@adonisjs/inertia/types' {
	type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>;
	export interface SharedProps extends MiddlewareSharedProps {}
}
