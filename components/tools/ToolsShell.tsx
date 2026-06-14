'use client'

import { MosaciLogoMark } from '@/components/MosaciLogo'
import ToolUserHeader from '@/components/tools/ToolUserHeader'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'

const PROJECTS_ROUTE = '/studio/projects'
const projectRoute = (slug: string) => `${PROJECTS_ROUTE}/${encodeURIComponent(slug)}`

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, '-').replace(/^-|-$/g, '')
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

const primaryNav: NavItem[] = [
  {
    label: 'Workspace',
    href: '/studio/projects',
    active: true,
    icon: <LayoutGrid className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden />,
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
          ? 'bg-white/8 text-text-primary'
          : 'text-text-secondary hover:bg-white/6 hover:text-text-primary'
      }`}
    >
      {item.active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
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
  const searchParams = useSearchParams()
  const [hovering, setHovering] = useState(false)

  const projectFolder = useColorByNumberStore((state) => state.projectFolder)
  const showProjectList = useColorByNumberStore((state) => state.workspaceShowProjectList)
  const activeTab = useColorByNumberStore((state) => state.workspaceActiveTab)
  const workspaceStep = useColorByNumberStore((state) => state.workspaceStep)
  const projects = useColorByNumberStore((state) => state.projects)
  const objectFocusStep = activeTab === 'object-focus' && searchParams.get('step') === 'convert' ? 'convert' : 'import'

  let activeStepId = 'import'
  // Folder import mode: when at PDF step with no converted projects (directImages flow)
  // Standard mode: full pipeline import → design → convert → pdf
  const isFolderMode = projects.length === 0 && (workspaceStep === 2 || workspaceStep === 3)

  if (activeTab !== null) {
    activeStepId = activeTab
  } else if (workspaceStep === 'design-config') {
    activeStepId = 'design'
  } else if (workspaceStep === 1) {
    activeStepId = projects.length === 0 ? 'import' : 'convert'
  } else if (workspaceStep === 2 || workspaceStep === 3) {
    activeStepId = 'pdf'
  }

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

  const handleObjectFocusStepClick = (stepId: 'import' | 'convert') => {
    if (!projectFolder) return
    const s = toSlug(projectFolder.name)
    useColorByNumberStore.getState().setWorkspaceActiveTab('object-focus')
    useColorByNumberStore.getState().setWorkspaceStep(1)
    router.replace(`${projectRoute(s)}/object-focus?step=${stepId}`)
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

  const sidebarWidth = hovering ? 220 : 56

  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
      {/* Logo */}
      <Link
        href="/"
        className="fixed left-0 top-0 z-50 flex h-14 w-14 shrink-0 items-center justify-center border-b border-r border-border-primary bg-bg-secondary"
        title="Back to Mosaci home"
      >
        <MosaciLogoMark size="sm" />
      </Link>

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 top-14 z-40 flex flex-col border-r border-border-primary bg-bg-secondary transition-[width] duration-200 ease-out overflow-hidden"
        style={{ width: sidebarWidth }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
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
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border-primary bg-bg-secondary px-4">
          <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium text-text-secondary">
            <ol className="inline-flex items-center space-x-1 md:space-x-1.5">
              <li className="inline-flex items-center">
                {showProjectList ? (
                  <span className="text-text-primary font-semibold text-sm tracking-wide">Studio</span>
                ) : (
                  <a
                    href={PROJECTS_ROUTE}
                    onClick={handleStudioClick}
                    className="hover:text-text-primary transition-colors text-sm text-text-secondary tracking-wide"
                  >
                    Studio
                  </a>
                )}
              </li>
              {!showProjectList && projectFolder && (
                <>
                  <li className="flex items-center">
                    <svg
                      className="mx-1 h-3.5 w-3.5 text-text-muted opacity-60 md:mx-1.5"
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
                      className="hover:text-text-primary transition-colors text-sm text-text-secondary tracking-wide"
                    >
                      {projectFolder.name}
                    </a>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="mx-1 h-3.5 w-3.5 text-text-muted opacity-60 md:mx-1.5"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex items-center gap-1.5 text-sm">
                      {activeTab === 'object-focus' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-secondary tracking-wide">Object Focus</span>
                          <span className="text-text-muted opacity-40 px-0.5">→</span>
                          {objectFocusStep === 'import' ? (
                            <span className="text-text-primary font-semibold tracking-wide">Import</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleObjectFocusStepClick('import')}
                                className="tracking-wide text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
                              >
                                Import
                              </button>
                              <span className="text-text-muted opacity-40 px-0.5">→</span>
                              <span className="text-text-primary font-semibold tracking-wide">Convert</span>
                            </>
                          )}
                        </div>
                      ) : activeTab && activeTab !== 'image-import' ? (
                        <span className="text-text-primary font-semibold tracking-wide">
                          {getTabLabel(activeTab)}
                        </span>
                      ) : (
                        visibleSteps.map((step, idx) => {
                          const isCurrent = idx === visibleSteps.length - 1
                          return (
                            <div key={step.id} className="flex items-center gap-1.5">
                              {idx > 0 && <span className="text-text-muted opacity-40 px-0.5">→</span>}
                              {isCurrent ? (
                                <span className="text-text-primary font-semibold tracking-wide">
                                  {step.label}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStepClick(step.id)}
                                  className="tracking-wide text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
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

        <main className="relative min-h-0 flex-1 overflow-hidden bg-bg-primary">{children}</main>
      </div>
    </div>
  )
}
