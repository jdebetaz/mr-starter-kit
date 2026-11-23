import { compose } from '@adonisjs/core/helpers';
import { WithPrimaryUuid } from '#core/mixins/with_primary_uuid';
import { WithTimestamps } from '#core/mixins/with_timestamps';
import { TeamSchema } from '#database/schema';

export default class Team extends compose(TeamSchema, WithPrimaryUuid, WithTimestamps) {}
