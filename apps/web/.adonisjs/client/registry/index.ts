/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'register.render': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['register.render']['types'],
  },
  'register.execute': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['register.execute']['types'],
  },
  'login.render': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['login.render']['types'],
  },
  'login.execute': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['login.execute']['types'],
  },
  'session.execute': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.execute']['types'],
  },
  'settings.security.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security',
    tokens: [{"old":"/settings/security","type":0,"val":"settings","end":""},{"old":"/settings/security","type":0,"val":"security","end":""}],
    types: placeholder as Registry['settings.security.render']['types'],
  },
  'two_factor.start.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor',
    tokens: [{"old":"/settings/security/two-factor","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor","type":0,"val":"two-factor","end":""}],
    types: placeholder as Registry['two_factor.start.render']['types'],
  },
  'two_factor.start.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor',
    tokens: [{"old":"/settings/security/two-factor","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor","type":0,"val":"two-factor","end":""}],
    types: placeholder as Registry['two_factor.start.execute']['types'],
  },
  'two_factor.verify.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor/verify',
    tokens: [{"old":"/settings/security/two-factor/verify","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"two-factor","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"verify","end":""}],
    types: placeholder as Registry['two_factor.verify.render']['types'],
  },
  'two_factor.verify.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/verify',
    tokens: [{"old":"/settings/security/two-factor/verify","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"two-factor","end":""},{"old":"/settings/security/two-factor/verify","type":0,"val":"verify","end":""}],
    types: placeholder as Registry['two_factor.verify.execute']['types'],
  },
  'two_factor.recovery.render': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security/two-factor/recovery',
    tokens: [{"old":"/settings/security/two-factor/recovery","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"two-factor","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"recovery","end":""}],
    types: placeholder as Registry['two_factor.recovery.render']['types'],
  },
  'two_factor.recovery.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/recovery',
    tokens: [{"old":"/settings/security/two-factor/recovery","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"two-factor","end":""},{"old":"/settings/security/two-factor/recovery","type":0,"val":"recovery","end":""}],
    types: placeholder as Registry['two_factor.recovery.execute']['types'],
  },
  'two_factor.disable.execute': {
    methods: ["POST"],
    pattern: '/settings/security/two-factor/disable',
    tokens: [{"old":"/settings/security/two-factor/disable","type":0,"val":"settings","end":""},{"old":"/settings/security/two-factor/disable","type":0,"val":"security","end":""},{"old":"/settings/security/two-factor/disable","type":0,"val":"two-factor","end":""},{"old":"/settings/security/two-factor/disable","type":0,"val":"disable","end":""}],
    types: placeholder as Registry['two_factor.disable.execute']['types'],
  },
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
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
