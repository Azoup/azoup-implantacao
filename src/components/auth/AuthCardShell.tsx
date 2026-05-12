import type { ReactNode } from 'react'
import { AzoupLogoMark } from '../AzoupLogoMark'
import { APP_BRAND_NAME_FULL } from '../../constants/appMeta'

type AuthCardShellProps = {
  subtitle: string
  children: ReactNode
}

export function AuthCardShell({ subtitle, children }: AuthCardShellProps) {
  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__brand-mark" aria-hidden>
            <AzoupLogoMark size={44} className="auth__brand-logo-img" />
          </span>
          <div>
            <h1 className="auth__title">{APP_BRAND_NAME_FULL}</h1>
            <p className="auth__subtitle">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
