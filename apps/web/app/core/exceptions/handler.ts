import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http';

export default class HttpExceptionHandler extends ExceptionHandler {
	/**
	 * In debug mode, the exception handler will display verbose errors
	 * with pretty printed stack traces.
	 */
	protected debug = !app.inProduction;

	/**
	 * Status pages are used to display a custom HTML pages for certain error
	 * codes. You might want to enable them in production only, but feel
	 * free to enable them in development as well.
	 */
	protected renderStatusPages = app.inProduction;

	/**
	 * Status pages is a collection of error code range and a callback
	 * to return the HTML contents to send as a response.
	 */
	protected statusPages = {
		'404': (_, { inertia }) => inertia.render('errors/not_found', {}),
		'500..599': (_, { inertia }) => inertia.render('errors/server_error', {}),
	} satisfies Record<StatusPageRange, StatusPageRenderer>;

	/**
	 * The method is used for handling errors and returning
	 * response to the client
	 *
	 * The `unknown` error is AdonisJS's own signature: anything thrown anywhere in
	 * the app lands here, so there is no narrower type to accept.
	 */
	// oxlint-disable-next-line tenkai/no-unknown-parameters
	async handle(error: unknown, ctx: HttpContext) {
		return super.handle(error, ctx);
	}

	/**
	 * The method is used to report error to the logging service or
	 * the a third party error monitoring service.
	 *
	 * @note You should not attempt to send a response from this method.
	 *
	 * The `unknown` error is AdonisJS's own signature, as for `handle` above.
	 */
	// oxlint-disable-next-line tenkai/no-unknown-parameters
	async report(error: unknown, ctx: HttpContext) {
		return super.report(error, ctx);
	}
}
