import { test } from '@japa/runner';
import { challengeLimiter } from '#identity/limiters/challenge_limiter';
import { truncateBetweenTests } from '#tests/helpers/database';
import { currentCodeFor, enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';

function pendingFor(user: User, expiresAt = Date.now() + 60_000) {
	return { pending_login: { userId: user.id, expiresAt } };
}

test.group('Login challenge', (group) => {
	truncateBetweenTests(group);

	test('a password login for a 2FA user parks the id and does not authenticate', async ({ client, assert }) => {
		const user = await enabledUser();

		const login = await client
			.post('/login')
			.withCsrfToken()
			.form({ email: user.email, password: 'password' })
			.redirects(0);

		login.assertStatus(302);
		assert.equal(login.header('location'), '/login/challenge');

		/** The password step parked the id and logged nobody in. */
		login.assertSession('pending_login');
		assert.notProperty(login.session(), 'auth_web');

		/** Replay that exact session into an authenticated page: still turned away. */
		const page = await client.get('/settings/security').withInertia().withSession(login.session()).redirects(0);
		page.assertStatus(302);
		assert.equal(page.header('location'), '/login');

		/** ...while the same session is still recognised as mid-challenge. */
		const challenge = await client.get('/login/challenge').withInertia().withSession(login.session());
		challenge.assertStatus(200);
		challenge.assertInertiaComponent('auth/challenge');
	});

	test('a password login for a user without 2FA still signs in directly', async ({ client }) => {
		const user = await createUser();

		const response = await client.post('/login').withCsrfToken().form({ email: user.email, password: 'password' });

		response.assertRedirectsTo('/');
	});

	test('a wrong password for a 2FA user does not start a challenge', async ({ client }) => {
		const user = await enabledUser();

		const response = await client.post('/login').withCsrfToken().form({ email: user.email, password: 'nope' });

		response.assertRedirectsTo('/login');
	});

	test('the challenge pages redirect to login with no pending marker', async ({ client }) => {
		(await client.get('/login/challenge')).assertRedirectsTo('/login');
		(await client.get('/login/challenge/recovery')).assertRedirectsTo('/login');
	});

	test('the challenge pages render with a pending marker', async ({ client }) => {
		const user = await enabledUser();

		const totp = await client.get('/login/challenge').withInertia().withSession(pendingFor(user));
		totp.assertStatus(200);
		totp.assertInertiaComponent('auth/challenge');

		const recovery = await client.get('/login/challenge/recovery').withInertia().withSession(pendingFor(user));
		recovery.assertStatus(200);
		recovery.assertInertiaComponent('auth/recovery-challenge');
	});

	test('an expired pending marker sends the user back to login', async ({ client }) => {
		const user = await enabledUser();

		const response = await client.get('/login/challenge').withSession(pendingFor(user, Date.now() - 1));

		response.assertRedirectsTo('/login');
	});

	test('a valid code completes the login', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client
			.post('/login/challenge')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: currentCodeFor(user) })
			.redirects(0);

		response.assertStatus(302);
		assert.equal(response.header('location'), '/');

		response.assertSession('auth_web');
		response.assertSessionMissing('pending_login');

		const page = await client.get('/settings/security').withInertia().withSession(response.session()).redirects(0);
		page.assertStatus(200);
		page.assertInertiaComponent('settings/security');
	});

	test('a wrong code keeps the user unauthenticated', async ({ client, assert }) => {
		const user = await enabledUser();

		const response = await client
			.post('/login/challenge')
			.withInertia()
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: '000000' });

		response.assertRedirectsTo('/login/challenge');
		assert.equal(
			response.body().flash.error,
			'That code is not valid. Check your authenticator app and try again.',
		);

		assert.notProperty(response.session(), 'auth_web');
		const page = await client.get('/settings/security').withSession(response.session()).redirects(0);
		assert.equal(page.header('location'), '/login');
	});

	test('a pending login for a user who disabled 2FA is sent back to login', async ({ client }) => {
		const user = await createUser();

		const response = await client
			.post('/login/challenge')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: '123456' });

		response.assertRedirectsTo('/login');
	});

	test('submitting a code with no pending login goes back to login', async ({ client }) => {
		const response = await client.post('/login/challenge').withCsrfToken().form({ code: '123456' });

		response.assertRedirectsTo('/login');
	});

	test('a recovery code completes the login and is consumed', async ({ client, assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.save();
		const before = user.remainingRecoveryCodesCount;

		const response = await client
			.post('/login/challenge/recovery')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code })
			.redirects(0);

		response.assertStatus(302);
		assert.equal(response.header('location'), '/');
		await user.refresh();
		assert.equal(user.remainingRecoveryCodesCount, before - 1);

		response.assertSession('auth_web');
		response.assertSessionMissing('pending_login');

		const page = await client.get('/settings/security').withInertia().withSession(response.session());
		page.assertStatus(200);
	});

	test('a used recovery code is rejected the second time', async ({ client, assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.save();
		const submit = () =>
			client
				.post('/login/challenge/recovery')
				.withInertia()
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code });

		(await submit()).assertRedirectsTo('/');
		const again = await submit();

		again.assertRedirectsTo('/login/challenge/recovery');
		assert.equal(again.body().flash.error, 'That recovery code is not valid or was already used.');
	});

	test('a wrong recovery code stays on the form', async ({ client }) => {
		const user = await enabledUser();
		await user.generateRecoveryCodes();
		await user.save();

		const response = await client
			.post('/login/challenge/recovery')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: 'aaaaa-bbbbb' });

		response.assertRedirectsTo('/login/challenge/recovery');
	});

	test('only a login that leaves two recovery codes or fewer warns', async ({ client, assert }) => {
		const user = await enabledUser();
		const codes = await user.generateRecoveryCodes();
		await user.save();
		const login = async (code: string) =>
			client
				.post('/login/challenge/recovery')
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code })
				.redirects(0);

		/** 10 codes: use 7, leaving 3 (no warning), then the 8th leaves 2 (warning). */
		for (const code of codes.slice(0, 7)) {
			const response = await login(code);
			response.assertFlashMissing('warning');
		}

		const response = await login(codes[7]!);

		assert.match(String(response.flashMessage('warning')), /2 recovery codes left/);
	});

	test('a sixth attempt is throttled before any verification', async ({ client, assert }) => {
		const user = await enabledUser();
		const attempt = (code: string) =>
			client.post('/login/challenge').withInertia().withCsrfToken().withSession(pendingFor(user)).form({ code });

		for (let i = 0; i < 5; i++) {
			const wrong = await attempt('000000');
			wrong.assertRedirectsTo('/login/challenge');
			assert.equal(
				wrong.body().flash.error,
				'That code is not valid. Check your authenticator app and try again.',
			);
		}

		/** A CORRECT code on the sixth try is still refused: verification never ran. */
		const sixth = await attempt(currentCodeFor(user));

		sixth.assertRedirectsTo('/login/challenge');
		assert.match(sixth.body().flash.error, /^Too many attempts\. Try again in \d+ minutes?\.$/);
		await user.refresh();
		assert.isNull(user.totpLastConsumedTimestep);
	});

	test('the recovery endpoint is throttled before any scrypt work', async ({ client, assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.save();
		const before = user.remainingRecoveryCodesCount;

		for (let i = 0; i < 5; i++) {
			await client
				.post('/login/challenge/recovery')
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code: 'aaaaa-bbbbb' });
		}

		const sixth = await client
			.post('/login/challenge/recovery')
			.withInertia()
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code });

		sixth.assertRedirectsTo('/login/challenge/recovery');
		assert.match(sixth.body().flash.error, /^Too many attempts/);
		await user.refresh();
		/** The valid code was not consumed, so no verification ran. */
		assert.equal(user.remainingRecoveryCodesCount, before);
	});

	test('exhausting the TOTP budget leaves the recovery form usable', async ({ client, assert }) => {
		const user = await enabledUser();
		const [code] = await user.generateRecoveryCodes();
		await user.save();

		for (let i = 0; i < 5; i++) {
			await client
				.post('/login/challenge')
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code: '000000' });
		}

		const recovery = await client
			.post('/login/challenge/recovery')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code })
			.redirects(0);

		assert.equal(recovery.header('location'), '/');
		recovery.assertSession('auth_web');
	});

	test('a throttled response carries Retry-After', async ({ client, assert }) => {
		const user = await enabledUser();
		for (let i = 0; i < 5; i++) {
			await client
				.post('/login/challenge')
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code: '000000' });
		}

		const sixth = await client
			.post('/login/challenge')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: '000000' })
			.redirects(0);

		assert.isAbove(Number(sixth.header('retry-after')), 0);
	});

	test('a second IP cannot exhaust the first IP budget', async ({ assert }) => {
		const user = await enabledUser();

		for (let i = 0; i < 5; i++) {
			assert.isTrue((await challengeLimiter.attempt('totp', user.id, '203.0.113.9')).allowed);
		}
		assert.isFalse((await challengeLimiter.attempt('totp', user.id, '203.0.113.9')).allowed);

		/** The attacker's IP is spent; the victim's own IP still has its full budget. */
		assert.isTrue((await challengeLimiter.attempt('totp', user.id, '198.51.100.7')).allowed);
	});

	test('the per-user cap bounds guesses spread across many IPs', async ({ assert }) => {
		const user = await enabledUser();

		for (let ip = 0; ip < 20; ip++) {
			const attempt = await challengeLimiter.attempt('totp', user.id, `192.0.2.${ip}`);
			assert.isTrue(attempt.allowed);
		}

		assert.isFalse((await challengeLimiter.attempt('totp', user.id, '192.0.2.250')).allowed);
	});

	test('a successful login clears the attempt budget', async ({ client, assert }) => {
		const user = await enabledUser();
		for (let i = 0; i < 4; i++) {
			await client
				.post('/login/challenge')
				.withCsrfToken()
				.withSession(pendingFor(user))
				.form({ code: '000000' });
		}

		await client
			.post('/login/challenge')
			.withCsrfToken()
			.withSession(pendingFor(user))
			.form({ code: currentCodeFor(user) });

		assert.deepEqual(await challengeLimiter.attempt('totp', user.id, '127.0.0.1'), { allowed: true });
	});
});
