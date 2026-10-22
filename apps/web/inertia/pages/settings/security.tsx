import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';
import { Field } from '@boilerplate/design-system/field';

interface SecurityProps {
	status: {
		enabled: boolean;
		enabledAt: string | null;
		remainingRecoveryCodes: number;
		required: boolean;
		canDisable: boolean;
	};
}

const enabledOnFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

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
							? `Enabled${status.enabledAt ? ` on ${enabledOnFormatter.format(new Date(status.enabledAt))}` : ''}.`
							: 'Add a second step at sign-in using an authenticator app.'}
					</p>
				</div>

				{!status.enabled && (
					<Button asChild>
						<Link route="two_factor.start.render">Enable two-factor authentication</Link>
					</Button>
				)}

				{status.canDisable && (
					<Form route="two_factor.disable.execute" className="space-y-3">
						{({ errors }) => (
							<>
								<Field
									label="Confirm your password to turn it off"
									type="password"
									name="password"
									autoComplete="current-password"
									error={errors.password}
								/>
								<Button type="submit" intent="secondary">
									Disable two-factor authentication
								</Button>
							</>
						)}
					</Form>
				)}
			</Card>

			{status.enabled && (
				<Card className="space-y-4">
					<div>
						<h2 className="text-ink text-lg font-semibold">Recovery codes</h2>
						<p className="text-ink-muted text-sm">
							{status.remainingRecoveryCodes === 1
								? '1 recovery code remaining.'
								: `${status.remainingRecoveryCodes} recovery codes remaining.`}
						</p>
					</div>
					<Button asChild intent="secondary">
						<Link route="two_factor.recovery.render">Manage recovery codes</Link>
					</Button>
				</Card>
			)}
		</div>
	);
}
