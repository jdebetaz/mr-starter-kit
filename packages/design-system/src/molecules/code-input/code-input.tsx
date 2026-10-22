import { PinInput } from '@ark-ui/react/pin-input';
import { type ComponentPropsWithRef } from 'react';
import { tv } from 'tailwind-variants';

const codeInputControl = tv({ base: 'm-0 flex min-w-0 gap-2 border-0 p-0' });
const codeInputCell = tv({
	base: 'border-border bg-surface text-ink focus:border-accent focus:ring-accent/20 data-[invalid]:border-rose data-[invalid]:focus:ring-rose/20 rounded-control size-12 border text-center text-lg font-semibold transition-shadow outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
});

export interface CodeInputProps extends Omit<
	ComponentPropsWithRef<typeof PinInput.Root>,
	'count' | 'onValueComplete' | 'children' | 'aria-label' | 'aria-labelledby'
> {
	'name': string;
	/** Number of cells. */
	'length'?: number;
	/** Called with the joined code once every cell is filled. */
	'onComplete'?: (code: string) => void;
	/** Accessible name of the group; defaults to "Verification code". Ignored when `aria-labelledby` is set. */
	'aria-label'?: string;
	/** Id of an element (e.g. a `<label>`) naming the group. */
	'aria-labelledby'?: string;
}

export function CodeInput({
	length = 6,
	onComplete,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	...props
}: CodeInputProps) {
	return (
		<PinInput.Root otp {...props} count={length} onValueComplete={(details) => onComplete?.(details.valueAsString)}>
			<PinInput.Control asChild>
				<fieldset
					aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? 'Verification code')}
					aria-labelledby={ariaLabelledBy}
					className={codeInputControl()}
				>
					{Array.from({ length }, (_, index) => (
						<PinInput.Input key={index} index={index} inputMode="numeric" className={codeInputCell()} />
					))}
				</fieldset>
			</PinInput.Control>
			<PinInput.HiddenInput />
		</PinInput.Root>
	);
}
