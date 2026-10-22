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
  settings: {
    security: {
      render: typeof routes['settings.security.render']
    }
  }
  twoFactor: {
    start: {
      render: typeof routes['two_factor.start.render']
      execute: typeof routes['two_factor.start.execute']
    }
    verify: {
      render: typeof routes['two_factor.verify.render']
      execute: typeof routes['two_factor.verify.execute']
    }
    recovery: {
      render: typeof routes['two_factor.recovery.render']
      execute: typeof routes['two_factor.recovery.execute']
    }
    disable: {
      execute: typeof routes['two_factor.disable.execute']
    }
  }
  home: typeof routes['home']
}
