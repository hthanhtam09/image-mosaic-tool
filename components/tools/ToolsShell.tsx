'use client'

import { MosaciLogoMark } from '@/components/MosaciLogo'
import ToolUserHeader from '@/components/tools/ToolUserHeader'
import Link from 'next/link'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'

const PROJECTS_ROUTE = '/studio/projects'
const projectRoute = (slug: string) => `${PROJECTS_ROUTE}/${encodeURIComponent(slug)}`

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, '-').replace(/^-|-$/g, '')
}

function getTabLabel(tab: string | null): string {
  if (!tab) return ''
  switch (tab) {
    case 'image-import': return 'Image Import'
    case 'object-focus': return 'Object Focus'
    case 'batch-upload': return 'Batch Upload'
    case 'before-after': return 'Before / After'
    case 'mark-practice': return 'Mark Practice'
    default: return tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }
}

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

  const projectFolder = useColorByNumberStore((state) => state.projectFolder)
  const showProjectList = useColorByNumberStore((state) => state.workspaceShowProjectList)
  const activeTab = useColorByNumberStore((state) => state.workspaceActiveTab)
  const workspaceStep = useColorByNumberStore((state) => state.workspaceStep)

  const handleStudioClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined' && window.history.state?.fromWorkspaceList) {
      window.history.back()
    } else {
      useColorByNumberStore.getState().setWorkspaceShowProjectList(true)
      useColorByNumberStore.getState().setWorkspaceActiveTab(null)
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', PROJECTS_ROUTE)
      }
    }
  }

  const handleProjectClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (projectFolder) {
      const slug = toSlug(projectFolder.name)
      const nextUrl = `${projectRoute(slug)}?step=design-config`
      useColorByNumberStore.getState().setWorkspaceActiveTab(null)
      useColorByNumberStore.getState().setWorkspaceStep('design-config')
      if (typeof window !== 'undefined') {
        window.history.replaceState(window.history.state, '', nextUrl)
      }
    }
  }

  const tabLabel = getTabLabel(activeTab)

  const slug = projectFolder ? toSlug(projectFolder.name) : ''
  const projectBaseUrl = projectFolder ? projectRoute(slug) : ''

  const stepsToRender: {
    label: string
    href?: string
    onClick?: (e: React.MouseEvent) => void
    isLeaf: boolean
  }[] = []

  if (projectFolder) {
    const isDesignConfigLeaf = workspaceStep === 'design-config' && !activeTab
    stepsToRender.push({
      label: 'Design Config',
      href: isDesignConfigLeaf ? undefined : `${projectBaseUrl}?step=design-config`,
      onClick: isDesignConfigLeaf ? undefined : (e) => {
        e.preventDefault()
        useColorByNumberStore.getState().setWorkspaceActiveTab(null)
        useColorByNumberStore.getState().setWorkspaceStep('design-config')
        if (typeof window !== 'undefined') {
          window.history.replaceState(window.history.state, '', `${projectBaseUrl}?step=design-config`)
        }
      },
      isLeaf: isDesignConfigLeaf,
    })

    if (workspaceStep === 1 || workspaceStep === 2 || workspaceStep === 3 || activeTab) {
      const isConvertLeaf = workspaceStep === 1 && !activeTab
      stepsToRender.push({
        label: 'Convert',
        href: isConvertLeaf ? undefined : `${projectBaseUrl}?step=convert`,
        onClick: isConvertLeaf ? undefined : (e) => {
          e.preventDefault()
          useColorByNumberStore.getState().setWorkspaceActiveTab(null)
          useColorByNumberStore.getState().setWorkspaceStep(1)
          if (typeof window !== 'undefined') {
            window.history.replaceState(window.history.state, '', `${projectBaseUrl}?step=convert`)
          }
        },
        isLeaf: isConvertLeaf,
      })
    }

    if (workspaceStep === 2 || workspaceStep === 3) {
      const isPdfSetupLeaf = workspaceStep === 2 && !activeTab
      stepsToRender.push({
        label: 'PDF Setup',
        href: isPdfSetupLeaf ? undefined : `${projectBaseUrl}?step=pdf`,
        onClick: isPdfSetupLeaf ? undefined : (e) => {
          e.preventDefault()
          useColorByNumberStore.getState().setWorkspaceActiveTab(null)
          useColorByNumberStore.getState().setWorkspaceStep(2)
          if (typeof window !== 'undefined') {
            window.history.replaceState(window.history.state, '', `${projectBaseUrl}?step=pdf`)
          }
        },
        isLeaf: isPdfSetupLeaf,
      })
    }

    if (workspaceStep === 3) {
      const isGeneratingLeaf = workspaceStep === 3 && !activeTab
      stepsToRender.push({
        label: 'Generating PDF',
        isLeaf: isGeneratingLeaf,
      })
    }

    if (activeTab) {
      stepsToRender.push({
        label: tabLabel,
        isLeaf: true,
      })
    }
  }

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
          <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium text-[var(--text-secondary)]">
            <ol className="inline-flex items-center space-x-1 md:space-x-1.5">
              <li className="inline-flex items-center">
                {showProjectList ? (
                  <span className="text-[var(--text-primary)] font-semibold text-sm tracking-wide">Studio</span>
                ) : (
                  <a
                    href={PROJECTS_ROUTE}
                    onClick={handleStudioClick}
                    className="hover:text-[var(--text-primary)] transition-colors text-sm text-[var(--text-secondary)] tracking-wide"
                  >
                    Studio
                  </a>
                )}
              </li>
              {!showProjectList && projectFolder && (
                <>
                  <li className="flex items-center">
                    <svg
                      className="mx-1 h-3.5 w-3.5 text-[var(--text-muted)] opacity-60 md:mx-1.5"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <a
                      href={`${projectRoute(toSlug(projectFolder.name))}?step=design-config`}
                      onClick={handleProjectClick}
                      className="hover:text-[var(--text-primary)] transition-colors text-sm text-[var(--text-secondary)] tracking-wide"
                    >
                      {projectFolder.name}
                    </a>
                  </li>
                  {stepsToRender.map((step, idx) => (
                    <li key={idx} className="flex items-center">
                      <svg
                        className="mx-1 h-3.5 w-3.5 text-[var(--text-muted)] opacity-60 md:mx-1.5"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      {step.isLeaf ? (
                        <span className="text-[var(--text-primary)] font-semibold text-sm tracking-wide">
                          {step.label}
                        </span>
                      ) : (
                        <a
                          href={step.href}
                          onClick={step.onClick}
                          className="hover:text-[var(--text-primary)] transition-colors text-sm text-[var(--text-secondary)] tracking-wide"
                        >
                          {step.label}
                        </a>
                      )}
                    </li>
                  ))}
                </>
              )}
            </ol>
          </nav>
          <ToolUserHeader />
        </header>

        <main className="relative min-h-0 flex-1 overflow-hidden bg-[var(--bg-primary)]">{children}</main>
      </div>
    </div>
  )
}
