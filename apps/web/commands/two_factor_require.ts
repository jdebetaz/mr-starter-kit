import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import UserRepository from '#identity/repositories/user_repository';
import type { CommandOptions } from '@adonisjs/core/types/ace';

export default class TwoFactorRequire extends BaseCommand {
	static commandName = 'two-factor:require';
	static description = 'Set whether a user must have two-factor authentication, overriding their roles';
	static options: CommandOptions = { startApp: true };

	@args.string({ description: 'Email address of the user' })
	declare email: string;

	@flags.boolean({ description: 'Exempt the user, even if their roles require two-factor authentication' })
	declare notRequired: boolean;

	@flags.boolean({ description: "Remove the override so the user's roles decide again" })
	declare clear: boolean;

	async run() {
		const userRepository = await this.app.container.make(UserRepository);
		const user = await userRepository.findByEmail(this.email);

		if (!user) {
			this.logger.error(`No user found with email ${this.email}`);
			this.exitCode = 1;

			return;
		}

		if (this.clear) {
			await userRepository.setTwoFactorRequired(user, null);
			this.logger.success(`Cleared the two-factor override for ${user.email}; their roles decide`);
		} else if (this.notRequired) {
			await userRepository.setTwoFactorRequired(user, false);
			this.logger.success(`Two-factor authentication is no longer required for ${user.email}`);
		} else {
			await userRepository.setTwoFactorRequired(user, true);
			this.logger.success(`Two-factor authentication is now required for ${user.email}`);
		}
	}
}
