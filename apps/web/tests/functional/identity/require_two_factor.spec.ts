import router from '@adonisjs/core/services/router';
import { test } from '@japa/runner';
import RequireTwoFactorMiddleware from '#identity/middleware/require_two_factor_middleware';
import { middleware } from '#start/kernel';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';
import type { HttpContext } from '@adonisjs/core/http';

/**
 * Nothing in the kit applies `requireTwoFactor`, so these specs register a
 * throwaway route that does. It exists only in this test process.
 */
router
	.get('/__enforced', ({ response }) => response.ok({ reached: true }))
	.use([middleware.auth(), middleware.requireTwoFactor()]);

/**
 * The same guard on a route inside the enrollment flow's namespace, so the
 * loop case is proven against the middleware rather than against an
 * unguarded enrollment page.
 */
router
	.get('/__enrollment-probe', ({ response }) => response.ok({ reached: true }))
	.as('two_factor.probe')
	.use([middleware.auth(), middleware.requireTwoFactor()]);

/**
 * `POST /logout` belongs to the application and cannot be re-guarded from a
 * spec, so the logout exemption drives the middleware class with a minimal
 * context. `redirected` records whether the middleware tried to redirect.
 */
async function run(user: User, method: string, pattern: string) {
	let redirected = false;
	let passed = false;
	const ctx = {
		auth: { user },
		route: { pattern, name: undefined },
		request: { method: () => method },
		response: {
			redirect: () => ({
				toRoute: () => {
					redirected = true;
				},
			}),
		},
	} as unknown as HttpContext;

	await new RequireTwoFactorMiddleware().handle(ctx, async () => {
		passed = true;
	});

	return { redirected, passed };
}

test.group('Two-factor enforcement middleware', (group) => {
	truncateBetweenTests(group);

	test('an admin without 2FA is sent to enrollment', async ({ client }) => {
		const response = await client
			.get('/__enforced')
			.withInertia()
			.loginAs(await createUser({ roles: ['ROLE_ADMIN'] }));

		response.assertRedirectsTo('/settings/security/two-factor');
	});

	test('a user required by override without 2FA is sent to enrollment', async ({ client }) => {
		const user = await createUser();
		user.totpRequired = true;
		await user.save();

		const response = await client.get('/__enforced').withInertia().loginAs(user);

		response.assertRedirectsTo('/settings/security/two-factor');
	});

	test('an admin with 2FA passes through', async ({ client }) => {
		const response = await client.get('/__enforced').loginAs(await enabledUser({ roles: ['ROLE_ADMIN'] }));

		response.assertStatus(200);
		response.assertBodyContains({ reached: true });
	});

	test('an ordinary user passes through', async ({ client }) => {
		const response = await client.get('/__enforced').loginAs(await createUser());

		response.assertStatus(200);
		response.assertBodyContains({ reached: true });
	});

	test('an admin with the override off passes through', async ({ client }) => {
		const user = await createUser({ roles: ['ROLE_ADMIN'] });
		user.totpRequired = false;
		await user.save();

		const response = await client.get('/__enforced').loginAs(user);

		response.assertStatus(200);
		response.assertBodyContains({ reached: true });
	});

	test('the enrollment flow itself is not redirected', async ({ client }) => {
		const response = await client
			.get('/settings/security/two-factor')
			.withInertia()
			.loginAs(await createUser({ roles: ['ROLE_ADMIN'] }));

		response.assertStatus(200);
		response.assertInertiaComponent('settings/two-factor/start');
	});

	test('a guarded route inside the enrollment namespace is not redirected', async ({ client }) => {
		const response = await client.get('/__enrollment-probe').loginAs(await createUser({ roles: ['ROLE_ADMIN'] }));

		response.assertStatus(200);
		response.assertBodyContains({ reached: true });
	});

	test('logout is not redirected', async ({ assert }) => {
		const user = await createUser({ roles: ['ROLE_ADMIN'] });

		assert.deepEqual(await run(user, 'POST', '/logout'), { redirected: false, passed: true });
		/** Control: the same context on any other route is redirected. */
		assert.deepEqual(await run(user, 'POST', '/elsewhere'), { redirected: true, passed: false });
		assert.deepEqual(await run(user, 'GET', '/logout'), { redirected: true, passed: false });
	});

	test('a guest is sent to login, not to enrollment', async ({ client }) => {
		const response = await client.get('/__enforced').withInertia();

		response.assertRedirectsTo('/login');
	});
});
