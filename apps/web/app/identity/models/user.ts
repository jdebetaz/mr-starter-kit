import { withAuthFinder } from '@adonisjs/auth/mixins/lucid';
import { compose } from '@adonisjs/core/helpers';
import hash from '@adonisjs/core/services/hash';
import { WithPrimaryUuid } from '#app/core/mixins/with_primary_uuid';
import { WithTimestamps } from '#app/core/mixins/with_timestamps';
import { UserSchema } from '#database/schema';
import { Role } from '#identity/types/role';

export default class User extends compose(UserSchema, withAuthFinder(hash), WithPrimaryUuid, WithTimestamps) {
	get initials() {
		const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@');

		if (first && last) {
			return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
		}
		return `${first.slice(0, 2)}`.toUpperCase();
	}

	hasRole(rolesToCheck: Role[]) {
		return rolesToCheck.some((role) => this.roles.includes(role));
	}
}
