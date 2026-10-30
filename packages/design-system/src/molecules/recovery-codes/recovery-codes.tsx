import { useEffect, useState } from 'react';
import { tv } from 'tailwind-variants';
import { Button } from '../../atoms/button/button';

const recoveryCodesList = tv({
	base: 'border-border bg-surface-muted text-ink rounded-control grid grid-cols-2 gap-2 border p-4 font-mono text-sm',
});

export interface RecoveryCodesProps {
	codes: string[];
}

type CopyState = 'idle' | 'copied' | 'failed';

const buttonLabel = {
	idle: 'Copy all',
	copied: 'Copied',
	failed: 'Copy failed',
} satisfies Record<CopyState, string>;
const announcement = {
	idle: '',
	copied: 'Recovery codes copied to the clipboard.',
	failed: 'Copy failed. Select the codes manually.',
} satisfies Record<CopyState, string>;
const resetDelayMs = 2500;

export function RecoveryCodes({ codes }: RecoveryCodesProps) {
	const [state, setState] = useState<CopyState>('idle');

	// A new set of codes or an elapsed delay returns the control to its idle state.
	useEffect(() => {
		setState('idle');
	}, [codes]);

	useEffect(() => {
		if (state === 'idle') {
			return;
		}

		const timer = setTimeout(() => setState('idle'), resetDelayMs);

		return () => clearTimeout(timer);
	}, [state]);

	async function copyAll() {
		try {
			await navigator.clipboard.writeText(codes.join('\n'));
			setState('copied');
		} catch {
			// Clipboard API missing (insecure origin) or rejected.
			setState('failed');
		}
	}

	return (
		<div className="space-y-3">
			<ul className={recoveryCodesList()}>
				{codes.map((code) => (
					<li key={code}>{code}</li>
				))}
			</ul>
			<Button intent="secondary" size="small" onClick={copyAll}>
				{buttonLabel[state]}
			</Button>
			<output className="sr-only">{announcement[state]}</output>
		</div>
	);
}
