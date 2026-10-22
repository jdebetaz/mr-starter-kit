import { randomBytes } from 'node:crypto';
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

export const TOTP_PERIOD_SECONDS = 30;

const RECOVERY_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const RECOVERY_HALF_LENGTH = 5;
// Largest multiple of the alphabet size that fits in a byte; bytes at or above
// it are discarded so every character is equally likely (no modulo bias).
const RECOVERY_BYTE_LIMIT = 256 - (256 % RECOVERY_ALPHABET.length);

/**
 * Adds TOTP two-factor management to a model that carries the generated
 * TOTP and recovery-code columns. It declares no columns itself: the schema
 * owns them.
 */
export const withTotpManagement = (
	encryption: Pick<Encryption, 'encrypt' | 'decrypt'>,
	hash: HashService,
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
					period: TOTP_PERIOD_SECONDS,
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
				const timestamp = Date.now();
				const delta = this.createTotp(pending).validate({
					token: this.normalizeTotpCode(code),
					timestamp,
					window: config.window,
				});

				if (delta === null) {
					return false;
				}

				// The enabling code counts as consumed, so it cannot be replayed at login.
				this.totpLastConsumedTimestep = this.#timestepOf(delta, timestamp);
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
				const timestamp = Date.now();
				const delta = totp.validate({ token: this.normalizeTotpCode(code), timestamp, window: config.window });

				if (delta === null) {
					return false;
				}

				const timestep = this.#timestepOf(delta, timestamp);

				if (this.totpLastConsumedTimestep !== null && timestep <= this.totpLastConsumedTimestep) {
					return false;
				}

				this.totpLastConsumedTimestep = timestep;
				await this.save();
				return true;
			}

			// ---- Recovery codes ---------------------------------------------

			/**
			 * Issues a fresh set of single-use codes, replacing any existing ones.
			 * Only hashes are stored: the returned plaintext is the one chance to
			 * show them. Independent of the TOTP secret lifecycle.
			 */
			async generateRecoveryCodes(): Promise<string[]> {
				const codes = Array.from({ length: config.recoveryCodesCount }, () => this.seedRecoveryCode());
				const hashes = await Promise.all(codes.map((code) => hash.make(code)));
				this.recoveryCodes = JSON.stringify(hashes);
				await this.save();
				return codes;
			}

			/**
			 * One code, `xxxxx-xxxxx`, from a CSPRNG. Overridable.
			 */
			seedRecoveryCode(): string {
				const chars = this.#randomRecoveryChars(RECOVERY_HALF_LENGTH * 2);
				return `${chars.slice(0, RECOVERY_HALF_LENGTH)}-${chars.slice(RECOVERY_HALF_LENGTH)}`;
			}

			get remainingRecoveryCodesCount(): number {
				return this.#storedRecoveryHashes().length;
			}

			/**
			 * Consumes a recovery code. Returns `false` (never throws) for an unknown
			 * or already-used code, or when there are none. Each attempt walks the
			 * stored hashes with `hash.verify`, so it costs up to
			 * `recoveryCodesCount` scrypt verifications; the endpoint is throttled
			 * for that reason. No lookup key is stored: it would leak part of a code.
			 */
			async verifyRecoveryCode(code: string): Promise<boolean> {
				const hashes = this.#storedRecoveryHashes();
				const canonical = this.#canonicalRecoveryCode(code);

				if (hashes.length === 0 || canonical === null) {
					return false;
				}

				for (const [index, stored] of hashes.entries()) {
					if (await hash.verify(stored, canonical)) {
						this.recoveryCodes = JSON.stringify(hashes.filter((_, i) => i !== index));
						await this.save();
						return true;
					}
				}
				return false;
			}

			// ---- Internals ---------------------------------------------------

			/**
			 * Lowercase, strip whitespace and dashes, then re-insert the dash at its
			 * canonical position. `null` when the result cannot be a recovery code.
			 */
			#canonicalRecoveryCode(code: string): string | null {
				const bare = code.toLowerCase().replace(/[\s-]/g, '');

				if (bare.length !== RECOVERY_HALF_LENGTH * 2) {
					return null;
				}
				return `${bare.slice(0, RECOVERY_HALF_LENGTH)}-${bare.slice(RECOVERY_HALF_LENGTH)}`;
			}

			#storedRecoveryHashes(): string[] {
				return this.recoveryCodes ? (JSON.parse(this.recoveryCodes) as string[]) : [];
			}

			/**
			 * Uniform characters from `crypto.randomBytes` by rejection sampling.
			 */
			#randomRecoveryChars(length: number): string {
				let chars = '';

				while (chars.length < length) {
					for (const byte of randomBytes(length * 2)) {
						if (byte < RECOVERY_BYTE_LIMIT && chars.length < length) {
							chars += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
						}
					}
				}
				return chars;
			}

			/**
			 * Absolute timestep of a code that validated at `delta` steps from
			 * `timestamp`. It must be the same instant `validate` used.
			 */
			#timestepOf(delta: number, timestamp: number): number {
				return Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS) + delta;
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
