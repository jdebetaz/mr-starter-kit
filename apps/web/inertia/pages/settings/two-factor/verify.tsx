import { Form, Link } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Card } from '@boilerplate/design-system/card';
import { CodeInput } from '@boilerplate/design-system/code-input';

interface VerifyProps {
	qrCode: string;
	manualSecret: string;
}

export default function Verify({ qrCode, manualSecret }: VerifyProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Scan the QR code</h1>

			<Card className="space-y-6">
				<div className="space-y-3">
					<p className="text-ink-muted text-sm">Scan this QR code with your authenticator app.</p>
					<img src={qrCode} alt="QR code to add this account to your authenticator app" className="size-48" />
					<p className="text-ink-muted text-sm">
						Can&apos;t scan it? Enter this key manually:{' '}
						<code className="text-ink font-mono select-all">{manualSecret}</code>
					</p>
				</div>

				<Form route="two_factor.verify.execute" className="space-y-4">
					{({ errors }) => (
						<>
							<div className="space-y-2">
								<p id="code-label" className="text-ink block text-sm font-semibold">
									Enter the six-digit code from the app
								</p>
								<CodeInput name="code" aria-labelledby="code-label" />
								{errors.code && <p className="text-rose text-sm">{errors.code}</p>}
							</div>
							<div className="flex items-center gap-3">
								<Button type="submit">Verify and enable</Button>
								<Button asChild intent="secondary">
									<Link route="settings.security.render">Cancel</Link>
								</Button>
							</div>
						</>
					)}
				</Form>
			</Card>
		</div>
	);
}
