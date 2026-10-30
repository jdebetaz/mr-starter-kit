import BaseRepository from '#core/repositories/base_repository';
import User from '#identity/models/user';
import type { CreateUserPayload } from '#identity/types/user';

export default class UserRepository extends BaseRepository<typeof User> {
	constructor() {
		super(User);
	}

	findByEmail(email: string): Promise<User | null> {
		return this.findOneBy('email', email);
	}

	createUser(payload: CreateUserPayload): Promise<User> {
		return User.create(payload);
	}

	/**
	 * Sets the per-user two-factor override. `null` clears it, so the user's
	 * roles decide again.
	 */
	async setTwoFactorRequired(user: User, required: boolean | null): Promise<void> {
		user.totpRequired = required;
		await user.save();
	}
}
