import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens';
import { compose } from '@adonisjs/core/helpers';
import teamsConfig from '#config/teams';
import { WithPrimaryUuid } from '#core/mixins/with_primary_uuid';
import { WithTimestamps } from '#core/mixins/with_timestamps';
import { TeamInvitationSchema } from '#database/schema';

export default class TeamInvitation extends compose(TeamInvitationSchema, WithPrimaryUuid, WithTimestamps) {
	/**
	 * The invitation link's token. `DbAccessTokensProvider` owns generation,
	 * hashing, expiry and verification, so none of it is reimplemented here and
	 * the invitation row stores no secret at all.
	 */
	static invitationTokens = DbAccessTokensProvider.forModel(TeamInvitation, {
		type: 'team_invitation',
		prefix: 'tinv_',
		expiresIn: teamsConfig.invitationTtl,
	});

	get isAccepted(): boolean {
		return this.acceptedAt !== null;
	}
}
