import BaseRepository from '#core/repositories/base_repository';
import User from '#identity/models/user';

export default class UserRepository extends BaseRepository<typeof User> {
	constructor() {
		super(User);
	}

	findByEmail(email: string): Promise<User | null> {
		return this.findOneBy('email', email);
	}
}
