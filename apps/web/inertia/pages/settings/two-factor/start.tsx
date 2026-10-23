import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Card } from '@boilerplate/design-system/card';

export default function Start() {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Set up two-factor authentication</h1>

			<Card className="space-y-4">
				<p className="text-ink-muted text-sm">
					You will need an authenticator app, such as 1Password, Authy or Google Authenticator. In the next
					step you scan a QR code with it, then enter the six-digit code it shows.
				</p>
				<div className="flex items-center gap-3">
					<Form route="two_factor.start.execute">
						<Button type="submit">Continue</Button>
					</Form>
					<Button asChild intent="secondary">
						<Link route="settings.security.render">Cancel</Link>
					</Button>
				</div>
			</Card>
		</div>
	);
}
