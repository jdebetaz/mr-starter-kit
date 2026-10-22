import { DateTime } from 'luxon';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import twoFactorConfig from '#config/two_factor';
import { TotpEnrollmentNotStarted, TotpSecretUnreadable } from '#identity/exceptions/totp';
import type { TwoFactorConfig } from '#config/two_factor';
import type { Encryption } from '@adonisjs/core/encryption';
import type { HashService } from '@adonisjs/core/types';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';

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

			createTotp(secret?: string): TOTP {
				return new TOTP({
					issuer: config.issuer,
					label: this.getTotpLabel(),
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					secret: secret ?? this.getEnrollmentSecret(),
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

			getSecretUri(): string {
				return this.createTotp().toString();
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

			// ---- Internals ---------------------------------------------------

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
