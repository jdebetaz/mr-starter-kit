import { beforeCreate } from '@adonisjs/lucid/orm';
import { v7 as randomUUID } from 'uuid';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';

export const WithPrimaryUuid = <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
	class WithPrimaryUuidClass extends superclass {
		static selfAssignPrimaryKey = true;

		@beforeCreate()
		static beforeCreate(model: any) {
			model.id = randomUUID();
		}
	}
	return WithPrimaryUuidClass;
};
