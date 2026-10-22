import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Card } from '@boilerplate/design-system/card';
import { CodeInput } from '@boilerplate/design-system/code-input';

export default function Challenge() {
	return (
		<div className="mx-auto max-w-md space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Two-factor authentication</h1>

			<Card className="space-y-4">
				<Form route="login.challenge.execute" className="space-y-4">
					{({ errors }) => (
						<>
							<div className="space-y-2">
								<p id="code-label" className="text-ink block text-sm font-semibold">
									Enter the six-digit code from your authenticator app
								</p>
								{/* The page exists only to type six digits, so focusing the input saves keyboard and screen-reader users a hunt. */}
								{/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
								<CodeInput name="code" aria-labelledby="code-label" autoFocus />
								{errors.code && <p className="text-rose text-sm">{errors.code}</p>}
							</div>
							<Button type="submit">Verify</Button>
						</>
					)}
				</Form>
				<p className="text-ink-muted text-sm">
					Lost your device?{' '}
					<Link route="login.challenge.recovery.render" className="text-ink font-semibold underline">
						Use a recovery code
					</Link>
				</p>
				<p className="text-ink-muted text-sm">
					<Link route="login.render" className="text-ink font-semibold underline">
						Sign in as a different user
					</Link>
				</p>
			</Card>
		</div>
	);
}
