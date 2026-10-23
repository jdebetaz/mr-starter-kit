import { randomUUID } from 'node:crypto';
import db from '@adonisjs/lucid/services/db';
import User from '#identity/models/user';
import type { Role } from '#identity/types/role';
import type { CreateUserPayload } from '#identity/types/user';

type UserAttributes = Partial<CreateUserPayload> & { roles?: Role[] };

/**
 * Persists a user with sensible defaults. The password stays `password` so
 * specs can sign in as the user; the model hashes it.
 *
 * `roles` is a json column and the model does not serialise it, so a raw
 * array would be sent to pg as a Postgres array and rejected. Roles are
 * therefore left to the column default on insert and written as JSON after.
 */
export async function createUser({ roles, ...attributes }: UserAttributes = {}): Promise<User> {
	const user = await User.create({
		fullName: 'Test User',
		email: `user-${randomUUID()}@example.com`,
		password: 'password',
		...attributes,
	});

	if (roles) {
		await db
			.from('users')
			.where('id', user.id)
			.update({ roles: JSON.stringify(roles) });
	}

	return user.refresh();
}
