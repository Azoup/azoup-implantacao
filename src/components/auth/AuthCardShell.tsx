import type { ReactNode } from 'react'
import { AzoupOrbMark } from '../AzoupOrbMark'
import { VyntaskLogo } from '../VyntaskLogo'
import { APP_BRAND_ENDORSEMENT } from '../../constants/appMeta'

type AuthCardShellProps = {
  subtitle: string
  children: ReactNode
}

export function AuthCardShell({ subtitle, children }: AuthCardShellProps) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__brand-mark vyntask-logo-wrap">
            <AzoupOrbMark size={44} className="auth__brand-orb" />
            <span className="auth__brand-v-badge">
              <VyntaskLogo variant="brand" size={14} />
            </span>
          </span>
          <div>
            <h1 className="auth__title">
              <span className="auth__title-accent">Vyn</span>Task
              <span className="auth__title-endorse-prefix">by</span>
              <span className="auth__title-endorse">{APP_BRAND_ENDORSEMENT.replace(/^by\s+/i, '')}</span>
            </h1>
            <p className="auth__subtitle">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
