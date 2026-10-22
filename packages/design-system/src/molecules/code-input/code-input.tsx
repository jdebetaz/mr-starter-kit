import { PinInput } from '@ark-ui/react/pin-input';
import { tv } from 'tailwind-variants';

const codeInputControl = tv({ base: 'm-0 flex min-w-0 gap-2 border-0 p-0' });
const codeInputCell = tv({
	base: 'border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 data-[invalid]:border-rose data-[invalid]:focus:ring-rose/20 rounded-control size-12 border text-center text-lg font-semibold transition-shadow outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
});

export interface CodeInputProps {
	'name': string;
	'length'?: number;
	'autoFocus'?: boolean;
	'invalid'?: boolean;
	'onComplete'?: (code: string) => void;
	'aria-label'?: string;
}

export function CodeInput({
	name,
	length = 6,
	autoFocus,
	invalid,
	onComplete,
	'aria-label': ariaLabel = 'Verification code',
}: CodeInputProps) {
	return (
		<PinInput.Root
			name={name}
			count={length}
			// Consumers opt in explicitly, e.g. the single-purpose 2FA challenge page.
			// oxlint-disable-next-line jsx-a11y/no-autofocus
			autoFocus={autoFocus}
			invalid={invalid}
			otp
			onValueComplete={(details) => onComplete?.(details.valueAsString)}
		>
			<PinInput.Control asChild>
				<fieldset aria-label={ariaLabel} className={codeInputControl()}>
					{Array.from({ length }, (_, index) => (
						<PinInput.Input key={index} index={index} inputMode="numeric" className={codeInputCell()} />
					))}
				</fieldset>
			</PinInput.Control>
			<PinInput.HiddenInput />
		</PinInput.Root>
	);
}
