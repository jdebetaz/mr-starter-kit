import { test } from '@japa/runner';
import { truncateBetweenTests } from '#tests/helpers/database';
import { currentCodeFor, enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';
import type User from '#identity/models/user';

const PERIOD_MS = 30_000;

function codeOfThrown(fn: () => unknown): string | undefined {
	try {
		fn();
	} catch (error) {
		return (error as { code?: string }).code;
	}
	return undefined;
}

/** A valid code for the step `stepsAgo` steps before the current one. */
function codeFromStepsAgo(user: User, stepsAgo: number): string {
	return user.createTotp(user.getConfirmedSecret()).generate({ timestamp: Date.now() - stepsAgo * PERIOD_MS });
}

test.group('TOTP login verification', (group) => {
	truncateBetweenTests(group);

	test('a valid code verifies', async ({ assert }) => {
		const user = await enabledUser();
		assert.isTrue(await user.verifyTotpForLogin(currentCodeFor(user)));
	});

	test('the same code cannot be used twice', async ({ assert }) => {
		const user = await enabledUser();
		const code = currentCodeFor(user);
		assert.isTrue(await user.verifyTotpForLogin(code));
		assert.isFalse(await user.verifyTotpForLogin(code));
	});

	test('consuming a code records its timestep and persists it', async ({ assert }) => {
		const user = await enabledUser();
		assert.isTrue(await user.verifyTotpForLogin(currentCodeFor(user)));
		await user.refresh();
		assert.equal(user.totpLastConsumedTimestep, Math.floor(Date.now() / PERIOD_MS));
	});

	test('a code from a consumed timestep is rejected after a later one', async ({ assert }) => {
		const user = await enabledUser();
		const earlier = codeFromStepsAgo(user, 1);
		assert.isTrue(await user.verifyTotpForLogin(currentCodeFor(user)));
		assert.isFalse(await user.verifyTotpForLogin(earlier));
	});

	test('an earlier code still verifies when nothing later was consumed', async ({ assert }) => {
		const user = await enabledUser();
		user.totpLastConsumedTimestep = Math.floor(Date.now() / PERIOD_MS) - 2;
		await user.save();
		assert.isTrue(await user.verifyTotpForLogin(codeFromStepsAgo(user, 1)));
	});

	test('a wrong code is rejected and consumes nothing', async ({ assert }) => {
		const user = await enabledUser();
		const before = user.totpLastConsumedTimestep;
		assert.isFalse(await user.verifyTotpForLogin('000000'));
		assert.equal(user.totpLastConsumedTimestep, before);
	});

	test('a code with spaces or a dash verifies', async ({ assert }) => {
		const spacedUser = await enabledUser();
		const spaced = currentCodeFor(spacedUser);
		assert.isTrue(await spacedUser.verifyTotpForLogin(`${spaced.slice(0, 3)} ${spaced.slice(3)}`));

		const dashedUser = await enabledUser();
		const dashed = currentCodeFor(dashedUser);
		assert.isTrue(await dashedUser.verifyTotpForLogin(`${dashed.slice(0, 3)}-${dashed.slice(3)}`));
	});

	test('normalizeTotpCode strips whitespace and dashes', async ({ assert }) => {
		const user = await createUser();
		assert.equal(user.normalizeTotpCode(' 123 456\t'), '123456');
		assert.equal(user.normalizeTotpCode('123-456'), '123456');
	});

	test('a user without 2FA enabled cannot verify', async ({ assert }) => {
		const user = await createUser();
		assert.isFalse(await user.verifyTotpForLogin('000000'));
	});

	test('a user with only a pending secret cannot verify', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const pendingCode = user.createTotp(user.getEnrollmentSecret()).generate();
		assert.isFalse(await user.verifyTotpForLogin(pendingCode));
	});

	test('the code that enabled 2FA cannot be replayed at login', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const enablingCode = user.createTotp(user.getEnrollmentSecret()).generate();

		assert.isTrue(await user.enableTwoFactor(enablingCode));
		assert.isNotNull(user.totpLastConsumedTimestep);
		assert.isFalse(await user.verifyTotpForLogin(enablingCode));
	});

	test('an unreadable confirmed secret throws instead of reading as not enrolled', async ({ assert }) => {
		const user = await enabledUser();
		user.totpSecret = 'not-a-ciphertext';
		await assert.rejects(() => user.verifyTotpForLogin('123456'), /could not be decrypted/);
		assert.equal(
			codeOfThrown(() => user.getConfirmedSecret()),
			'E_TOTP_SECRET_UNREADABLE',
		);
	});

	test('getConfirmedSecret throws when 2FA is not enabled', async ({ assert }) => {
		const user = await createUser();
		assert.equal(
			codeOfThrown(() => user.getConfirmedSecret()),
			'E_TOTP_NOT_ENABLED',
		);
	});
});
