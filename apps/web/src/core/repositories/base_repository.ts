import { BaseModel } from '@adonisjs/lucid/orm';
import type { ChainableContract, StrictValues } from '@adonisjs/lucid/types/querybuilder';

export default class BaseRepository<T extends typeof BaseModel> {
	constructor(private readonly model: T) {}

	all(): Promise<Array<InstanceType<T>>> {
		return this.model.all();
	}

	findBy(column: string, value: ChainableContract | StrictValues): Promise<Array<InstanceType<T>>> {
		return this.model.query().where(column, value).exec();
	}

	findById(id: ChainableContract | StrictValues): Promise<InstanceType<T> | null> {
		return this.findOneBy('id', id);
	}

	findOneBy(column: string, value: ChainableContract | StrictValues): Promise<InstanceType<T> | null> {
		return this.model.query().where(column, value).first();
	}
}
