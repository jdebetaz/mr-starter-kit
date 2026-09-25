/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  register: {
    render: typeof routes['register.render']
    execute: typeof routes['register.execute']
  }
  login: {
    render: typeof routes['login.render']
    execute: typeof routes['login.execute']
  }
  session: {
    execute: typeof routes['session.execute']
  }
  home: typeof routes['home']
}
