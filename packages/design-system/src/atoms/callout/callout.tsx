import { type ComponentPropsWithRef, type ReactNode } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const callout = tv({
	base: 'rounded-control text-ink border border-l-4 p-4 text-sm',
	variants: {
		tone: {
			info: 'border-accent bg-accent-soft',
			warning: 'border-peach bg-peach-soft',
			danger: 'border-rose bg-rose-soft',
		},
	},
	defaultVariants: {
		tone: 'info',
	},
});

const toneLabel = { info: 'Information', warning: 'Warning', danger: 'Error' } as const;

type CalloutVariants = VariantProps<typeof callout>;

export interface CalloutProps extends Omit<ComponentPropsWithRef<'div'>, 'title'>, CalloutVariants {
	title?: string;
	children: ReactNode;
}

/**
 * Info uses role="status"; warning and danger use role="alert". Pass `role` to override per use
 * (e.g. role="status" for a static warning that should not interrupt screen readers).
 */
export function Callout({ tone = 'info', title, children, className, ...props }: CalloutProps) {
	return (
		<div role={tone === 'info' ? 'status' : 'alert'} className={callout({ tone, className })} {...props}>
			<span className="sr-only">{toneLabel[tone]}: </span>
			{title ? <p className="font-semibold">{title}</p> : null}
			<div className={title ? 'mt-1' : undefined}>{children}</div>
		</div>
	);
}
