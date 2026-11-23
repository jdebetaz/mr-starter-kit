import { compose } from '@adonisjs/core/helpers';
import { WithPrimaryUuid } from '#core/mixins/with_primary_uuid';
import { WithTimestamps } from '#core/mixins/with_timestamps';
import { TeamMemberSchema } from '#database/schema';

export default class TeamMember extends compose(TeamMemberSchema, WithPrimaryUuid, WithTimestamps) {}
