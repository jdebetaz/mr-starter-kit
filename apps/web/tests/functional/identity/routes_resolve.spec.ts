import { test } from '@japa/runner';

test.group('identity routes', () => {
	test('the login page renders through the generated controller map', async ({ client }) => {
		const response = await client.get('/login').withInertia();

		response.assertStatus(200);
		response.assertInertiaComponent('auth/login');
	});
});
