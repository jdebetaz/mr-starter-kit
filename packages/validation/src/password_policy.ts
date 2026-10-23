import type { PasswordCheckResult, PasswordPolicy, PasswordRequirement, PasswordScore } from './types.js';

export type { PasswordCheckResult, PasswordPolicy, PasswordRequirement, PasswordScore } from './types.js';

/**
 * A policy with no options asks only for 8 characters. That is deliberate:
 * composition requirements push people towards predictable substitutions
 * without making a password harder to guess, so prefer a longer `minLength`,
 * a `minScore`, and the leaked-password check over a list of character
 * classes.
 */
const DEFAULTS: PasswordPolicy = {
	minLength: 8,
	maxLength: null,
	letters: false,
	mixedCase: false,
	numbers: false,
	symbols: false,
	minScore: 0,
};

/** Length thresholds for the strength score, longest first. */
const LENGTH_SCORES: ReadonlyArray<[length: number, score: PasswordScore]> = [
	[20, 4],
	[16, 3],
	[12, 2],
	[8, 1],
];

/** How many distinct character classes earn the variety bonus. */
const VARIETY_BONUS_THRESHOLD = 3;

const hasLetter = (password: string) => /\p{L}/u.test(password);
const hasLower = (password: string) => /\p{Ll}/u.test(password);
const hasUpper = (password: string) => /\p{Lu}/u.test(password);
const hasNumber = (password: string) => /\p{N}/u.test(password);
const hasSymbol = (password: string) => /[^\p{L}\p{N}]/u.test(password);

/**
 * Counts characters rather than UTF-16 code units, so an emoji or an accented
 * letter outside the Basic Multilingual Plane counts once instead of twice.
 */
const characterCount = (password: string): number => [...password].length;

/**
 * The strength estimate: a length tier, plus one point when the password draws
 * on at least three character classes. It knows nothing about dictionary
 * words, keyboard walks or sequences, so `Password1!` still scores in the
 * middle — pair `minScore` with the leaked-password check rather than trusting
 * it alone.
 */
const scorePassword = (password: string): PasswordScore => {
	const length = characterCount(password);

	if (length === 0) {
		return 0;
	}

	const lengthScore = LENGTH_SCORES.find(([threshold]) => length >= threshold)?.[1] ?? 0;

	const classes = [hasLower(password), hasUpper(password), hasNumber(password), hasSymbol(password)].filter(
		Boolean,
	).length;

	const bonus = classes >= VARIETY_BONUS_THRESHOLD ? 1 : 0;

	return Math.min(lengthScore + bonus, 4) as PasswordScore;
};

/**
 * Fills in every option a policy does not set and freezes the result, so one
 * policy object can be shared by the server, the validator and the browser
 * without any of them mutating it. The return type says `Readonly` so a write
 * is a type error rather than a runtime throw under ESM strict mode.
 */
export function definePasswordPolicy(options: Partial<PasswordPolicy> = {}): Readonly<PasswordPolicy> {
	return Object.freeze({ ...DEFAULTS, ...options });
}

/**
 * Measures a password against a policy. Safe to call on every keystroke in the
 * browser: it performs no I/O and knows nothing about data leaks, which is the
 * server's job through the `uncompromised` rule.
 */
export function checkPassword(password: string, policy: PasswordPolicy): PasswordCheckResult {
	const length = characterCount(password);
	const score = scorePassword(password);
	const requirements: PasswordRequirement[] = [];

	requirements.push({ rule: 'minLength', met: length >= policy.minLength, min: policy.minLength });

	if (policy.maxLength !== null) {
		requirements.push({ rule: 'maxLength', met: length <= policy.maxLength, max: policy.maxLength });
	}

	if (policy.letters) {
		requirements.push({ rule: 'letters', met: hasLetter(password) });
	}

	if (policy.mixedCase) {
		requirements.push({ rule: 'mixedCase', met: hasLower(password) && hasUpper(password) });
	}

	if (policy.numbers) {
		requirements.push({ rule: 'numbers', met: hasNumber(password) });
	}

	if (policy.symbols) {
		requirements.push({ rule: 'symbols', met: hasSymbol(password) });
	}

	if (policy.minScore > 0) {
		requirements.push({ rule: 'minScore', met: score >= policy.minScore, min: policy.minScore });
	}

	return {
		valid: requirements.every((requirement) => requirement.met),
		score,
		requirements,
	};
}

/**
 * Renders the policy as the `passwordrules` attribute value password managers
 * read, so a generated password satisfies the policy on the first try.
 *
 * @see https://developer.apple.com/password-rules/
 */
export function toPasswordRulesString(policy: PasswordPolicy): string {
	const parts = [`minlength: ${policy.minLength};`];

	if (policy.maxLength !== null) {
		parts.push(`maxlength: ${policy.maxLength};`);
	}

	if (policy.mixedCase) {
		parts.push('required: lower;', 'required: upper;');
	} else if (policy.letters) {
		parts.push('required: lower;');
	}

	if (policy.numbers) {
		parts.push('required: digit;');
	}

	if (policy.symbols) {
		parts.push('required: special;');
	}

	return parts.join(' ');
}
