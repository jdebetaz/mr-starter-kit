import { Form } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';

interface InvitationProps {
	invitation: { teamName: string; email: string; role: string; matchesSignedInUser: boolean };
	token: string;
}

export default function Invitation({ invitation, token }: InvitationProps) {
	return (
		<div className="mx-auto max-w-lg space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Join {invitation.teamName}</h1>

			{!invitation.matchesSignedInUser && (
				<Callout tone="warning" title="This invitation is for someone else">
					It was sent to {invitation.email}. Sign in with that address to accept it.
				</Callout>
			)}

			<Card className="space-y-4">
				<p className="text-ink-muted text-sm">
					You have been invited to join {invitation.teamName} as {invitation.role}.
				</p>

				{invitation.matchesSignedInUser && (
					<Form action={`/teams/invitations/${token}`} method="post">
						{({ processing }) => (
							<Button type="submit" disabled={processing}>
								Accept the invitation
							</Button>
						)}
					</Form>
				)}
			</Card>
		</div>
	);
}
