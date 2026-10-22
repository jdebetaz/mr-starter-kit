import { DateTime } from 'luxon';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import twoFactorConfig from '#config/two_factor';
import { TotpEnrollmentNotStarted, TotpNotEnabled, TotpSecretUnreadable } from '#identity/exceptions/totp';
import type { TwoFactorConfig } from '#config/two_factor';
import type { Encryption } from '@adonisjs/core/encryption';
import type { HashService } from '@adonisjs/core/types';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';

const PERIOD_SECONDS = 30;

/**
 * Adds TOTP two-factor management to a model that carries the generated
 * TOTP columns. It declares no columns itself: the schema owns them.
 *
 * `hash` is accepted for the recovery codes that are added later.
 */
export const withTotpManagement = (
	encryption: Pick<Encryption, 'encrypt' | 'decrypt'>,
	_hash: HashService,
	override: Partial<TwoFactorConfig> = {},
) => {
	const config: TwoFactorConfig = { ...twoFactorConfig, ...override };

	return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
		class WithTotpManagementClass extends superclass {
			// Declared by the generated schema; typed here only for the mixin body.
			declare email: string;
			declare totpPendingSecret: string | null;
			declare totpSecret: string | null;
			declare totpEnabledAt: DateTime | null;
			declare totpLastConsumedTimestep: number | null;
			declare recoveryCodes: string | null;

			// ---- State -------------------------------------------------------

			get isTwoFactorEnabled(): boolean {
				return Boolean(this.totpSecret) && Boolean(this.totpEnabledAt);
			}

			get hasPendingTwoFactor(): boolean {
				return Boolean(this.totpPendingSecret);
			}

			// ---- TOTP construction ------------------------------------------

			getTotpLabel(): string {
				return this.email;
			}

			/**
			 * The secret is required so a caller always says which one it means:
			 * `getEnrollmentSecret()` while enrolling, `getConfirmedSecret()` at login.
			 */
			createTotp(secret: string): TOTP {
				return new TOTP({
					issuer: config.issuer,
					label: this.getTotpLabel(),
					algorithm: 'SHA1',
					digits: 6,
					period: PERIOD_SECONDS,
					secret,
				});
			}

			// ---- Enrollment --------------------------------------------------

			/**
			 * Starts (or restarts) enrolment. Only the pending secret changes, so a
			 * confirmed authenticator keeps working until the new one is confirmed.
			 */
			async generateSecret(): Promise<void> {
				this.totpPendingSecret = encryption.encrypt(new Secret().base32);
				await this.save();
			}

			getEnrollmentSecret(): string {
				if (!this.totpPendingSecret) {
					throw new TotpEnrollmentNotStarted();
				}
				return this.#decrypt(this.totpPendingSecret);
			}

			/**
			 * The decrypted confirmed secret used at login.
			 * Throws `E_TOTP_NOT_ENABLED` when enrolment was never completed.
			 */
			getConfirmedSecret(): string {
				if (!this.totpSecret) {
					throw new TotpNotEnabled();
				}
				return this.#decrypt(this.totpSecret);
			}

			getSecretUri(): string {
				return this.createTotp(this.getEnrollmentSecret()).toString();
			}

			async generateQRCode(): Promise<string> {
				return QRCode.toDataURL(this.getSecretUri());
			}

			/**
			 * Confirms enrolment with a code from the pending secret. A wrong code
			 * returns `false` and leaves the model untouched.
			 * Throws `E_TOTP_ENROLLMENT_NOT_STARTED` when there is no pending secret.
			 */
			async enableTwoFactor(code: string): Promise<boolean> {
				const pending = this.getEnrollmentSecret();
				const delta = this.createTotp(pending).validate({ token: code, window: config.window });

				if (delta === null) {
					return false;
				}

				// The enabling code counts as consumed, so it cannot be replayed at login.
				this.totpLastConsumedTimestep = this.#timestepOf(delta);
				this.totpSecret = this.totpPendingSecret;
				this.totpEnabledAt = DateTime.now();
				this.totpPendingSecret = null;
				await this.save();
				return true;
			}

			async disableTwoFactor(): Promise<void> {
				this.totpPendingSecret = null;
				this.totpSecret = null;
				this.totpEnabledAt = null;
				this.totpLastConsumedTimestep = null;
				this.recoveryCodes = null;
				await this.save();
			}

			// ---- Login verification -----------------------------------------

			/**
			 * Codes pasted from authenticator apps arrive as "123 456" or "123-456".
			 */
			normalizeTotpCode(code: string): string {
				return code.replace(/[\s-]/g, '');
			}

			/**
			 * Verifies a login code against the confirmed secret. A code from a
			 * timestep at or below the last consumed one is a replay and is rejected.
			 * Returns `false` for a wrong code, a replay, or when 2FA is not enabled.
			 */
			async verifyTotpForLogin(code: string): Promise<boolean> {
				if (!this.isTwoFactorEnabled) {
					return false;
				}

				const totp = this.createTotp(this.getConfirmedSecret());
				const delta = totp.validate({ token: this.normalizeTotpCode(code), window: config.window });

				if (delta === null) {
					return false;
				}

				const timestep = this.#timestepOf(delta);

				if (this.totpLastConsumedTimestep !== null && timestep <= this.totpLastConsumedTimestep) {
					return false;
				}

				this.totpLastConsumedTimestep = timestep;
				await this.save();
				return true;
			}

			// ---- Internals ---------------------------------------------------

			/** Absolute timestep of a code that validated at `delta` steps from now. */
			#timestepOf(delta: number): number {
				return Math.floor(Date.now() / 1000 / PERIOD_SECONDS) + delta;
			}

			/**
			 * A null from `decrypt` means the ciphertext is unreadable. That must
			 * fail rather than read as "not enrolled".
			 */
			#decrypt(ciphertext: string): string {
				const plain = encryption.decrypt<string>(ciphertext);

				if (plain === null) {
					throw new TotpSecretUnreadable();
				}
				return plain;
			}
		}

		return WithTotpManagementClass;
	};
};
