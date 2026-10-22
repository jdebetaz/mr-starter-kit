import { test } from '@japa/runner';
import { isTwoFactorRequiredFor } from '#identity/policies/two_factor_requirement';
import UserRepository from '#identity/repositories/user_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { createUser } from '#tests/helpers/user_factory';

test.group('Two-factor requirement', (group) => {
	truncateBetweenTests(group);

	test('a user with a required role must have 2FA', async ({ assert }) => {
		assert.isTrue(isTwoFactorRequiredFor(await createUser({ roles: ['ROLE_ADMIN'] })));
	});

	test('an ordinary user need not', async ({ assert }) => {
		assert.isFalse(isTwoFactorRequiredFor(await createUser({ roles: ['ROLE_USER'] })));
	});

	test('the per-user override forces it on', async ({ assert }) => {
		const user = await createUser({ roles: ['ROLE_USER'] });
		user.totpRequired = true;
		assert.isTrue(isTwoFactorRequiredFor(user));
	});

	test('the per-user override forces it off for a required role', async ({ assert }) => {
		const user = await createUser({ roles: ['ROLE_ADMIN'] });
		user.totpRequired = false;
		assert.isFalse(isTwoFactorRequiredFor(user));
	});
});

test.group('UserRepository.setTwoFactorRequired', (group) => {
	truncateBetweenTests(group);

	test('persists an override in both directions', async ({ assert }) => {
		const repository = new UserRepository();
		const admin = await createUser({ roles: ['ROLE_ADMIN'] });
		const member = await createUser({ roles: ['ROLE_USER'] });

		await repository.setTwoFactorRequired(admin, false);
		await repository.setTwoFactorRequired(member, true);

		const reloadedAdmin = (await repository.findById(admin.id))!;
		const reloadedMember = (await repository.findById(member.id))!;
		assert.isFalse(reloadedAdmin.totpRequired);
		assert.isFalse(isTwoFactorRequiredFor(reloadedAdmin));
		assert.isTrue(reloadedMember.totpRequired);
		assert.isTrue(isTwoFactorRequiredFor(reloadedMember));
	});

	test('null clears the override and returns to role-based behaviour', async ({ assert }) => {
		const repository = new UserRepository();
		const admin = await createUser({ roles: ['ROLE_ADMIN'] });
		await repository.setTwoFactorRequired(admin, false);
		assert.isFalse(isTwoFactorRequiredFor((await repository.findById(admin.id))!));

		await repository.setTwoFactorRequired(admin, null);

		const reloaded = (await repository.findById(admin.id))!;
		assert.isNull(reloaded.totpRequired);
		assert.isTrue(isTwoFactorRequiredFor(reloaded));
	});
});
