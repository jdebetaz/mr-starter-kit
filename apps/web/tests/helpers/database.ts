import testUtils from '@adonisjs/core/services/test_utils';
import type { Group } from '@japa/runner/core';

/**
 * Empties every table before each test in the group so specs never see
 * rows created by another test. Call it once at the top of each group.
 */
export function truncateBetweenTests(group: Group): void {
	group.each.setup(() => testUtils.db().truncate());
}
