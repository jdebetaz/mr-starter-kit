import { useState } from 'react';
import { tv } from 'tailwind-variants';
import { Button } from '../../atoms/button/button';

const recoveryCodesList = tv({
	base: 'border-border bg-surface-muted text-ink rounded-control grid grid-cols-2 gap-2 border p-4 font-mono text-sm',
});

export interface RecoveryCodesProps {
	codes: string[];
}

type CopyState = 'idle' | 'copied' | 'failed';

const copyLabel: Record<CopyState, string> = {
	idle: 'Copy all',
	copied: 'Copied',
	failed: 'Copy failed. Select the codes manually.',
};

export function RecoveryCodes({ codes }: RecoveryCodesProps) {
	const [state, setState] = useState<CopyState>('idle');

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
				{copyLabel[state]}
			</Button>
			<output className="sr-only">{state === 'idle' ? '' : copyLabel[state]}</output>
		</div>
	);
}
