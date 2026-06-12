'use client'

import Logo from '@/components/shared/Logo'
import { normalizeBillingInterval, normalizePlan } from '@/lib/auth/user'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { FormEvent, useState } from 'react'

const tileDelays = ['0s', '.3s', '.6s', '.2s', '.5s', '.8s', '.4s', '.7s', '1s']
const highlightedTiles = new Set([1, 3, 8])

const readLoginConfig = () => {
  if (typeof window === 'undefined') {
    return {
      selectedPlan: 'Free',
      billing: 'monthly',
      redirectTo: '/',
    }
  }

  const params = new URLSearchParams(window.location.search)
  const nextRedirect = params.get('redirectTo')

  return {
    selectedPlan: normalizePlan(params.get('plan')),
    billing: normalizeBillingInterval(params.get('billing')),
    redirectTo: nextRedirect?.startsWith('/') ? nextRedirect : '/',
  }
}

export default function LoginPage() {
  const [initialConfig] = useState(readLoginConfig)
  const { selectedPlan, billing, redirectTo } = initialConfig
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const oauthRedirectUrl = () => {
    if (selectedPlan !== 'Free') return `${window.location.origin}/pricing?checkout=${selectedPlan}&billing=${billing}`
    return `${window.location.origin}${redirectTo}`
  }

  const continueWithGoogle = async () => {
    setError('')
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectUrl() },
    })
    if (oauthError) setError(oauthError.message)
  }

  const sendMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }

    setLoading(true)
    const redirectUrl = selectedPlan !== 'Free' ? `/pricing?checkout=${selectedPlan}&billing=${billing}` : redirectTo
    const { error: magicError } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${redirectUrl}`,
      },
    })
    setLoading(false)

    if (magicError) {
      setError(magicError.message)
      return
    }
    setMessage('Magic link sent! Check your inbox.')
  }

  return (
    <main className="grid min-h-screen bg-bg-primary text-text-primary lg:grid-cols-[45%_55%]">
      {/* Left decorative panel */}
      <section className="relative hidden overflow-hidden border-r border-border-primary bg-[radial-gradient(circle_at_50%_45%,rgba(192,205,227,0.18),transparent_34%),linear-gradient(135deg,var(--bg-secondary),var(--bg-primary))] p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="absolute left-12 top-8">
          <Logo />
        </div>
        <div className="relative z-10 max-w-sm">
          <div className="mb-10 grid w-max grid-cols-3 gap-2">
            {tileDelays.map((delay, index) => (
              <span
                key={delay + index}
                className={`h-14 w-14 rounded-xl border border-accent/20 ${
                  highlightedTiles.has(index) ? 'bg-accent/20' : 'bg-white/5'
                } animate-pulse`}
                style={{ animationDelay: delay }}
              />
            ))}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Turn images into coloring books.</h1>
          <p className="mt-4 text-base leading-7 text-text-secondary">
            Upload, pick a mosaic style, and export a print-ready PDF from one focused workspace.
          </p>
        </div>
      </section>

      {/* Right auth panel */}
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-border-primary bg-bg-secondary p-8 shadow-2xl shadow-black/30">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-center text-2xl font-semibold tracking-tight">Sign in to Mosaci</h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Create, save, and export your mosaic projects.
          </p>

          {selectedPlan !== 'Free' && (
            <div className="mt-5 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-text-primary">
              Continue to {selectedPlan} checkout after sign-in.
            </div>
          )}

          {/* Magic link form */}
          <form className="mt-6 space-y-4" onSubmit={(event) => void sendMagicLink(event)}>
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Email</span>
              <input
                className="mt-2 h-11 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent"
                placeholder="you@email.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-sm text-text-primary">
                {message}
              </p>
            )}

            <button
              className="h-12 w-full rounded-lg bg-accent text-sm font-semibold text-bg-primary shadow-lg shadow-accent/10 transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3 text-xs text-text-secondary">
            <span className="h-px flex-1 bg-border-primary" />
            or continue with
            <span className="h-px flex-1 bg-border-primary" />
          </div>

          {/* Google */}
          <button
            className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border-primary bg-transparent text-sm font-medium text-text-primary transition hover:bg-white/5"
            type="button"
            onClick={() => void continueWithGoogle()}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Guest */}
          <Link
            href={redirectTo}
            className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-border-primary bg-transparent text-sm font-medium text-text-secondary transition hover:bg-white/5 hover:text-text-primary"
          >
            Continue as Guest
          </Link>

          <p className="mt-4 text-center text-xs text-text-secondary">
            New to Mosaci? <span className="text-text-muted">No account needed to try the tool.</span>
          </p>

          <div className="mt-8 text-center text-xs text-text-secondary">
            <Link className="transition hover:text-text-primary" href="/">
              Back to Mosaci
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
