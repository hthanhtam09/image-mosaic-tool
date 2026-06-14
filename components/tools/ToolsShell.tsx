'use client'

import { MosaciLogoMark } from '@/components/MosaciLogo'
import ToolUserHeader from '@/components/tools/ToolUserHeader'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [hovering, setHovering] = useState(false)

  const projectFolder = useColorByNumberStore((state) => state.projectFolder)
  const showProjectList = useColorByNumberStore((state) => state.workspaceShowProjectList)
  const activeTab = useColorByNumberStore((state) => state.workspaceActiveTab)
  const workspaceStep = useColorByNumberStore((state) => state.workspaceStep)
  const projects = useColorByNumberStore((state) => state.projects)

  let activeStepId = 'import'
  // Folder import mode: when at PDF step with no converted projects (directImages flow)
  // Standard mode: full pipeline import → design → convert → pdf
  const isFolderMode = projects.length === 0 && (workspaceStep === 2 || workspaceStep === 3)

  if (activeTab !== null) {
    // Show the specific tab name as the current "step" label
    activeStepId = activeTab
  } else if (workspaceStep === 'design-config') {
    activeStepId = 'design'
  } else if (workspaceStep === 1) {
    activeStepId = projects.length === 0 ? 'import' : 'convert'
  } else if (workspaceStep === 2 || workspaceStep === 3) {
    activeStepId = 'pdf'
  }

  // All possible steps for each mode
  const allSteps = isFolderMode
    ? [
        { id: 'import', label: 'Import images' },
        { id: 'pdf', label: 'PDF' },
      ]
    : [
        { id: 'import', label: 'Import images' },
        { id: 'design', label: 'Design config' },
        { id: 'convert', label: 'Convert' },
        { id: 'pdf', label: 'PDF' },
      ]

  // Navigation handlers for each step (to navigate back)
  const handleStepClick = (stepId: string) => {
    if (!projectFolder) return
    const s = toSlug(projectFolder.name)
    const store = useColorByNumberStore.getState()
    if (stepId === 'import') {
      store.setWorkspaceActiveTab('image-import')
      store.setWorkspaceStep(1)
      router.replace(`${projectRoute(s)}/image-import`)
    } else if (stepId === 'design') {
      store.setWorkspaceActiveTab(null)
      store.setWorkspaceStep('design-config')
      router.replace(`${projectRoute(s)}?step=design-config`)
    } else if (stepId === 'convert') {
      store.setWorkspaceActiveTab(null)
      store.setWorkspaceStep(1)
      router.replace(`${projectRoute(s)}?step=convert`)
    }
    // 'pdf' is current — no nav needed
  }

  // Only show steps up to and including the current step (progressive disclosure)
  const currentStepIndex = allSteps.findIndex((s) => s.id === activeStepId)
  const visibleSteps = currentStepIndex >= 0 ? allSteps.slice(0, currentStepIndex + 1) : allSteps.slice(0, 1)

  const handleStudioClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (typeof window !== 'undefined' && window.history.state?.fromWorkspaceList) {
      window.history.back()
    } else {
      useColorByNumberStore.getState().setWorkspaceShowProjectList(true)
      useColorByNumberStore.getState().setWorkspaceActiveTab(null)
      router.replace(PROJECTS_ROUTE)
    }
  }

  const handleProjectClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (projectFolder) {
      const slug = toSlug(projectFolder.name)
      const activeProjects = useColorByNumberStore.getState().projects
      const hasNoFiles = activeProjects.length === 0
      const nextUrl = hasNoFiles
        ? `${projectRoute(slug)}/image-import`
        : `${projectRoute(slug)}?step=convert`
      useColorByNumberStore.getState().setWorkspaceActiveTab(hasNoFiles ? 'image-import' : null)
      useColorByNumberStore.getState().setWorkspaceStep(1)
      router.replace(nextUrl)
    }
  }

  const tabLabel = getTabLabel(activeTab)

  const slug = projectFolder ? toSlug(projectFolder.name) : ''
  const projectBaseUrl = projectFolder ? projectRoute(slug) : ''

  // stepsToRender removed, steps progress rendered in breadcrumbs instead.

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
                      href={projectFolder && useColorByNumberStore.getState().projects.length === 0
                        ? `${projectRoute(toSlug(projectFolder.name))}/image-import`
                        : `${projectRoute(toSlug(projectFolder.name))}?step=convert`
                      }
                      onClick={handleProjectClick}
                      className="hover:text-[var(--text-primary)] transition-colors text-sm text-[var(--text-secondary)] tracking-wide"
                    >
                      {projectFolder.name}
                    </a>
                  </li>
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
                    <div className="flex items-center gap-1.5 text-sm">
                      {activeTab && activeTab !== 'image-import' ? (
                        // Non-pipeline tab (Object Focus, Before/After, Mark Practice): just show tab name
                        <span className="text-[var(--text-primary)] font-semibold tracking-wide">
                          {getTabLabel(activeTab)}
                        </span>
                      ) : (
                        // Pipeline steps: show only up to the current step, past steps are clickable
                        visibleSteps.map((step, idx) => {
                          const isCurrent = idx === visibleSteps.length - 1
                          return (
                            <div key={step.id} className="flex items-center gap-1.5">
                              {idx > 0 && <span className="text-[var(--text-muted)] opacity-40 px-0.5">→</span>}
                              {isCurrent ? (
                                <span className="text-[var(--text-primary)] font-semibold tracking-wide">
                                  {step.label}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStepClick(step.id)}
                                  className="tracking-wide text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
                                >
                                  {step.label}
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </li>
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
