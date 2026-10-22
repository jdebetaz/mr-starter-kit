import { test } from '@japa/runner';
import twoFactorConfig from '#config/two_factor';
import SignIn from '#identity/actions/sign_in';
import VerifyRecoveryChallenge from '#identity/actions/verify_recovery_challenge';
import VerifyTotpChallenge from '#identity/actions/verify_totp_challenge';
import UserRepository from '#identity/repositories/user_repository';
import { PendingLogin } from '#identity/services/pending_login';
import { truncateBetweenTests } from '#tests/helpers/database';
import { currentCodeFor, enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';
import type { UUID } from '#core/types';
import type { Session } from '@adonisjs/session';

/** Runs `fn` with the clock pinned, then restores it. */
async function atFixedTime<T>(at: number, fn: () => Promise<T> | T): Promise<T> {
	const realNow = Date.now;
	Date.now = () => at;
	try {
		return await fn();
	} finally {
		Date.now = realNow;
	}
}

/** The three session methods PendingLogin uses, backed by a Map. */
function fakeSession(): Session {
	const store = new Map<string, unknown>();
	return {
		get: (key: string) => store.get(key),
		put: (key: string, value: unknown) => void store.set(key, value),
		forget: (key: string) => void store.delete(key),
	} as unknown as Session;
}

test.group('SignIn', (group) => {
	truncateBetweenTests(group);
	const signIn = new SignIn(new UserRepository());

	test('SignIn reports that a challenge is required', async ({ assert }) => {
		const user = await enabledUser();
		const result = await signIn.execute({ email: user.email, password: 'password' });
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.isTrue(result.value.challengeRequired);
	});

	test('SignIn reports no challenge for a user without 2FA', async ({ assert }) => {
		const user = await createUser();
		const result = await signIn.execute({ email: user.email, password: 'password' });
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.isFalse(result.value.challengeRequired);
	});
});

test.group('VerifyTotpChallenge', (group) => {
	truncateBetweenTests(group);
	const action = new VerifyTotpChallenge(new UserRepository());

	test('a missing pending login reports no_pending_login', async ({ assert }) => {
		const result = await action.execute({ userId: null, code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'no_pending_login');
	});

	test('a pending login for a deleted user reports not_challengeable', async ({ assert }) => {
		const user = await enabledUser();
		const id = user.id;
		await user.delete();
		const result = await action.execute({ userId: id, code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'not_challengeable');
	});

	test('a pending login for a user who disabled 2FA reports not_challengeable', async ({ assert }) => {
		const user = await enabledUser();
		await user.disableTwoFactor();
		const result = await action.execute({ userId: user.id, code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'not_challengeable');
	});

	test('a wrong code reports invalid_code', async ({ assert }) => {
		const user = await enabledUser();
		const result = await action.execute({ userId: user.id, code: '000000' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'invalid_code');
	});

	test('a valid code resolves the challenge', async ({ assert }) => {
		const user = await enabledUser();
		const result = await action.execute({ userId: user.id, code: currentCodeFor(user) });
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.equal(result.value.id, user.id);
	});
});

test.group('VerifyRecoveryChallenge', (group) => {
	truncateBetweenTests(group);
	const action = new VerifyRecoveryChallenge(new UserRepository());

	test('a missing pending login reports no_pending_login', async ({ assert }) => {
		const result = await action.execute({ userId: null, code: 'AAAA-BBBB' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'no_pending_login');
	});

	test('a user who disabled 2FA reports not_challengeable', async ({ assert }) => {
		const user = await enabledUser();
		await user.disableTwoFactor();
		const result = await action.execute({ userId: user.id, code: 'AAAA-BBBB' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'not_challengeable');
	});

	test('an unknown recovery code reports invalid_recovery_code', async ({ assert }) => {
		const user = await enabledUser();
		const result = await action.execute({ userId: user.id, code: 'AAAA-BBBB' });
		assert.isFalse(result.ok);

		if (result.ok) {
			return;
		}
		assert.equal(result.error.type, 'invalid_recovery_code');
	});

	test('a recovery challenge reports the remaining count', async ({ assert }) => {
		const user = await enabledUser();
		const [first] = await user.generateRecoveryCodes();
		const result = await action.execute({ userId: user.id, code: first });
		assert.isTrue(result.ok);

		if (!result.ok) {
			return;
		}
		assert.equal(result.value.remainingCodes, 9);
	});
});

test.group('PendingLogin', () => {
	const id = '11111111-1111-4111-8111-111111111111' as UUID;

	test('peek leaves the marker and take removes it', ({ assert }) => {
		const session = fakeSession();
		PendingLogin.put(session, id);
		assert.equal(PendingLogin.peek(session), id);
		assert.equal(PendingLogin.peek(session), id);
		assert.equal(PendingLogin.take(session), id);
		assert.isNull(PendingLogin.take(session));
	});

	test('an expired marker reads as absent', async ({ assert }) => {
		const session = fakeSession();
		const start = Date.now();
		await atFixedTime(start, () => PendingLogin.put(session, id));

		const justBefore = start + twoFactorConfig.pendingLoginTtl * 1000 - 1;
		await atFixedTime(justBefore, () => assert.equal(PendingLogin.peek(session), id));

		const expired = start + twoFactorConfig.pendingLoginTtl * 1000;
		await atFixedTime(expired, () => {
			assert.isNull(PendingLogin.peek(session));
			assert.isNull(PendingLogin.take(session));
		});
	});

	test('an expired marker is cleared, not merely hidden', async ({ assert }) => {
		const session = fakeSession();
		const start = Date.now();
		await atFixedTime(start, () => PendingLogin.put(session, id));
		await atFixedTime(start + twoFactorConfig.pendingLoginTtl * 1000, () => PendingLogin.peek(session));
		// Back inside the original window the marker must still be gone.
		await atFixedTime(start, () => assert.isNull(PendingLogin.peek(session)));
	});
});
