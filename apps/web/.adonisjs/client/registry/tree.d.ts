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
    challenge: {
      render: typeof routes['login.challenge.render']
      execute: typeof routes['login.challenge.execute']
      recovery: {
        render: typeof routes['login.challenge.recovery.render']
        execute: typeof routes['login.challenge.recovery.execute']
      }
    }
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
      regenerate: {
        execute: typeof routes['two_factor.recovery.regenerate.execute']
      }
    }
    disable: {
      execute: typeof routes['two_factor.disable.execute']
    }
  }
  regenerateRecoveryCodes: {
    render: typeof routes['regenerate_recovery_codes.render']
  }
  workspace: {
    switch: typeof routes['workspace.switch']
  }
  teams: {
    settings: {
      render: typeof routes['teams.settings.render']
    }
    create: typeof routes['teams.create']
    members: {
      invite: typeof routes['teams.members.invite']
      remove: typeof routes['teams.members.remove']
      role: typeof routes['teams.members.role']
    }
    ownership: {
      transfer: typeof routes['teams.ownership.transfer']
    }
    invitations: {
      revoke: typeof routes['teams.invitations.revoke']
    }
  }
  home: typeof routes['home']
}
