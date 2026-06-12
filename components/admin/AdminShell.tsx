'use client'

import AppHeader from '@/components/shared/AppHeader'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { NAV } from './data'
import { NavIcon } from './ui'

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/admin/login'
  }

  return (
    <>
      <AppHeader
        actions={
          <>
            <span className="hidden h-9 items-center rounded-full border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 font-mono text-xs text-[var(--text-secondary)] sm:inline-flex">
              Feb 2026
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-primary)] px-3 text-sm text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] text-sm font-semibold text-[var(--bg-primary)]">
              AD
            </span>
          </>
        }
      />

      <div className="flex min-h-[calc(100vh-4rem)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 lg:block">
          <nav className="sticky top-20 space-y-1" aria-label="Admin navigation">
            {NAV.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <NavIcon name={item.key} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </>
  )
}
