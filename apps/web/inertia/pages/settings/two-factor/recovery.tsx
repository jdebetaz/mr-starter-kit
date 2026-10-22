import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';
import { Field } from '@boilerplate/design-system/field';
import { RecoveryCodes } from '@boilerplate/design-system/recovery-codes';

interface RecoveryProps {
	codes: string[] | null;
}

export default function Recovery({ codes }: RecoveryProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Save your recovery codes</h1>

			{codes ? (
				<>
					<Callout tone="warning" title="Store these somewhere safe">
						Each code works once if you lose access to your authenticator app. They will not be shown again.
					</Callout>

					<Card className="space-y-4">
						<RecoveryCodes codes={codes} />
						<Form route="two_factor.recovery.execute">
							<Button type="submit">I have saved these</Button>
						</Form>
					</Card>
				</>
			) : (
				<Card className="space-y-4">
					<p className="text-ink-muted text-sm">
						Your recovery codes were already issued and cannot be shown again. If you did not save them, generate new
						ones. This replaces the old codes, which stop working.
					</p>
					<Form route="two_factor.recovery.regenerate.execute" className="space-y-3">
						{({ errors }) => (
							<>
								<Field
									label="Confirm your password"
									type="password"
									name="password"
									autoComplete="current-password"
									error={errors.password}
								/>
								<div className="flex items-center gap-3">
									<Button type="submit" intent="secondary">
										Generate new recovery codes
									</Button>
									<Button asChild>
										<Link route="settings.security.render">Back to security</Link>
									</Button>
								</div>
							</>
						)}
					</Form>
				</Card>
			)}
		</div>
	);
}
