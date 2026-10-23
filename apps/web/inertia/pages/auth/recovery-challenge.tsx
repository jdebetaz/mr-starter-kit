import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Card } from '@boilerplate/design-system/card';
import { Field } from '@boilerplate/design-system/field';

export default function RecoveryChallenge() {
	return (
		<div className="mx-auto max-w-md space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Use a recovery code</h1>

			<Card className="space-y-4">
				<Form route="login.challenge.recovery.execute" className="space-y-4">
					{({ errors }) => (
						<>
							<Field
								label="Recovery code"
								type="text"
								name="code"
								placeholder="xxxxx-xxxxx"
								autoComplete="one-time-code"
								autoCapitalize="none"
								spellCheck={false}
								error={errors.code}
							/>
							<Button type="submit">Verify</Button>
						</>
					)}
				</Form>
				<p className="text-ink-muted text-sm">
					<Link route="login.challenge.render" className="text-ink font-semibold underline">
						Use your authenticator app instead
					</Link>
				</p>
			</Card>
		</div>
	);
}
