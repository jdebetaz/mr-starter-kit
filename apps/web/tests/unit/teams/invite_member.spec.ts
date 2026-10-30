import db from '@adonisjs/lucid/services/db';
import { test } from '@japa/runner';
import InviteMember from '#teams/actions/invite_member';
import TeamInvitationMail from '#teams/mails/team_invitation_mail';
import TeamInvitationRepository from '#teams/repositories/team_invitation_repository';
import TeamRepository from '#teams/repositories/team_repository';
import { truncateBetweenTests } from '#tests/helpers/database';
import { captureMail, sentMails } from '#tests/helpers/mail';
import { createTeam } from '#tests/helpers/team_factory';

function inviteMember() {
	return new InviteMember(new TeamRepository(), new TeamInvitationRepository());
}

test.group('InviteMember', (group) => {
	truncateBetweenTests(group);
	captureMail(group);

	test('an invitation is stored and emailed to the address', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await inviteMember().execute({
			team,
			inviter: owner,
			inviterRole: 'owner',
			email: 'invitee@example.com',
			role: 'member',
		});

		assert.isTrue(result.ok);

		const rows = await db.from('team_invitations').where('team_id', team.id);

		assert.lengthOf(rows, 1);
		assert.equal(rows[0].email, 'invitee@example.com');

		const sent = sentMails();

		assert.lengthOf(sent, 1);
		assert.instanceOf(sent[0], TeamInvitationMail);
	});

	test('inviting an existing member is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await inviteMember().execute({
			team,
			inviter: owner,
			inviterRole: 'owner',
			email: owner.email,
			role: 'member',
		});

		assert.isFalse(result.ok);
		assert.equal(result.ok ? '' : result.error.type, 'already_a_member');
		assert.lengthOf(sentMails(), 0);
	});

	test('inviting an address with a pending invitation is refused', async ({ assert }) => {
		const { team, owner } = await createTeam();
		const params = {
			team,
			inviter: owner,
			inviterRole: 'owner' as const,
			email: 'twice@example.com',
			role: 'member' as const,
		};

		await inviteMember().execute(params);

		const second = await inviteMember().execute(params);

		assert.isFalse(second.ok);
		assert.equal(second.ok ? '' : second.error.type, 'already_invited');
		assert.lengthOf(sentMails(), 1);
	});

	test('a member cannot invite', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await inviteMember().execute({
			team,
			inviter: owner,
			inviterRole: 'member',
			email: 'invitee@example.com',
			role: 'member',
		});

		assert.isFalse(result.ok);
		assert.equal(result.ok ? '' : result.error.type, 'not_permitted');
	});

	/**
	 * The token reaches the invitee by email. DbAccessTokensProvider stores only
	 * its hash, in auth_access_tokens, and the invitation row holds no secret.
	 */
	test('only a hash of the token is stored', async ({ assert }) => {
		const { team, owner } = await createTeam();

		const result = await inviteMember().execute({
			team,
			inviter: owner,
			inviterRole: 'owner',
			email: 'invitee@example.com',
			role: 'member',
		});

		assert.isTrue(result.ok);

		const token = result.ok ? result.value.token : '';
		const rows = await db.from('team_invitations').where('team_id', team.id);
		const tokens = await db.from('auth_access_tokens').where('type', 'team_invitation');

		assert.notProperty(rows[0], 'token_hash');
		assert.lengthOf(tokens, 1);
		assert.notEqual(tokens[0].hash, token);
		assert.equal(tokens[0].tokenable_id, rows[0].id);
	});
});
