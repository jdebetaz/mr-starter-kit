import vine from '@vinejs/vine';
import { isDisposableEmailDomain } from 'disposable-email-domains-js';

export interface NonDisposableOptions {
	/** Domains to accept even though the bundled list calls them disposable. */
	allow?: string[];

	/** Domains to treat as disposable in addition to the bundled list. */
	block?: string[];
}

/**
 * Normalizes a domain for comparison: lowercase, and without the trailing dot
 * that makes a hostname fully qualified. Without this, `Mailinator.COM` and
 * `mailinator.com.` would both slip past a list that holds `mailinator.com`.
 */
const normalizeDomain = (domain: string): string => domain.trim().toLowerCase().replace(/\.$/, '');

/**
 * True when `domain` is `candidate` or a subdomain of it. Compared on label
 * boundaries rather than with `endsWith`, so `xmailinator.com` is not treated
 * as part of `mailinator.com`.
 */
const isAtOrUnder = (domain: string, candidate: string): boolean =>
	domain === candidate || domain.endsWith(`.${candidate}`);

const matchesAny = (domain: string, domains: string[]): boolean =>
	domains.some((candidate) => isAtOrUnder(domain, normalizeDomain(candidate)));

/**
 * Walks up the labels of a domain, so a subdomain of a listed provider is
 * rejected too. The bundled list only holds registrable domains and matches
 * them exactly, so `inbox.mailinator.com` would otherwise pass.
 */
const isListedOrUnderListed = (domain: string): boolean => {
	const labels = domain.split('.');

	for (let index = 0; index < labels.length - 1; index += 1) {
		if (isDisposableEmailDomain(labels.slice(index).join('.'))) {
			return true;
		}
	}

	return false;
};

/**
 * Rejects an address at a disposable (temporary) email provider. Chain it
 * after `email()`, so only well-formed addresses are looked up.
 *
 * It makes no outgoing request: the list ships with the
 * `disposable-email-domains-js` package.
 *
 * ```ts
 * vine.string().email().use(nonDisposable({ allow: ['mailinator.com'] }));
 * ```
 */
export const nonDisposable = vine.createRule<NonDisposableOptions | undefined>((value, options, field) => {
	if (!field.isValid) {
		return;
	}

	const domain = normalizeDomain(String(value).split('@').pop() ?? '');

	if (domain === '') {
		return;
	}

	/** An explicit allow wins over both the bundled list and `block`. */
	if (options?.allow && matchesAny(domain, options.allow)) {
		return;
	}

	const blocked = (options?.block && matchesAny(domain, options.block)) || isListedOrUnderListed(domain);

	if (blocked) {
		field.report('Disposable email addresses are not allowed', 'nonDisposableDomain', field);
	}
});
