import { BaseTransformer } from '@adonisjs/core/transformers';
import type Team from '#teams/models/team';

export default class TeamTransformer extends BaseTransformer<Team> {
	toObject() {
		return this.pick(this.resource, ['id', 'name', 'createdAt']);
	}
}
