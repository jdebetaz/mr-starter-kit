import { AssertionError } from 'node:assert';
import { PwnedPasswordsVerifier } from '#core/validation/pwned_passwords_verifier';
import type { Container } from '@adonisjs/core/container';
import type { ContainerBindings } from '@adonisjs/core/types';

/**
 * Stands in for the real leak lookup so a suite is neither slow nor dependent
 * on a third party. It never makes a network request: every password is
 * uncompromised unless you mark it.
 *
 * It deliberately lives under `tests/`, not in `app/`, because nothing the
 * server runs should be able to reach a test double that reports every
 * password clean.
 *
 * ```ts
 * const pwned = fakePwnedPasswords(app.container).leaked('secret123', 12);
 * // ...
 * pwned.restore();
 * ```
 */
export class FakePwnedPasswords {
	#counts = new Map<string, number>();
	#everything: number | null = null;
	#outage = false;
	#verified: string[] = [];
	#container: Container<ContainerBindings>;

	constructor(container: Container<ContainerBindings>) {
		this.#container = container;
	}

	/** Marks one password as leaked, optionally the number of times it was seen. */
	leaked(password: string, count = 1): this {
		this.#counts.set(password, count);
		return this;
	}

	/** Marks every password as leaked. Passwords marked individually keep their own count. */
	leakedAll(count = 1): this {
		this.#everything = count;
		return this;
	}

	/**
	 * Simulates the leak database being unreachable. Like the real verifier,
	 * every password then reads as uncompromised — including ones marked leaked,
	 * because that is exactly what failing open means.
	 */
	simulateOutage(): this {
		this.#outage = true;
		return this;
	}

	async verify(password: string, _timeout: number): Promise<number> {
		this.#verified.push(password);

		if (this.#outage) {
			return 0;
		}

		return this.#counts.get(password) ?? this.#everything ?? 0;
	}

	/** Asserts the password was checked against the leak database. */
	assertVerified(password: string): void {
		if (!this.#verified.includes(password)) {
			throw new AssertionError({
				message: `Expected ${JSON.stringify(password)} to have been checked for leaks, but it was not`,
				actual: this.#verified,
				expected: [password],
			});
		}
	}

	/**
	 * Asserts nothing was checked. Useful for proving the lookup is skipped when
	 * a password already failed a cheaper rule.
	 */
	assertNoneVerified(): void {
		if (this.#verified.length > 0) {
			throw new AssertionError({
				message: `Expected no password to be checked for leaks, but ${this.#verified.length} was/were`,
				actual: this.#verified,
				expected: [],
			});
		}
	}

	/** Puts the real verifier back and forgets everything this fake recorded. */
	restore(): void {
		this.#container.restore(PwnedPasswordsVerifier);
		this.#counts.clear();
		this.#everything = null;
		this.#outage = false;
		this.#verified = [];
	}
}

/**
 * Swaps a {@link FakePwnedPasswords} into the container in place of the real
 * verifier, and returns it so the test can mark passwords and assert on what
 * was checked. Call `restore()` when the test finishes.
 */
export function fakePwnedPasswords(container: Container<ContainerBindings>): FakePwnedPasswords {
	const fake = new FakePwnedPasswords(container);

	container.swap(PwnedPasswordsVerifier, () => fake as unknown as PwnedPasswordsVerifier);

	return fake;
}
