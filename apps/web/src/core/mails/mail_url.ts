/**
 * Builds an absolute URL for an email. A relative href has no origin to resolve
 * against once a message leaves the app, so every link in a template goes
 * through this.
 *
 * Both sides are normalised: a configured base ending in `/` would otherwise
 * produce `https://example.com//settings`.
 */
export function buildMailUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
