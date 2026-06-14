'use client'

import AppHeader from '@/components/shared/AppHeader'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { NAV } from './data'
import { NavIcon } from './ui'
import { logoutSession } from '@/lib/auth/logout'

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const logout = async () => {
    await logoutSession()
    window.location.href = '/admin/login'
  }

  return (
    <>
      <AppHeader
        actions={
          <>
            <span className="hidden h-9 items-center rounded-full border border-border-primary bg-bg-tertiary px-3 font-mono text-xs text-text-secondary sm:inline-flex">
              Admin
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-primary px-3 text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-bg-primary">
              AD
            </span>
          </>
        }
      />

      <div className="flex min-h-[calc(100vh-4rem)] bg-bg-primary text-text-primary">
        <aside className="hidden w-64 shrink-0 border-r border-border-primary bg-bg-secondary p-3 lg:block">
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
                      ? 'bg-accent/10 text-accent'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
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
