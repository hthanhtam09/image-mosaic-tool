import Logo from '@/components/shared/Logo'
import type { ReactNode } from 'react'

interface AppHeaderProps {
  actions?: ReactNode
}

export default function AppHeader({ actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex min-w-0 items-center justify-end gap-3">{actions}</div>
      </div>
    </header>
  )
}
