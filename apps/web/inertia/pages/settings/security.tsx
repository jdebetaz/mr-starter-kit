import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';

interface SecurityProps {
	status: {
		enabled: boolean;
		enabledAt: string | null;
		remainingRecoveryCodes: number;
		required: boolean;
		canDisable: boolean;
	};
}

export default function Security({ status }: SecurityProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Security</h1>

			{status.required && (
				<Callout tone="info" title="Two-factor authentication is required">
					Your account must keep two-factor authentication turned on.
				</Callout>
			)}

			<Card className="space-y-4">
				<div>
					<h2 className="text-ink text-lg font-semibold">Two-factor authentication</h2>
					<p className="text-ink-muted text-sm">
						{status.enabled
							? `Enabled${status.enabledAt ? ` on ${new Date(status.enabledAt).toLocaleDateString()}` : ''}.`
							: 'Add a second step at sign-in using an authenticator app.'}
					</p>
				</div>

				{!status.enabled && (
					<Button asChild>
						<a href="/settings/security/two-factor">Enable two-factor authentication</a>
					</Button>
				)}

				{status.canDisable && <Button intent="secondary">Disable two-factor authentication</Button>}
			</Card>

			{status.enabled && (
				<Card className="space-y-4">
					<div>
						<h2 className="text-ink text-lg font-semibold">Recovery codes</h2>
						<p className="text-ink-muted text-sm">{status.remainingRecoveryCodes} recovery codes remaining.</p>
					</div>
					<Button intent="secondary">Regenerate recovery codes</Button>
				</Card>
			)}
		</div>
	);
}
