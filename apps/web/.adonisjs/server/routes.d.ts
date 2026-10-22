import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'register.render': { paramsTuple?: []; params?: {} }
    'register.execute': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'login.execute': { paramsTuple?: []; params?: {} }
    'login.challenge.render': { paramsTuple?: []; params?: {} }
    'login.challenge.execute': { paramsTuple?: []; params?: {} }
    'login.challenge.recovery.render': { paramsTuple?: []; params?: {} }
    'login.challenge.recovery.execute': { paramsTuple?: []; params?: {} }
    'session.execute': { paramsTuple?: []; params?: {} }
    'settings.security.render': { paramsTuple?: []; params?: {} }
    'two_factor.start.render': { paramsTuple?: []; params?: {} }
    'two_factor.start.execute': { paramsTuple?: []; params?: {} }
    'two_factor.verify.render': { paramsTuple?: []; params?: {} }
    'two_factor.verify.execute': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.render': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.execute': { paramsTuple?: []; params?: {} }
    'regenerate_recovery_codes.render': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.regenerate.execute': { paramsTuple?: []; params?: {} }
    'two_factor.disable.execute': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'register.render': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'login.challenge.render': { paramsTuple?: []; params?: {} }
    'login.challenge.recovery.render': { paramsTuple?: []; params?: {} }
    'settings.security.render': { paramsTuple?: []; params?: {} }
    'two_factor.start.render': { paramsTuple?: []; params?: {} }
    'two_factor.verify.render': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.render': { paramsTuple?: []; params?: {} }
    'regenerate_recovery_codes.render': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'register.render': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'login.challenge.render': { paramsTuple?: []; params?: {} }
    'login.challenge.recovery.render': { paramsTuple?: []; params?: {} }
    'settings.security.render': { paramsTuple?: []; params?: {} }
    'two_factor.start.render': { paramsTuple?: []; params?: {} }
    'two_factor.verify.render': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.render': { paramsTuple?: []; params?: {} }
    'regenerate_recovery_codes.render': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'register.execute': { paramsTuple?: []; params?: {} }
    'login.execute': { paramsTuple?: []; params?: {} }
    'login.challenge.execute': { paramsTuple?: []; params?: {} }
    'login.challenge.recovery.execute': { paramsTuple?: []; params?: {} }
    'session.execute': { paramsTuple?: []; params?: {} }
    'two_factor.start.execute': { paramsTuple?: []; params?: {} }
    'two_factor.verify.execute': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.execute': { paramsTuple?: []; params?: {} }
    'two_factor.recovery.regenerate.execute': { paramsTuple?: []; params?: {} }
    'two_factor.disable.execute': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}