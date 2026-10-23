import { checkPassword } from '@boilerplate/validation/password-policy';
import { tv } from 'tailwind-variants';
import type { PasswordPolicy, PasswordRequirement, PasswordScore } from '@boilerplate/validation/password-policy';

const SEGMENT_COUNT = 4;

/** What each score is called. The index is the score. */
const SCORE_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

const meterRoot = tv({ base: 'space-y-2' });
const meterTrack = tv({ base: 'flex flex-1 gap-1.5' });
const meterHeader = tv({ base: 'flex items-center gap-3' });
const meterCaption = tv({ base: 'text-muted shrink-0 text-xs font-medium' });
const meterList = tv({ base: 'space-y-1' });

const meterSegment = tv({
	base: 'h-1.5 flex-1 rounded-full transition-colors',
	variants: {
		/**
		 * The filled colour carries the same meaning as the caption, so it is
		 * never the only signal: a person who cannot tell these hues apart
		 * still reads "Fair" beside the bar.
		 */
		tone: {
			empty: 'bg-border',
			weak: 'bg-rose',
			fair: 'bg-peach',
			good: 'bg-accent',
			strong: 'bg-mint',
		},
	},
	defaultVariants: { tone: 'empty' },
});

const meterItem = tv({
	base: 'flex items-center gap-2 text-xs',
	variants: {
		met: {
			true: 'text-ink',
			false: 'text-muted',
		},
	},
});

const meterMarker = tv({
	base: 'flex size-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] leading-none',
	variants: {
		met: {
			true: 'bg-mint-soft text-ink',
			false: 'bg-surface-muted text-muted',
		},
	},
});

/** The tone of a filled segment, chosen by the score it belongs to. */
const TONES = ['weak', 'weak', 'fair', 'good', 'strong'] as const;

/**
 * Wording for one requirement. `min` and `max` come from the check result
 * rather than the policy, so the sentence and the verdict can never disagree.
 */
function requirementLabel({ rule, min, max }: PasswordRequirement): string {
	switch (rule) {
		case 'minLength':
			return `At least ${min} characters`;
		case 'maxLength':
			return `No more than ${max} characters`;
		case 'letters':
			return 'At least one letter';
		case 'mixedCase':
			return 'Upper and lowercase letters';
		case 'numbers':
			return 'At least one number';
		case 'symbols':
			return 'At least one symbol';
		case 'minScore':
			return `Strength of at least "${SCORE_LABELS[min as PasswordScore]}"`;
	}
}

export interface PasswordMeterProps {
	/** The password as it currently stands, usually straight from the input. */
	password: string;

	/** The policy to measure it against — the same object the server uses. */
	policy: PasswordPolicy;

	className?: string;
}

/**
 * Shows how a password measures up: a four-segment strength bar and one row
 * per requirement the policy asks for.
 *
 * It calls the same `checkPassword` the server's validator runs, so the
 * checklist cannot drift from what signup will actually accept. What it cannot
 * know is whether the password has appeared in a data leak — that lookup
 * belongs to the server, so a password can satisfy every row here and still be
 * refused.
 *
 * The bar itself is decorative. A native `<meter>` cannot be split into
 * segments and a `role="meter"` div only restates what the caption beside it
 * already says in words, so the caption is the accessible announcement. It is
 * an `<output>`, which is both the element for a calculated result and a
 * polite live region, so a change in strength is reported as it is typed.
 */
export function PasswordMeter({ password, policy, className }: PasswordMeterProps) {
	const { score, requirements } = checkPassword(password, policy);
	const empty = password.length === 0;

	/**
	 * A ceiling is not something a person works towards, so its row appears
	 * only once it is breached. "No more than 256 characters ✓" on an empty
	 * form teaches people the checklist is decorative, which costs the rows
	 * that do matter.
	 */
	const visible = requirements.filter((requirement) => requirement.rule !== 'maxLength' || !requirement.met);

	return (
		<div className={meterRoot({ className })}>
			<div className={meterHeader()}>
				<div className={meterTrack()} aria-hidden="true">
					{Array.from({ length: SEGMENT_COUNT }, (_, index) => (
						<span key={index} className={meterSegment({ tone: !empty && index < score ? TONES[score] : 'empty' })} />
					))}
				</div>

				<output className={meterCaption()}>{empty ? 'Enter a password' : `Strength: ${SCORE_LABELS[score]}`}</output>
			</div>

			<ul className={meterList()}>
				{visible.map((requirement) => (
					<li key={requirement.rule} className={meterItem({ met: requirement.met })}>
						<span className={meterMarker({ met: requirement.met })} aria-hidden="true">
							{requirement.met ? '✓' : '•'}
						</span>
						<span>{requirementLabel(requirement)}</span>
						<span className="sr-only">{requirement.met ? '— met' : '— not met yet'}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
