import { authApiClient } from '@adonisjs/auth/plugins/api_client';
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client';
import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import { inertiaApiClient } from '@adonisjs/inertia/plugins/api_client';
import { dbAssertions } from '@adonisjs/lucid/plugins/db';
import { sessionApiClient } from '@adonisjs/session/plugins/api_client';
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client';
import { shieldApiClient } from '@adonisjs/shield/plugins/api_client';
import { apiClient } from '@japa/api-client';
import { assert } from '@japa/assert';
import { browserClient } from '@japa/browser-client';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import type { Config } from '@japa/runner/types';

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
	assert(),
	pluginAdonisJS(app),
	dbAssertions(app),
	apiClient(),
	sessionApiClient(app),
	shieldApiClient(),
	authApiClient(app),
	inertiaApiClient(app),
	browserClient({ runInSuites: ['browser'] }),
	sessionBrowserClient(app),
	authBrowserClient(app),
];

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
	/**
	 * Migrations run once per test process. Anything that reads a table during
	 * validation needs this, not only the tests that write rows: the signup
	 * validator's `unique` rule queries the users table.
	 */
	setup: [() => testUtils.db().migrate()],
	teardown: [],
};

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
	if (['unit', 'functional', 'browser'].includes(suite.name)) {
		suite.setup(() => testUtils.db().truncate());
	}

	if (['browser', 'functional', 'e2e'].includes(suite.name)) {
		return suite.setup(() => testUtils.httpServer().start());
	}
};
