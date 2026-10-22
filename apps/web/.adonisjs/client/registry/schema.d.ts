/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'register.render': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/register_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/register_controller').default['render']>>>
    }
  }
  'register.execute': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#identity/validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#identity/validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/register_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/register_controller').default['execute']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'login.render': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/login_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/login_controller').default['render']>>>
    }
  }
  'login.execute': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#identity/validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#identity/validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/login_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/login_controller').default['execute']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.execute': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/session_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/session_controller').default['execute']>>>
    }
  }
  'settings.security.render': {
    methods: ["GET","HEAD"]
    pattern: '/settings/security'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/security_settings_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/security_settings_controller').default['render']>>>
    }
  }
  'two_factor.start.render': {
    methods: ["GET","HEAD"]
    pattern: '/settings/security/two-factor'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/start_totp_enrollment_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/start_totp_enrollment_controller').default['render']>>>
    }
  }
  'two_factor.start.execute': {
    methods: ["POST"]
    pattern: '/settings/security/two-factor'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/start_totp_enrollment_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/start_totp_enrollment_controller').default['execute']>>>
    }
  }
  'two_factor.verify.render': {
    methods: ["GET","HEAD"]
    pattern: '/settings/security/two-factor/verify'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/confirm_totp_enrollment_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/confirm_totp_enrollment_controller').default['render']>>>
    }
  }
  'two_factor.verify.execute': {
    methods: ["POST"]
    pattern: '/settings/security/two-factor/verify'
    types: {
      body: ExtractBody<InferInput<(typeof import('#identity/validators/two_factor').totpCodeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#identity/validators/two_factor').totpCodeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/confirm_totp_enrollment_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/confirm_totp_enrollment_controller').default['execute']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'two_factor.recovery.render': {
    methods: ["GET","HEAD"]
    pattern: '/settings/security/two-factor/recovery'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/recovery_codes_controller').default['render']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/recovery_codes_controller').default['render']>>>
    }
  }
  'two_factor.recovery.execute': {
    methods: ["POST"]
    pattern: '/settings/security/two-factor/recovery'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/recovery_codes_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/recovery_codes_controller').default['execute']>>>
    }
  }
  'two_factor.recovery.regenerate.execute': {
    methods: ["POST"]
    pattern: '/settings/security/two-factor/recovery/regenerate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#identity/validators/two_factor').disableTotpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#identity/validators/two_factor').disableTotpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/regenerate_recovery_codes_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/regenerate_recovery_codes_controller').default['execute']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'two_factor.disable.execute': {
    methods: ["POST"]
    pattern: '/settings/security/two-factor/disable'
    types: {
      body: ExtractBody<InferInput<(typeof import('#identity/validators/two_factor').disableTotpValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#identity/validators/two_factor').disableTotpValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#app/identity/controllers/disable_totp_controller').default['execute']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#app/identity/controllers/disable_totp_controller').default['execute']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: unknown
      errorResponse: unknown
    }
  }
}
