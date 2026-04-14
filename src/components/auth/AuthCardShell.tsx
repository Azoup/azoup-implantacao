import type { ReactNode } from 'react'
import { VyntaskLogo } from '../VyntaskLogo'

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
            <VyntaskLogo variant="brand" size={52} aria-hidden />
          </span>
          <div>
            <h1 className="auth__title">
              <span className="auth__title-accent">Vyn</span>Task
            </h1>
            <p className="auth__subtitle">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
