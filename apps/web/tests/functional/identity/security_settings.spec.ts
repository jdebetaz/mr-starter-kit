import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

test.group('Security settings page', (group) => {
	truncateBetweenTests(group);

	test('the page reports 2FA off for a new user', async ({ client, assert }) => {
		const user = await createUser();

		const response = await client.get('/settings/security').withInertia().loginAs(user);

		response.assertStatus(200);
		response.assertInertiaComponent('settings/security');
		assert.isFalse(response.inertiaProps.status.enabled);
		assert.isFalse(response.inertiaProps.status.required);
	});

	test('the page reports the requirement for an admin', async ({ client, assert }) => {
		const admin = await createUser({ roles: ['ROLE_ADMIN'] });

		const response = await client.get('/settings/security').withInertia().loginAs(admin);

		response.assertStatus(200);
		assert.isTrue(response.inertiaProps.status.required);
		assert.isFalse(response.inertiaProps.status.canDisable);
	});

	test('an enabled user can disable when 2FA is not required', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client.get('/settings/security').withInertia().loginAs(user);

		assert.isTrue(response.inertiaProps.status.enabled);
		assert.isTrue(response.inertiaProps.status.canDisable);
		assert.isString(response.inertiaProps.status.enabledAt);
	});

	test('an enabled user sees the remaining recovery code count', async ({ client, assert }) => {
		const user = await enabledUser();
		const codes = await user.generateRecoveryCodes();
		assert.isTrue(await user.verifyRecoveryCode(codes[0]));

		const response = await client.get('/settings/security').withInertia().loginAs(user);

		assert.equal(response.inertiaProps.status.remainingRecoveryCodes, 9);
	});

	test('a guest is redirected to login', async ({ client }) => {
		const response = await client.get('/settings/security');

		response.assertRedirectsTo('/login');
	});
});
