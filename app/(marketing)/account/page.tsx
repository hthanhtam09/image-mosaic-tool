'use client'

import { initialsOf, userDisplayName, userPlan } from '@/lib/auth/user'
import AppHeader from '@/components/shared/AppHeader'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const cardClass =
  'rounded-xl border border-border-primary bg-bg-secondary p-5 shadow-xl shadow-black/10'
const chipClass = 'inline-flex rounded-full px-3 py-1 text-xs font-medium'

type AccountUser = {
  name: string
  email: string
  plan: 'Free' | 'Pro' | 'Studio'
  subscriptionStatus: string
  billingInterval: string
}

const planPrice = {
  Free: '$0',
  Pro: '$19',
  Studio: '$49',
} as const

export default function AccountPage() {
  const [account, setAccount] = useState<AccountUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return
      if (!data.user) {
        window.location.assign('/login?redirectTo=/account')
        return
      }

      const metadata = data.user.user_metadata ?? {}
      setAccount({
        name: userDisplayName(metadata, data.user.email),
        email: data.user.email ?? '',
        plan: userPlan(metadata, data.user.app_metadata ?? {}),
        subscriptionStatus:
          typeof metadata.subscription_status === 'string' ? metadata.subscription_status : 'active',
        billingInterval:
          typeof metadata.billing_interval === 'string' ? metadata.billing_interval : 'monthly',
      })
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown)
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut().catch(() => {})
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.assign('/login')
  }

  const initials = account ? initialsOf(account.name) : 'U'
  const currentPrice = account ? planPrice[account.plan] : '$0'

  return (
    <>
      <AppHeader
        actions={
          <>
            {account && (
              <span className="hidden h-9 items-center rounded-full border border-border-primary bg-bg-tertiary px-3 text-xs font-semibold text-text-primary sm:inline-flex">
                {account.plan}
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-bg-primary"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen((open) => !open)
                }}
              >
                {initials}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border-primary bg-bg-secondary p-2 shadow-2xl shadow-black/30">
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm text-text-primary transition hover:bg-white/5"
                    href="/account"
                  >
                    Account
                  </Link>
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm text-text-primary transition hover:bg-white/5"
                    href="/studio/projects"
                  >
                    Mosaic Studio
                  </Link>
                  <Link
                    className="block rounded-lg px-3 py-2 text-sm text-text-primary transition hover:bg-white/5"
                    href="/admin"
                  >
                    Admin
                  </Link>
                  <div className="my-2 h-px bg-border-primary" />
                  <button
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
                    type="button"
                    onClick={() => void logout()}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-10 text-text-primary sm:px-6 lg:px-8">
        {loading && (
          <div className="animate-pulse space-y-5" aria-busy aria-label="Loading account">
            <section className={cardClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="h-16 w-16 shrink-0 rounded-full bg-bg-tertiary" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-bg-tertiary" />
                  <div className="h-4 w-56 rounded bg-bg-tertiary" />
                </div>
              </div>
            </section>
            <section className={cardClass}>
              <div className="h-4 w-24 rounded bg-bg-tertiary" />
              <div className="mt-4 h-10 w-32 rounded bg-bg-tertiary" />
              <div className="mt-4 h-4 w-64 rounded bg-bg-tertiary" />
            </section>
            <section className={cardClass}>
              <div className="h-4 w-36 rounded bg-bg-tertiary" />
              <div className="mt-4 h-4 w-full rounded bg-bg-tertiary" />
              <div className="mt-2 h-4 w-3/4 rounded bg-bg-tertiary" />
            </section>
          </div>
        )}

        {!loading && account && (
          <>
        <section>
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="mt-2 text-text-secondary">Manage your profile, plan, and billing.</p>
        </section>

        <section className={cardClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-bg-primary">
              {initials}
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{account.name}</h2>
              <p className="text-sm text-text-secondary">{account.email}</p>
            </div>
            <button
              className="h-10 rounded-lg border border-border-primary px-4 text-sm font-medium transition hover:bg-white/5"
              type="button"
            >
              Edit profile
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Current plan
            </h2>
            <span className={`${chipClass} bg-accent/10 text-accent`}>
              {account.plan}
            </span>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-3xl font-semibold">
                {currentPrice}{' '}
                <span className="font-sans text-base font-normal text-text-secondary">
                  /{account.billingInterval === 'yearly' ? 'month, billed yearly' : 'month'}
                </span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Status: {account.subscriptionStatus}. Payment provider is not connected yet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="h-10 rounded-lg border border-border-primary px-4 py-2 text-sm font-medium transition hover:bg-white/5"
                href="/pricing"
              >
                Manage subscription
              </Link>
              <Link
                className="h-10 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg-primary transition hover:bg-accent-hover"
                href="/pricing"
              >
                {account.plan === 'Free' ? 'Upgrade' : 'Change plan'}
              </Link>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Usage this month
            </h2>
            <span className="text-sm text-text-secondary">Local workspace</span>
          </div>
          <p className="text-sm leading-6 text-text-secondary">
            Export usage is not connected to a server counter yet. Projects and generated files are stored locally in your browser workspace.
          </p>
        </section>

        <section className="overflow-hidden rounded-xl border border-border-primary bg-bg-secondary shadow-xl shadow-black/10">
          <div className="px-5 pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Invoice history
            </h2>
          </div>
          <p className="px-5 py-6 text-sm text-text-secondary">
            Invoices will appear here after the payment provider is connected.
          </p>
        </section>

        <section className={`${cardClass} border-red-400/25`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-red-300">Delete account</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Permanently remove your account and all generated books.
              </p>
            </div>
            <button
              className="h-10 rounded-lg border border-red-400/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
              type="button"
            >
              Delete account
            </button>
          </div>
        </section>
          </>
        )}
      </main>
    </>
  )
}
