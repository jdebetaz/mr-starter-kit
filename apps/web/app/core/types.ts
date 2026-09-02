import { Opaque } from '@adonisjs/core/types/common';

export type UUID = Opaque<string, 'UUID'>;


export type PickableKey<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
