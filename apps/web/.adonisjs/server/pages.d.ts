import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'home': ExtractProps<(typeof import('../../inertia/pages/home.tsx'))['default']>
    'settings/security': ExtractProps<(typeof import('../../inertia/pages/settings/security.tsx'))['default']>
    'settings/two-factor/recovery': ExtractProps<(typeof import('../../inertia/pages/settings/two-factor/recovery.tsx'))['default']>
    'settings/two-factor/start': ExtractProps<(typeof import('../../inertia/pages/settings/two-factor/start.tsx'))['default']>
    'settings/two-factor/verify': ExtractProps<(typeof import('../../inertia/pages/settings/two-factor/verify.tsx'))['default']>
  }
}
