import { createHash } from 'node:crypto';

const RANGE_ENDPOINT = 'https://api.pwnedpasswords.com/range';

/** How many leading hash characters identify the range. The rest never leaves. */
const PREFIX_LENGTH = 5;

/**
 * Counts how many times a password appears in known data leaks, using the
 * k-anonymity model offered by Have I Been Pwned.
 *
 * The password, and its complete hash, never leave this process. The hash is
 * computed locally, only its first five characters are sent, and the response
 * — every leaked hash sharing that prefix — is compared here.
 *
 * **It fails open.** A timeout, a network error, a non-2xx response or a body
 * it cannot parse all report `0`, which reads as "not compromised". That is a
 * deliberate trade: an outage at a third party must not stop people signing up
 * or resetting a password. The cost is that during an outage a leaked password
 * is accepted, so this rule is a safety net over a password policy, never a
 * replacement for one.
 */
export class PwnedPasswordsVerifier {
	/** The fetch implementation, injectable so tests never reach the network. */
	#fetch: typeof fetch;

	constructor(fetchImpl: typeof fetch = globalThis.fetch) {
		this.#fetch = fetchImpl;
	}

	async verify(password: string, timeout: number): Promise<number> {
		const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
		const prefix = hash.slice(0, PREFIX_LENGTH);
		const suffix = hash.slice(PREFIX_LENGTH);

		try {
			const response = await this.#fetch(`${RANGE_ENDPOINT}/${prefix}`, {
				signal: AbortSignal.timeout(timeout),
			});

			if (!response.ok) {
				return 0;
			}

			return this.#countFor(suffix, await response.text());
		} catch {
			/** Any failure reads as "not compromised" — see the class comment. */
			return 0;
		}
	}

	/**
	 * Finds the suffix among the returned lines. A line that is missing its
	 * separator, or whose count is not a number, is ignored rather than trusted.
	 */
	#countFor(suffix: string, body: string): number {
		for (const line of body.split('\n')) {
			const [candidate, count] = line.trim().split(':');

			if (candidate !== suffix) {
				continue;
			}

			const occurrences = Number.parseInt(count, 10);

			return Number.isNaN(occurrences) ? 0 : occurrences;
		}

		return 0;
	}
}
