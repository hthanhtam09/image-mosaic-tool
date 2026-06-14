'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import MosaciLogo from '@/components/MosaciLogo'
import { initialsOf, userDisplayName, userPlan } from '@/lib/auth/user'
import { logoutSession } from '@/lib/auth/logout'
import { PLAN, PLAN_UPGRADE_CTA } from '@/lib/plans'
import { createClient } from '@/utils/supabase/client'

const navLink = 'rounded-lg px-3.5 py-2 text-[15px] text-text-secondary transition-colors hover:text-text-primary'

type MarketingUser = {
  name: string
  plan: string
  initials: string
}

function UserMenu() {
  const [user, setUser] = useState<MarketingUser | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      const handle = requestAnimationFrame(() => setUser(null))
      return () => cancelAnimationFrame(handle)
    }

    let alive = true
    const supabase = createClient()

    const apply = (authUser: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']) => {
      if (!alive) return
      if (!authUser) {
        const isGuestPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/studio/projects')
        const isGuestMode = typeof window !== 'undefined' && localStorage.getItem('mosaci_guest_mode') === 'true'
        if (isGuestPath || isGuestMode) {
          if (typeof window !== 'undefined' && isGuestPath && !isGuestMode) {
            localStorage.setItem('mosaci_guest_mode', 'true')
          }
          setUser({ name: 'Guest User', plan: 'Guest', initials: 'G' })
        } else {
          setUser(null)
        }
        return
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mosaci_guest_mode')
      }
      const meta = authUser.user_metadata ?? {}
      const appMeta = authUser.app_metadata ?? {}
      const name = userDisplayName(meta, authUser.email)
      setUser({ name, plan: userPlan(meta, appMeta), initials: initialsOf(name) })
    }

    supabase.auth.getUser().then(({ data }) => apply(data.user)).catch(() => { if (alive) setUser(null) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null))
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const logout = async () => {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất?')) return
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mosaci_guest_mode')
    }
    const supabase = createClient()
    await supabase.auth.signOut().catch(() => {})
    await logoutSession()
    window.location.reload()
  }

  const pathname = usePathname()

  // Loading — show nothing until auth state resolves
  if (user === undefined) {
    return <div className="h-9 w-9 rounded-full bg-white/6 animate-pulse" />
  }

  // Guest / not logged in
  if (!user) {
    const signInHref = pathname ? `/login?redirectTo=${encodeURIComponent(pathname)}` : '/login'
    return (
      <>
        <Link className="btn btn-ghost btn-sm" href={signInHref}>
          Sign in
        </Link>
        <Link className="btn btn-primary btn-sm" href="/login?redirectTo=/studio/projects">
          Start your project
        </Link>
      </>
    )
  }

  const isFreePlan = user.plan === PLAN.FREE
  const signInHref = pathname ? `/login?redirectTo=${encodeURIComponent(pathname)}` : '/login'

  return (
    <div className="flex items-center gap-3">
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
          aria-label="Open user menu"
          aria-expanded={open}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-bg-primary">
            {user.initials}
          </span>
          <span className="hidden flex-col items-start sm:flex">
            <span className="max-w-36 truncate text-sm font-semibold leading-4 text-text-primary">
              {user.name}
            </span>
            <span className="mt-0.5 text-[11px] leading-none text-text-secondary">{user.plan}</span>
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border-primary bg-bg-secondary p-2 shadow-2xl shadow-black/30"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
              <p className="mt-0.5 text-xs text-text-secondary">Current plan: {user.plan}</p>
            </div>

            {isFreePlan && (
              <Link
                href="/pricing"
                className="mb-1 block rounded-lg bg-accent px-3 py-2 text-center text-sm font-semibold text-bg-primary transition hover:bg-accent-hover"
              >
                {PLAN_UPGRADE_CTA[PLAN.PLUS]}
              </Link>
            )}

            {user.plan === 'Guest' ? (
              <Link href={signInHref} className="block rounded-lg px-3 py-2 text-sm text-text-primary transition hover:bg-white/5">
                Sign in / Register
              </Link>
            ) : (
              <Link href="/account" className="block rounded-lg px-3 py-2 text-sm text-text-primary transition hover:bg-white/5">
                Account
              </Link>
            )}

            <div className="my-1 h-px bg-border-primary" />
            <button
              type="button"
              onClick={() => void logout()}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
            >
              Log out
            </button>
          </div>
        )}
      </div>
      <Link className="btn btn-primary btn-sm" href="/studio/projects">
        Studio
      </Link>
    </div>
  )
}

export default function MarketingHeader({ active }: Readonly<{ active?: 'tool' | 'pricing' | 'blog' }>) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 flex h-16 w-full items-center border-b transition-[backdrop-filter,border-color] duration-200 ${
        scrolled ? 'border-[#303030] bg-[#1a1a1ad9] backdrop-blur-[10px]' : 'border-border-primary bg-bg-secondary'
      }`}
    >
      <div className="mx-auto flex w-full max-w-350 items-center gap-6 px-6">
        <MosaciLogo />
        <nav className="hidden flex-1 items-center justify-start gap-1 min-[900px]:flex">
          <Link className={`${navLink}${active === 'tool' ? ' text-text-primary' : ''}`} href="/studio/projects">
            Mosaic Tool
          </Link>
          <Link className={`${navLink}${active === 'pricing' ? ' text-text-primary' : ''}`} href="/pricing">
            Pricing
          </Link>
          <Link className={`${navLink}${active === 'blog' ? ' text-text-primary' : ''}`} href="/blog">
            Blog
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 min-[900px]:ml-0">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
