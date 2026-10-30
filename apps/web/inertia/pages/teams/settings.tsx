import { Form } from '@adonisjs/inertia/react';
import { Button } from '@boilerplate/design-system/button';
import { Callout } from '@boilerplate/design-system/callout';
import { Card } from '@boilerplate/design-system/card';
import { Field } from '@boilerplate/design-system/field';
import type { PendingInvitationRow } from '#teams/queries/pending_invitations_query';
import type { TeamMemberRow } from '#teams/queries/team_members_query';
import type { TeamSummary } from '#teams/types/team';

interface TeamSettingsProps {
	teams: Array<{ [K in keyof TeamSummary]: TeamSummary[K] }>;
	team: { id: string; name: string } | null;
	members: Array<{ [K in keyof TeamMemberRow]: TeamMemberRow[K] }>;
	invitations: Array<{ [K in keyof PendingInvitationRow]: PendingInvitationRow[K] }>;
	can: { manageMembers: boolean; transferOwnership: boolean } | null;
}

export default function TeamSettings({ teams, team, members, invitations, can }: TeamSettingsProps) {
	return (
		<div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
			<h1 className="text-ink text-2xl font-bold tracking-tight">Team</h1>

			{!team && (
				<Callout tone="info" title="You are in your personal workspace">
					Create a team to share this workspace with other people.
				</Callout>
			)}

			{teams.length > 0 && (
				<Card className="space-y-4">
					<h2 className="text-ink text-lg font-semibold">Switch workspace</h2>

					<Form action="/workspace/switch" method="post" className="space-y-3">
						{({ processing }) => (
							<>
								<Field label="Workspace" name="teamId">
									<select name="teamId" defaultValue={team?.id ?? ''} className="w-full">
										<option value="">Personal</option>
										{teams.map((option) => (
											<option key={option.id} value={option.id}>
												{option.name}
											</option>
										))}
									</select>
								</Field>
								<Button type="submit" disabled={processing}>
									Switch
								</Button>
							</>
						)}
					</Form>
				</Card>
			)}

			<Card className="space-y-4">
				<h2 className="text-ink text-lg font-semibold">Create a team</h2>

				<Form action="/teams" method="post" className="space-y-3" resetOnSuccess>
					{({ processing, errors }) => (
						<>
							<Field label="Name" name="name" error={errors.name}>
								<input name="name" type="text" required className="w-full" />
							</Field>
							<Button type="submit" disabled={processing}>
								Create team
							</Button>
						</>
					)}
				</Form>
			</Card>

			{team && (
				<Card className="space-y-4">
					<h2 className="text-ink text-lg font-semibold">Members of {team.name}</h2>

					<ul className="divide-ink-muted/20 divide-y">
						{members.map((member) => (
							<li key={member.userId} className="flex items-center justify-between py-3">
								<div>
									<p className="text-ink text-sm font-medium">{member.fullName ?? member.email}</p>
									<p className="text-ink-muted text-xs">
										{member.email} &middot; {member.role}
									</p>
								</div>

								{can?.manageMembers && member.role !== 'owner' && (
									<div className="flex items-center gap-2">
										<Form action="/settings/team/members/role" method="patch">
											{({ processing }) => (
												<>
													<input type="hidden" name="userId" value={member.userId} />
													<select
														name="role"
														defaultValue={member.role}
														className="text-sm"
														onChange={(event) => event.currentTarget.form?.requestSubmit()}
														disabled={processing}
													>
														<option value="member">Member</option>
														<option value="admin">Admin</option>
													</select>
												</>
											)}
										</Form>

										{can.transferOwnership && (
											<Form action="/settings/team/ownership" method="post">
												{({ processing }) => (
													<>
														<input type="hidden" name="userId" value={member.userId} />
														<Button type="submit" intent="secondary" disabled={processing}>
															Make owner
														</Button>
													</>
												)}
											</Form>
										)}

										<Form action="/settings/team/members" method="delete">
											{({ processing }) => (
												<>
													<input type="hidden" name="userId" value={member.userId} />
													<Button type="submit" intent="secondary" disabled={processing}>
														Remove
													</Button>
												</>
											)}
										</Form>
									</div>
								)}
							</li>
						))}
					</ul>
				</Card>
			)}

			{team && can?.manageMembers && (
				<Card className="space-y-4">
					<h2 className="text-ink text-lg font-semibold">Invite someone</h2>

					<Form action="/settings/team/members/invite" method="post" className="space-y-3" resetOnSuccess>
						{({ processing, errors }) => (
							<>
								<Field label="Email address" name="email" error={errors.email}>
									<input name="email" type="email" required className="w-full" />
								</Field>
								<Field label="Role" name="role" error={errors.role}>
									<select name="role" defaultValue="member" className="w-full">
										<option value="member">Member</option>
										<option value="admin">Admin</option>
									</select>
								</Field>
								<Button type="submit" disabled={processing}>
									Send invitation
								</Button>
							</>
						)}
					</Form>

					{invitations.length > 0 && (
						<ul className="divide-ink-muted/20 divide-y">
							{invitations.map((invitation) => (
								<li key={invitation.id} className="flex items-center justify-between py-3">
									<p className="text-ink-muted text-sm">
										{invitation.email} &middot; {invitation.role}
									</p>

									<Form action="/settings/team/invitations" method="delete">
										{({ processing }) => (
											<>
												<input type="hidden" name="invitationId" value={invitation.id} />
												<Button type="submit" intent="secondary" disabled={processing}>
													Revoke
												</Button>
											</>
										)}
									</Form>
								</li>
							))}
						</ul>
					)}
				</Card>
			)}
		</div>
	);
}
