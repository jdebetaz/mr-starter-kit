import app from '@adonisjs/core/services/app';
import { test } from '@japa/runner';
import vine from '@vinejs/vine';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';
import { uncompromised } from '#core/validation/rules/uncompromised';
import { validationErrors } from '#tests/helpers/validation';

/** SHA-1 of "password", which every prefix fixture below is built from. */
const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

/** A fetch that answers every range request with one body. */
const respondWith = (body: string, status = 200) => {
	const calls: string[] = [];
	const fetchImpl = async (url: string | URL) => {
		calls.push(String(url));
		return new Response(body, { status });
	};
	return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
};

/** Swaps a verifier into the container for the duration of one test. */
const withVerifier = async (verify: PwnedPasswordsVerifier['verify'], run: () => Promise<void>) => {
	app.container.swap(PwnedPasswordsVerifier, () => ({ verify }) as PwnedPasswordsVerifier);
	try {
		await run();
	} finally {
		app.container.restore(PwnedPasswordsVerifier);
	}
};

test.group('Uncompromised rule', () => {
	test('a leaked password above the threshold is rejected', async ({ assert }) => {
		await withVerifier(
			async () => 12,
			async () => {
				const validator = vine.create({ password: vine.string().use(uncompromised()) });

				const errors = await validationErrors(validator, { password: 'password' });

				assert.includeMembers(
					errors.map((error) => error.rule),
					['uncompromisedPassword'],
				);
			},
		);
	});

	test('a password at or below the threshold passes', async ({ assert }) => {
		await withVerifier(
			async () => 3,
			async () => {
				const validator = vine.create({ password: vine.string().use(uncompromised({ threshold: 3 })) });

				const errors = await validationErrors(validator, { password: 'password' });

				assert.lengthOf(errors, 0);
			},
		);
	});

	test('the check is skipped when the field already failed an earlier rule', async ({ assert }) => {
		let called = false;

		await withVerifier(
			async () => {
				called = true;
				return 99;
			},
			async () => {
				const validator = vine.create({
					password: vine.string().minLength(50).use(uncompromised()),
				});

				await validationErrors(validator, { password: 'short' });

				assert.isFalse(called);
			},
		);
	});
});

test.group('Pwned passwords verifier', () => {
	test('the container resolves it without any provider binding', async ({ assert }) => {
		/**
		 * The class is its own seam: it constructs with a default fetch, so the
		 * container builds it unaided and `swap` replaces it in tests. A provider
		 * that bound it to `new PwnedPasswordsVerifier()` would be a no-op.
		 */
		const verifier = await app.container.make(PwnedPasswordsVerifier);

		assert.instanceOf(verifier, PwnedPasswordsVerifier);
	});

	test('a leak count is read from the matching suffix line', async ({ assert }) => {
		const { fetchImpl } = respondWith(`${PASSWORD_SUFFIX}:12\nAAAA:1`);
		const verifier = new PwnedPasswordsVerifier(fetchImpl);

		assert.equal(await verifier.verify('password', 5000), 12);
	});

	test('an absent suffix reports zero', async ({ assert }) => {
		const { fetchImpl } = respondWith('0000000000000000000000000000000000A:5');
		const verifier = new PwnedPasswordsVerifier(fetchImpl);

		assert.equal(await verifier.verify('password', 5000), 0);
	});

	test('a malformed 200 response fails open', async ({ assert }) => {
		const bodies = ['', 'no-colon-anywhere', `${PASSWORD_SUFFIX}:not-a-number`];

		for (const body of bodies) {
			const { fetchImpl } = respondWith(body);
			const verifier = new PwnedPasswordsVerifier(fetchImpl);

			assert.equal(await verifier.verify('password', 5000), 0, `body: ${JSON.stringify(body)}`);
		}
	});

	test('a non-2xx response fails open', async ({ assert }) => {
		const { fetchImpl } = respondWith('server error', 500);
		const verifier = new PwnedPasswordsVerifier(fetchImpl);

		assert.equal(await verifier.verify('password', 5000), 0);
	});

	test('a network failure or timeout fails open', async ({ assert }) => {
		const rejecting = (async () => {
			throw new Error('aborted');
		}) as unknown as typeof fetch;
		const verifier = new PwnedPasswordsVerifier(rejecting);

		assert.equal(await verifier.verify('password', 5000), 0);
	});

	test('only the first five hash characters are sent', async ({ assert }) => {
		const { calls, fetchImpl } = respondWith('');
		const verifier = new PwnedPasswordsVerifier(fetchImpl);

		await verifier.verify('password', 5000);

		assert.lengthOf(calls, 1);
		assert.match(calls[0], /\/range\/[0-9A-F]{5}$/);

		/**
		 * Checked against the path, not the whole URL: the host is
		 * api.pwnedpasswords.com, which contains the word "password" itself.
		 */
		const { pathname, search } = new URL(calls[0]);
		assert.notInclude(pathname + search, 'password');
		assert.notInclude(pathname + search, PASSWORD_SUFFIX);
	});

	test('a non-ASCII password hashes its UTF-8 bytes', async ({ assert }) => {
		const { calls, fetchImpl } = respondWith('');
		const verifier = new PwnedPasswordsVerifier(fetchImpl);

		await verifier.verify('pässwörd🔐', 5000);

		/** SHA-1 of the UTF-8 encoding of "pässwörd🔐" begins 533D4. */
		assert.isTrue(calls[0].endsWith('/range/533D4'));
	});
});
