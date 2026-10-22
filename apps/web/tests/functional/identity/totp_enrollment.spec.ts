import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';

async function pendingUser(): Promise<User> {
	const user = await createUser();
	await user.generateSecret();
	return user;
}

test.group('TOTP enrollment', (group) => {
	truncateBetweenTests(group);

	test('starting enrollment stores a pending secret and redirects to verify', async ({ client, assert }) => {
		const user = await createUser();

		const response = await client.post('/settings/security/two-factor').loginAs(user).withCsrfToken();

		response.assertRedirectsTo('/settings/security/two-factor/verify');
		await user.refresh();
		assert.isTrue(user.hasPendingTwoFactor);
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('the start page does not generate a secret', async ({ client, assert }) => {
		const user = await createUser();

		const response = await client.get('/settings/security/two-factor').withInertia().loginAs(user);

		response.assertStatus(200);
		response.assertInertiaComponent('settings/two-factor/start');
		await user.refresh();
		assert.isFalse(user.hasPendingTwoFactor);
	});

	test('the verify page shows a QR code and the manual secret without rotating it', async ({ client, assert }) => {
		const user = await pendingUser();
		const secret = user.getEnrollmentSecret();

		const response = await client.get('/settings/security/two-factor/verify').withInertia().loginAs(user);

		response.assertStatus(200);
		response.assertInertiaComponent('settings/two-factor/verify');
		assert.match(response.inertiaProps.qrCode, /^data:image\//);
		assert.equal(response.inertiaProps.manualSecret, secret);
		await user.refresh();
		assert.equal(user.getEnrollmentSecret(), secret);
	});

	test('the verify page sends a user with no pending secret back to the start', async ({ client }) => {
		const user = await createUser();

		const response = await client.get('/settings/security/two-factor/verify').withInertia().loginAs(user);

		response.assertRedirectsTo('/settings/security/two-factor');
	});

	test('a wrong code goes back to verify with an error and does not enable 2FA', async ({ client, assert }) => {
		const user = await pendingUser();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.withInertia()
			.loginAs(user)
			.withCsrfToken()
			.form({ code: '000000' });

		response.assertRedirectsTo('/settings/security/two-factor/verify');
		assert.equal(response.body().flash.error, 'That code is not valid. Check your authenticator app and try again.');
		await user.refresh();
		assert.isFalse(user.isTwoFactorEnabled);
		assert.isTrue(user.hasPendingTwoFactor);
	});

	test('a malformed code is rejected by validation', async ({ client, assert }) => {
		const user = await pendingUser();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.withInertia()
			.header('referer', '/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code: '12' });

		response.assertRedirectsTo('/settings/security/two-factor/verify');
		assert.isDefined(response.inertiaProps.errors.code);
		await user.refresh();
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('a valid code enables 2FA and redirects to the recovery codes', async ({ client, assert }) => {
		const user = await pendingUser();
		const code = user.createTotp(user.getEnrollmentSecret()).generate();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code });

		response.assertRedirectsTo('/settings/security/two-factor/recovery');
		await user.refresh();
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('confirming without having started sends the user back to step one', async ({ client, assert }) => {
		const user = await createUser();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code: '123456' });

		response.assertRedirectsTo('/settings/security/two-factor');
		await user.refresh();
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('confirming enrollment hands off to the recovery page, which mints ten codes', async ({ client, assert }) => {
		const user = await pendingUser();
		const code = user.createTotp(user.getEnrollmentSecret()).generate();

		const confirm = await client
			.post('/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code })
			.redirects(0);
		confirm.assertSession('recovery_codes_grant');

		const response = await client
			.get('/settings/security/two-factor/recovery')
			.withInertia()
			.loginAs(user)
			.withSession(confirm.session());

		response.assertStatus(200);
		response.assertInertiaComponent('settings/two-factor/recovery');
		assert.lengthOf(response.inertiaProps.codes, 10);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, 10);
	});

	test('the enrollment grant is single-use', async ({ client, assert }) => {
		const user = await enabledUser();
		const grant = { recovery_codes_grant: { expiresAt: Date.now() + 60_000, userId: user.id } };

		const first = await client
			.get('/settings/security/two-factor/recovery')
			.withInertia()
			.loginAs(user)
			.withSession(grant);
		assert.lengthOf(first.inertiaProps.codes, 10);
		await user.refresh();
		const minted = user.recoveryCodes?.release();

		const second = await client
			.get('/settings/security/two-factor/recovery')
			.withInertia()
			.loginAs(user)
			.withSession(first.session());
		assert.isNull(second.inertiaProps.codes);
		assert.equal(second.inertiaProps.remaining, 10);
		await user.refresh();
		assert.equal(user.recoveryCodes?.release(), minted);
	});

	test('a grant minted for another user does not let this user mint, and leaves their codes unchanged', async ({
		client,
		assert,
	}) => {
		const userA = await enabledUser();
		const userB = await enabledUser();
		const saved = await userB.generateRecoveryCodes();
		await userB.refresh();
		const before = userB.recoveryCodes?.release();

		const response = await client
			.get('/settings/security/two-factor/recovery')
			.withInertia()
			.loginAs(userB)
			.withSession({ recovery_codes_grant: { expiresAt: Date.now() + 60_000, userId: userA.id } });

		assert.isNull(response.inertiaProps.codes);
		await userB.refresh();
		assert.equal(userB.recoveryCodes?.release(), before);
		assert.equal(userB.remainingRecoveryCodesCount, 10);
		assert.isTrue(await userB.verifyRecoveryCode(saved[0]));
	});

	test('an expired grant does not mint', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client
			.get('/settings/security/two-factor/recovery')
			.withInertia()
			.loginAs(user)
			.withSession({ recovery_codes_grant: { expiresAt: Date.now() - 1 } });

		assert.isNull(response.inertiaProps.codes);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, 0);
	});

	test('the recovery page without a grant does not mint for a user with no codes', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client.get('/settings/security/two-factor/recovery').withInertia().loginAs(user);

		response.assertStatus(200);
		assert.isNull(response.inertiaProps.codes);
		assert.equal(response.inertiaProps.remaining, 0);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, 0);
	});

	test('visiting the recovery page again does not revoke existing codes', async ({ client, assert }) => {
		const user = await enabledUser();
		const saved = await user.generateRecoveryCodes();

		const response = await client.get('/settings/security/two-factor/recovery').withInertia().loginAs(user);

		response.assertStatus(200);
		assert.isNull(response.inertiaProps.codes);
		assert.equal(response.inertiaProps.remaining, 10);
		await user.refresh();
		assert.isTrue(await user.verifyRecoveryCode(saved[0]));
	});

	test('a GET on the regenerate path redirects to the recovery page', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client.get('/settings/security/two-factor/recovery/regenerate').loginAs(user).redirects(0);

		response.assertStatus(302);
		assert.equal(response.header('location'), '/settings/security/two-factor/recovery');
	});

	test('regenerating replaces the codes and returns the new ones directly', async ({ client, assert }) => {
		const user = await enabledUser();
		const saved = await user.generateRecoveryCodes();

		const response = await client
			.post('/settings/security/two-factor/recovery/regenerate')
			.withInertia()
			.loginAs(user)
			.withCsrfToken()
			.form({ password: 'password' });

		response.assertStatus(200);
		assert.lengthOf(response.inertiaProps.codes, 10);
		assert.notIncludeMembers(response.inertiaProps.codes, saved);
		await user.refresh();
		assert.isFalse(await user.verifyRecoveryCode(saved[0]));
		assert.isTrue(await user.verifyRecoveryCode(response.inertiaProps.codes[0]));
	});

	test('a wrong password does not regenerate and leaves existing codes valid', async ({ client, assert }) => {
		const user = await enabledUser();
		const saved = await user.generateRecoveryCodes();

		const response = await client
			.post('/settings/security/two-factor/recovery/regenerate')
			.withInertia()
			.loginAs(user)
			.withCsrfToken()
			.form({ password: 'not-the-password' });

		response.assertRedirectsTo('/settings/security/two-factor/recovery');
		assert.equal(response.body().flash.error, 'That password is not correct.');
		assert.isNull(response.inertiaProps.codes);
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, 10);
		assert.isTrue(await user.verifyRecoveryCode(saved[0]));
	});

	test('a repeated confirm after 2FA is on goes to the recovery step, not step one', async ({ client }) => {
		const user = await enabledUser();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code: '123456' });

		response.assertRedirectsTo('/settings/security/two-factor/recovery');
	});

	test('a code with a space or dash separator is accepted', async ({ client, assert }) => {
		const user = await pendingUser();
		const code = user.createTotp(user.getEnrollmentSecret()).generate();

		const response = await client
			.post('/settings/security/two-factor/verify')
			.loginAs(user)
			.withCsrfToken()
			.form({ code: `${code.slice(0, 3)} ${code.slice(3)}` });

		response.assertRedirectsTo('/settings/security/two-factor/recovery');
		await user.refresh();
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('the recovery page sends a user without 2FA back to the start', async ({ client }) => {
		const user = await createUser();

		const response = await client.get('/settings/security/two-factor/recovery').withInertia().loginAs(user);

		response.assertRedirectsTo('/settings/security/two-factor');
	});

	test('acknowledging the recovery codes redirects to the settings page', async ({ client }) => {
		const user = await enabledUser();

		const response = await client.post('/settings/security/two-factor/recovery').loginAs(user).withCsrfToken();

		response.assertRedirectsTo('/settings/security');
	});

	test('a user who does not require 2FA can disable it with the right password', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client
			.post('/settings/security/two-factor/disable')
			.loginAs(user)
			.withCsrfToken()
			.form({ password: 'password' });

		response.assertRedirectsTo('/settings/security');
		await user.refresh();
		assert.isFalse(user.isTwoFactorEnabled);
	});

	test('a wrong password does not disable 2FA', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client
			.post('/settings/security/two-factor/disable')
			.withInertia()
			.loginAs(user)
			.withCsrfToken()
			.form({ password: 'not-the-password' });

		response.assertRedirectsTo('/settings/security');
		assert.equal(response.body().flash.error, 'That password is not correct.');
		await user.refresh();
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('an admin cannot disable 2FA even with the correct password', async ({ client, assert }) => {
		const user = await enabledUser({ roles: ['ROLE_ADMIN'] });

		const response = await client
			.post('/settings/security/two-factor/disable')
			.withInertia()
			.loginAs(user)
			.withCsrfToken()
			.form({ password: 'password' });

		response.assertRedirectsTo('/settings/security');
		assert.equal(response.body().flash.error, 'Two-factor authentication is required for your account.');
		await user.refresh();
		assert.isTrue(user.isTwoFactorEnabled);
	});

	test('a guest cannot start enrollment', async ({ client }) => {
		const response = await client.post('/settings/security/two-factor').withCsrfToken();

		response.assertRedirectsTo('/login');
	});
});
