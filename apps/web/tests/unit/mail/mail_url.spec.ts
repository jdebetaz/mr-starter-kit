import { test } from '@japa/runner';
import { buildMailUrl } from '#core/mails/mail_url';

/**
 * An email has no origin to resolve a relative href against, so every link in a
 * template is built absolute. A configured `APP_URL` may or may not carry a
 * trailing slash; both must produce the same link.
 */
test.group('buildMailUrl', () => {
	test('a base with a trailing slash does not double the separator', ({ assert }) => {
		assert.equal(
			buildMailUrl('https://example.com/', '/settings/security'),
			'https://example.com/settings/security',
		);
	});

	test('a base without a trailing slash is unchanged', ({ assert }) => {
		assert.equal(
			buildMailUrl('https://example.com', '/settings/security'),
			'https://example.com/settings/security',
		);
	});

	test('a path without a leading slash still gets one', ({ assert }) => {
		assert.equal(
			buildMailUrl('https://example.com/', 'settings/security'),
			'https://example.com/settings/security',
		);
	});

	test('several trailing slashes collapse', ({ assert }) => {
		assert.equal(buildMailUrl('https://example.com///', '//settings'), 'https://example.com/settings');
	});
});
