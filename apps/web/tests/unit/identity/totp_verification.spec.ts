import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import { TOTP_PERIOD_SECONDS } from '#core/mixins/with_totp_management';
import User from '#identity/models/user';
import { truncateBetweenTests } from '#tests/helpers/database';
import { currentCodeFor, enabledUser } from '#tests/helpers/two_factor';
import { createUser } from '#tests/helpers/user_factory';

const PERIOD_MS = TOTP_PERIOD_SECONDS * 1000;

/** Runs `fn` with the clock pinned, so a step boundary cannot fall inside it. */
async function atFixedTime<T>(fn: () => Promise<T>): Promise<T> {
	const realNow = Date.now;
	const pinned = realNow();
	Date.now = () => pinned;
	try {
		return await fn();
	} finally {
		Date.now = realNow;
	}
}

function codeOfThrown(fn: () => void): string | undefined {
	try {
		fn();
	} catch (error) {
		// SAFETY: the errors these helpers catch are AdonisJS exceptions, which carry an optional string `code`.
		return (error as { code?: string }).code;
	}

	return undefined;
}

async function codeOfRejected<T>(fn: () => Promise<T>): Promise<string | undefined> {
	try {
		await fn();
	} catch (error) {
		// SAFETY: the errors these helpers catch are AdonisJS exceptions, which carry an optional string `code`.
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
		const accepted = await user.verifyTotpForLogin(currentCodeFor(user));

		assert.isTrue(accepted);
	});

	test('the same code cannot be used twice', async ({ assert }) => {
		const user = await enabledUser();
		const code = currentCodeFor(user);
		const acceptedFirst = await user.verifyTotpForLogin(code);

		assert.isTrue(acceptedFirst);

		const acceptedReplay = await user.verifyTotpForLogin(code);

		assert.isFalse(acceptedReplay);
	});

	test('consuming a code records its timestep and persists it', async ({ assert }) => {
		const user = await enabledUser();
		const stepBefore = Math.floor(Date.now() / PERIOD_MS);
		const accepted = await user.verifyTotpForLogin(currentCodeFor(user));

		assert.isTrue(accepted);
		await user.refresh();
		assert.oneOf(user.totpLastConsumedTimestep, [stepBefore, stepBefore + 1]);
	});

	test('a code from a consumed timestep is rejected after a later one', async ({ assert }) => {
		const user = await enabledUser();
		await atFixedTime(async () => {
			const earlier = codeFromStepsAgo(user, 1);
			const acceptedLater = await user.verifyTotpForLogin(currentCodeFor(user));

			assert.isTrue(acceptedLater);

			const rejectedEarlier = await user.verifyTotpForLogin(earlier);

			assert.isFalse(rejectedEarlier);
		});
	});

	test('an earlier code still verifies when nothing later was consumed', async ({ assert }) => {
		const user = await enabledUser();
		await atFixedTime(async () => {
			user.totpLastConsumedTimestep = Math.floor(Date.now() / PERIOD_MS) - 2;
			await user.save();
			const accepted = await user.verifyTotpForLogin(codeFromStepsAgo(user, 1));

			assert.isTrue(accepted);
		});
	});

	test('a wrong code is rejected and consumes nothing', async ({ assert }) => {
		const user = await enabledUser();
		const before = user.totpLastConsumedTimestep;
		const rejected = await user.verifyTotpForLogin('000000');

		assert.isFalse(rejected);
		assert.equal(user.totpLastConsumedTimestep, before);
	});

	test('a code with spaces or a dash verifies', async ({ assert }) => {
		const spacedUser = await enabledUser();
		const spaced = currentCodeFor(spacedUser);
		const acceptedSpaced = await spacedUser.verifyTotpForLogin(`${spaced.slice(0, 3)} ${spaced.slice(3)}`);

		assert.isTrue(acceptedSpaced);

		const dashedUser = await enabledUser();
		const dashed = currentCodeFor(dashedUser);
		const acceptedDashed = await dashedUser.verifyTotpForLogin(`${dashed.slice(0, 3)}-${dashed.slice(3)}`);

		assert.isTrue(acceptedDashed);
	});

	test('a code with spaces or a dash confirms enrollment', async ({ assert }) => {
		for (const separator of [' ', '-']) {
			const user = await createUser();
			await user.generateSecret();
			const code = user.createTotp(user.getEnrollmentSecret()).generate();
			const enabled = await user.enableTwoFactor(`${code.slice(0, 3)}${separator}${code.slice(3)}`);

			assert.isTrue(enabled);
			assert.isTrue(user.isTwoFactorEnabled);
		}
	});

	test('normalizeTotpCode strips whitespace and dashes', async ({ assert }) => {
		const user = await createUser();
		assert.equal(user.normalizeTotpCode(' 123 456\t'), '123456');
		assert.equal(user.normalizeTotpCode('123-456'), '123456');
	});

	test('a user without 2FA enabled cannot verify', async ({ assert }) => {
		const user = await createUser();
		const rejected = await user.verifyTotpForLogin('000000');

		assert.isFalse(rejected);
	});

	test('a user with only a pending secret cannot verify', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const pendingCode = user.createTotp(user.getEnrollmentSecret()).generate();
		const rejected = await user.verifyTotpForLogin(pendingCode);

		assert.isFalse(rejected);
	});

	test('the code that enabled 2FA cannot be replayed at login', async ({ assert }) => {
		const user = await createUser();
		await user.generateSecret();
		const enablingCode = user.createTotp(user.getEnrollmentSecret()).generate();

		const enabled = await user.enableTwoFactor(enablingCode);

		assert.isTrue(enabled);
		assert.isNotNull(user.totpLastConsumedTimestep);

		const replayAccepted = await user.verifyTotpForLogin(enablingCode);

		assert.isFalse(replayAccepted);
	});

	test('an unreadable confirmed secret throws instead of reading as not enrolled', async ({ assert }) => {
		const user = await enabledUser();
		await db.from('users').where('id', user.id).update({ totp_secret: 'not-a-ciphertext' });

		// The column decrypts on read, so the failure now lands at load time: no
		// login path can get hold of a user whose secret is unreadable and treat
		// that user as not enrolled.
		await assert.rejects(() => User.findOrFail(user.id), /could not be decrypted/);
		const rejectionCode = await codeOfRejected(() => User.findOrFail(user.id));

		assert.equal(rejectionCode, 'E_ENCRYPTED_COLUMN_UNREADABLE');
	});

	test('getConfirmedSecret throws when 2FA is not enabled', async ({ assert }) => {
		const user = await createUser();
		assert.equal(
			codeOfThrown(() => user.getConfirmedSecret()),
			'E_TOTP_NOT_ENABLED',
		);
	});
});
