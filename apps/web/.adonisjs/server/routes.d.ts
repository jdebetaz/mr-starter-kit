import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'register.render': { paramsTuple?: []; params?: {} }
    'register.execute': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'login.execute': { paramsTuple?: []; params?: {} }
    'session.execute': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'register.render': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'register.render': { paramsTuple?: []; params?: {} }
    'login.render': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'register.execute': { paramsTuple?: []; params?: {} }
    'login.execute': { paramsTuple?: []; params?: {} }
    'session.execute': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}