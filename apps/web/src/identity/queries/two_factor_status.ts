import { isTwoFactorRequiredFor } from '#identity/domain/two_factor_requirement';
import type User from '#identity/models/user';

export interface TwoFactorStatus {
	enabled: boolean;
	enabledAt: string | null;
	remainingRecoveryCodes: number;
	required: boolean;
	canDisable: boolean;
}

/**
 * Read model for the security settings page: whether the user's second
 * factor is on, whether policy obliges them to keep it on, and how many
 * recovery codes are left. Reads the already-loaded user and touches no
 * database.
 */
export default class TwoFactorStatusQuery {
	async execute(user: User): Promise<TwoFactorStatus> {
		const enabled = user.isTwoFactorEnabled;
		const required = isTwoFactorRequiredFor(user);

		return {
			enabled,
			enabledAt: user.totpEnabledAt?.toISO() ?? null,
			remainingRecoveryCodes: enabled ? user.remainingRecoveryCodesCount : 0,
			required,
			canDisable: enabled && !required,
		};
	}
}
