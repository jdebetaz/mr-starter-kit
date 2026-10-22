import env from '#start/env';
import type { Role } from '#identity/types/role';

export interface TwoFactorConfig {
	/** Name shown in authenticator apps next to the account. */
	issuer: string;
	/** Number of 30-second steps accepted on either side of the current one. */
	window: number;
	/** Recovery codes generated each time they are issued. */
	recoveryCodesCount: number;
	/** Roles whose members must enrol in two-factor authentication. */
	requiredForRoles: Role[];
	/** How long a password-verified login may wait for its second factor, in seconds. */
	pendingLoginTtl: number;
}

const twoFactorConfig: Readonly<TwoFactorConfig> = Object.freeze<TwoFactorConfig>({
	issuer: env.get('APP_NAME'),
	window: 1,
	recoveryCodesCount: 10,
	requiredForRoles: ['ROLE_ADMIN'],
	pendingLoginTtl: 600,
});

export default twoFactorConfig;
