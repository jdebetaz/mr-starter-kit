import { column } from '@adonisjs/lucid/orm';
import { DateTime } from 'luxon';
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers';
import type { BaseModel } from '@adonisjs/lucid/orm';

export const WithTimestamps = <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
	class WithTimestampsClass extends superclass {
		@column.dateTime({ autoCreate: true })
		declare createdAt: DateTime;

		@column.dateTime({ autoCreate: true, autoUpdate: true })
		declare updatedAt: DateTime | null;
	}
	return WithTimestampsClass;
};
