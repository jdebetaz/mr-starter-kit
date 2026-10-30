/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'register.render': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['register.render']['types'],
  },
  'register.execute': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['register.execute']['types'],
  },
  'login.render': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['login.render']['types'],
  },
  'login.execute': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['login.execute']['types'],
  },
  'login.challenge.render': {
    methods: ["GET","HEAD"],
    pattern: '/login/challenge',
    tokens: [[0,"login"],[0,"challenge"]],
    types: placeholder as Registry['login.challenge.render']['types'],
  },
  'login.challenge.execute': {
    methods: ["POST"],
    pattern: '/login/challenge',
    tokens: [[0,"login"],[0,"challenge"]],
    types: placeholder as Registry['login.challenge.execute']['types'],
  },
  'login.challenge.recovery.render': {
    methods: ["GET","HEAD"],
    pattern: '/login/challenge/recovery',
    tokens: [[0,"login"],[0,"challenge"],[0,"recovery"]],
    types: placeholder as Registry['login.challenge.recovery.render']['types'],
  },
  'login.challenge.recovery.execute': {
    methods: ["POST"],
    pattern: '/login/challenge/recovery',
    tokens: [[0,"login"],[0,"challenge"],[0,"recovery"]],
    types: placeholder as Registry['login.challenge.recovery.execute']['types'],
  },
  'session.execute': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [[0,"logout"]],
    types: placeholder as Registry['session.execute']['types'],
  },
  'settings.security.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security',
    tokens: [[0,"settings"],[0,"security"]],
    types: placeholder as Registry['settings.security.render']['types'],
  },
  'two_factor.start.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"]],
    types: placeholder as Registry['two_factor.start.render']['types'],
  },
  'two_factor.start.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"]],
    types: placeholder as Registry['two_factor.start.execute']['types'],
  },
  'two_factor.verify.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor/verify',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"verify"]],
    types: placeholder as Registry['two_factor.verify.render']['types'],
  },
  'two_factor.verify.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/verify',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"verify"]],
    types: placeholder as Registry['two_factor.verify.execute']['types'],
  },
  'two_factor.recovery.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor/recovery',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"recovery"]],
    types: placeholder as Registry['two_factor.recovery.render']['types'],
  },
  'two_factor.recovery.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/recovery',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"recovery"]],
    types: placeholder as Registry['two_factor.recovery.execute']['types'],
  },
  'regenerate_recovery_codes.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor/recovery/regenerate',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"recovery"],[0,"regenerate"]],
    types: placeholder as Registry['regenerate_recovery_codes.render']['types'],
  },
  'two_factor.recovery.regenerate.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/recovery/regenerate',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"recovery"],[0,"regenerate"]],
    types: placeholder as Registry['two_factor.recovery.regenerate.execute']['types'],
  },
  'two_factor.disable.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/disable',
    tokens: [[0,"settings"],[0,"security"],[0,"two-factor"],[0,"disable"]],
    types: placeholder as Registry['two_factor.disable.execute']['types'],
  },
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [[0,"/"]],
    types: placeholder as Registry['home']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
