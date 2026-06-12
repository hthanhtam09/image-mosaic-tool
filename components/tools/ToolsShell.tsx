'use client'

import { MosaciLogoMark } from '@/components/MosaciLogo'
import ToolUserHeader from '@/components/tools/ToolUserHeader'
import Link from 'next/link'
import { type CSSProperties, type ReactNode, useState } from 'react'

type NavItem = {
  label: string
  href: string
  icon: ReactNode
  active?: boolean
}

const toolTheme = {
  '--accent': '#c0cde3',
  '--accent-primary': '#c0cde3',
  '--accent-hover': '#d4deee',
  '--accent-secondary': 'rgba(192, 205, 227, 0.15)',
  '--accent-muted': 'rgba(192, 205, 227, 0.15)',
  '--color-accent': '#c0cde3',
  '--color-accent-hover': '#d4deee',
  '--bg-primary': '#121212',
  '--bg-secondary': '#1a1a1a',
  '--bg-tertiary': '#242424',
  '--bg-elevated': '#1a1a1a',
  '--bg-card': '#1a1a1a',
  '--border-primary': '#262626',
  '--border-default': '#262626',
  '--border-subtle': 'rgba(255, 255, 255, 0.06)',
  '--text-primary': '#ffffff',
  '--text-secondary': '#9ba3b0',
  '--text-muted': '#5a5f68',
} as CSSProperties

const primaryNav: NavItem[] = [
  {
    label: 'Workspace',
    href: '/studio/projects',
    active: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
]

function SidebarLink({ item, expanded, hovering }: { item: NavItem; expanded: boolean; hovering: boolean }) {
  const showLabel = expanded || hovering
  return (
    <Link
      href={item.href}
      title={!showLabel ? item.label : undefined}
      aria-current={item.active ? 'page' : undefined}
      className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium transition-all duration-150 ${
        item.active
          ? 'bg-white/[0.08] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
      }`}
    >
      {item.active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--accent)]" />
      )}
      <span className="shrink-0">{item.icon}</span>
      <span
        className="overflow-hidden whitespace-nowrap text-sm transition-all duration-200"
        style={{ opacity: showLabel ? 1 : 0, maxWidth: showLabel ? 160 : 0 }}
      >
        {item.label}
      </span>
    </Link>
  )
}

export default function ToolsShell({ children }: { children: ReactNode }) {
  const [hovering, setHovering] = useState(false)

  const sidebarWidth = hovering ? 220 : 56

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={toolTheme}
    >
      {/* Logo */}
      <Link
        href="/"
        className="fixed left-0 top-0 z-50 flex h-14 w-14 shrink-0 items-center justify-center border-b border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]"
        title="Back to Mosaci home"
      >
        <MosaciLogoMark size="sm" />
      </Link>

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 top-14 z-40 flex flex-col border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width: sidebarWidth }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3" aria-label="Tools navigation">
          {primaryNav.map((item) => (
            <SidebarLink key={item.label} item={item} expanded={false} hovering={hovering} />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div
        className="flex h-screen min-w-0 flex-col transition-[padding-left] duration-200 ease-out"
        style={{ paddingLeft: 56 }}
      >
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4">
          <span className="text-lg font-medium">Studio</span>
          <ToolUserHeader />
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden bg-[var(--bg-primary)]">{children}</main>
      </div>
    </div>
  )
}
