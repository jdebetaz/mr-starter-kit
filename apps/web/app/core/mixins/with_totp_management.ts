import { randomBytes } from 'node:crypto';
import { Secret } from '@adonisjs/core/helpers';
import { DateTime } from 'luxon';
import { Secret as TotpSecret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import twoFactorConfig from '#config/two_factor';
import { TotpEnrollmentNotStarted, TotpNotEnabled } from '#identity/exceptions/totp';
import type { TwoFactorConfig } from '#config/two_factor';
import type { UUID } from '#core/types';
import type { HashService } from '@adonisjs/core/types';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';

export const TOTP_PERIOD_SECONDS = 30;

/** Lost compare-and-set races tolerated before a consume attempt gives up. */
const MAX_CONSUME_ATTEMPTS = 3;

const RECOVERY_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const RECOVERY_HALF_LENGTH = 5;
// Largest multiple of the alphabet size that fits in a byte; bytes at or above
// it are discarded so every character is equally likely (no modulo bias).
const RECOVERY_BYTE_LIMIT = 256 - (256 % RECOVERY_ALPHABET.length);

/**
 * Adds TOTP two-factor management to a model that carries the generated
 * TOTP and recovery-code columns. It declares no columns itself: the schema
 * owns them, and the `@encrypted` / `@secret` decorators there own
 * encryption at rest and keeping the values out of `serialize()`.
 */
export const withTotpManagement = (hash: HashService, override: Partial<TwoFactorConfig> = {}) => {
	const config: TwoFactorConfig = { ...twoFactorConfig, ...override };

	return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
		class WithTotpManagementClass extends superclass {
			// Declared by the generated schema; typed here only for the mixin body.
			declare email: string;
			declare totpPendingSecret: Secret<string> | null;
			declare totpSecret: Secret<string> | null;
			declare totpEnabledAt: DateTime | null;
			declare totpLastConsumedTimestep: number | null;
			declare recoveryCodes: Secret<string> | null;

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
				this.totpPendingSecret = new Secret(new TotpSecret().base32);
				await this.save();
			}

			getEnrollmentSecret(): string {
				if (!this.totpPendingSecret) {
					throw new TotpEnrollmentNotStarted();
				}
				return this.totpPendingSecret.release();
			}

			/**
			 * The confirmed secret used at login. The column decrypts it on read,
			 * and fails loudly when the ciphertext is unreadable.
			 * Throws `E_TOTP_NOT_ENABLED` when enrolment was never completed.
			 */
			getConfirmedSecret(): string {
				if (!this.totpSecret) {
					throw new TotpNotEnabled();
				}
				return this.totpSecret.release();
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
				this.recoveryCodes = new Secret(JSON.stringify(hashes));
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
				const canonical = this.#canonicalRecoveryCode(code);

				if (canonical === null) {
					return false;
				}

				for (let attempt = 0; attempt < MAX_CONSUME_ATTEMPTS; attempt++) {
					const snapshot = this.recoveryCodes?.release() ?? null;
					const hashes = this.#storedRecoveryHashes();

					if (hashes.length === 0) {
						return false;
					}

					let matched = -1;
					for (const [index, stored] of hashes.entries()) {
						if (await hash.verify(stored, canonical)) {
							matched = index;
							break;
						}
					}

					if (matched === -1) {
						return false;
					}

					// The column is a JSON array packed into one value, so the write is
					// conditional on it being unchanged since it was read. Otherwise a
					// concurrent consume or regenerate would be overwritten, resurrecting
					// spent or revoked codes. On a lost race, reload and walk again.
					const next = JSON.stringify(hashes.filter((_, i) => i !== matched));
					const updated = await this.#compareAndSetRecoveryCodes(snapshot, next);

					if (updated) {
						return true;
					}
					await this.#reloadRecoveryCodes();
				}

				return false;
			}

			// ---- Recovery internals ------------------------------------------

			/**
			 * Lowercase, strip whitespace and dashes, then re-insert the dash at its
			 * canonical position. `null` when the result cannot be a recovery code.
			 */
			#canonicalRecoveryCode(code: string): string | null {
				const bare = code.toLowerCase().replace(/[\s-]/g, '');

				// Rejected before any scrypt work; the alphabet is public, so this leaks nothing.
				if (!/^[a-z0-9]{10}$/.test(bare)) {
					return null;
				}
				return `${bare.slice(0, RECOVERY_HALF_LENGTH)}-${bare.slice(RECOVERY_HALF_LENGTH)}`;
			}

			#storedRecoveryHashes(): string[] {
				if (!this.recoveryCodes) {
					return [];
				}

				try {
					const parsed: unknown = JSON.parse(this.recoveryCodes.release());
					return Array.isArray(parsed) ? (parsed as string[]) : [];
				} catch {
					return [];
				}
			}

			/**
			 * Writes `next` only if the stored column still equals `expected`.
			 * Keeps the in-memory model in step without marking it dirty.
			 *
			 * The raw `update` bypasses Lucid's `prepare`, which is correct only
			 * because `recovery_codes` is `@secret`, not `@encrypted`: promoting the
			 * column to `@encrypted` would make this write plaintext.
			 *
			 * Runs on the default client and ignores `this.$trx`, so it (and the
			 * reload below) must not be called inside a transaction.
			 */
			async #compareAndSetRecoveryCodes(expected: string | null, next: string): Promise<boolean> {
				const model = this.constructor as typeof BaseModel;
				const [affected] = await model
					.query()
					.where('id', (this as unknown as { id: UUID }).id)
					.where('recovery_codes', expected as string)
					.update({ recovery_codes: next });

				if (!affected) {
					return false;
				}
				this.recoveryCodes = new Secret(next);
				this.$original.recoveryCodes = next;
				return true;
			}

			async #reloadRecoveryCodes(): Promise<void> {
				const model = this.constructor as typeof BaseModel;
				const row = await model
					.query()
					.where('id', (this as unknown as { id: UUID }).id)
					.select('recovery_codes')
					.first();
				const fresh =
					(row as unknown as { recoveryCodes: Secret<string> | null } | null)?.recoveryCodes ?? null;
				this.recoveryCodes = fresh;
				this.$original.recoveryCodes = fresh?.release() ?? null;
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

			// ---- Internals ---------------------------------------------------

			/**
			 * Absolute timestep of a code that validated at `delta` steps from
			 * `timestamp`. It must be the same instant `validate` used.
			 */
			#timestepOf(delta: number, timestamp: number): number {
				return Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS) + delta;
			}
		}

		return WithTotpManagementClass;
	};
};
