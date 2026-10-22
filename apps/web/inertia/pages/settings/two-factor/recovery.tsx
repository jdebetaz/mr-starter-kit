import { Form } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';
import { RecoveryCodes } from '@boilerplate/design-system/recovery-codes';

interface RecoveryProps {
	codes: string[];
}

export default function Recovery({ codes }: RecoveryProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Save your recovery codes</h1>

			<Callout tone="warning" title="Store these somewhere safe">
				Each code works once if you lose access to your authenticator app. They will not be shown again, and reloading
				this page replaces them with new ones.
			</Callout>

			<Card className="space-y-4">
				<RecoveryCodes codes={codes} />
				<Form route="two_factor.recovery.execute">
					<Button type="submit">I have saved these</Button>
				</Form>
			</Card>
		</div>
	);
}
