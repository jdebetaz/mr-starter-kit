/**
 * The requirements a password must meet. Build one with `definePasswordPolicy`
 * rather than by hand, so every field has a value and the server and the
 * browser read the same shape.
 */
export interface PasswordPolicy {
	/** Minimum number of characters. */
	minLength: number;

	/** Maximum number of characters, or `null` for no upper limit. */
	maxLength: number | null;

	/** Require at least one letter. */
	letters: boolean;

	/** Require at least one uppercase and one lowercase letter. */
	mixedCase: boolean;

	/** Require at least one number. */
	numbers: boolean;

	/** Require at least one symbol. Spaces and punctuation count as symbols. */
	symbols: boolean;

	/** Minimum strength score, 0 to 4. `0` disables the requirement. */
	minScore: PasswordScore;
}

/** A strength estimate from 0 (very weak) to 4 (very strong). */
export type PasswordScore = 0 | 1 | 2 | 3 | 4;

/**
 * The state of one requirement the policy enabled. `minLength` and `minScore`
 * carry the `min` they were measured against, and `maxLength` carries `max`,
 * so a checklist can render "At least 12 characters" without re-reading the
 * policy.
 */
export interface PasswordRequirement {
	rule: 'minLength' | 'maxLength' | 'letters' | 'mixedCase' | 'numbers' | 'symbols' | 'minScore';
	met: boolean;
	min?: number;
	max?: number;
}

/** What `checkPassword` reports. */
export interface PasswordCheckResult {
	/** True when every enabled requirement is met. */
	valid: boolean;

	/** The strength estimate, independent of the policy's requirements. */
	score: PasswordScore;

	/** One entry per requirement the policy enabled, in policy order. */
	requirements: PasswordRequirement[];
}
