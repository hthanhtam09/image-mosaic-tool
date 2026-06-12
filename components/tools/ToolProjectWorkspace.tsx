'use client'

import MosaicWorkspace from '@/components/colorByNumber/MosaicWorkspace'
import { StandaloneImportSidebar } from '@/components/colorByNumber/dashboard/EmptyState'
import { useToolAccess } from '@/components/tools/useToolAccess'
import {
  cleanupToolProjectStorage,
  clearAllToolProjects,
  createEmptyToolProject,
  deleteToolProject,
  estimateBrowserStorage,
  hydrateStoredProjectFiles,
  listToolProjects,
  loadToolProject,
  saveToolProject,
  type BrowserStorageEstimate,
  type StorageCleanupResult,
  type StoredToolProjectSummary,
} from '@/lib/tools/localProjects'
import type { ConversionJob } from '@/store/useColorByNumberStore'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmModal from '../ConfirmModal'
import PageLoader from '../PageLoader'
import { toast } from '@/store/useToastStore'

type ToastKind = 'info' | 'warning' | 'error' | 'success'
type StorageToast = {
  id: number
  kind: ToastKind
  title: string
  message: string
  showCleanup?: boolean
  showClearAll?: boolean
  actionLabel?: string
  actionHref?: string
}

const GUEST_PROJECT_ID = 'guest-temp-project'
const PROJECT_QUERY_KEY = 'project'
const PROJECTS_ROUTE = '/studio/projects'
const projectRoute = (slug: string) => `${PROJECTS_ROUTE}/${encodeURIComponent(slug)}`

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, '-').replace(/^-|-$/g, '')
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const quotaMessage = (estimate: BrowserStorageEstimate) =>
  `${Math.round(estimate.usageRatio * 100)}% used (${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}).`

const cleanupMessage = (result: StorageCleanupResult) => {
  const total = result.trashDeleted + result.lruDeleted + result.overflowDeleted
  const parts = [
    result.previewsDeleted > 0 ? `removed previews from ${result.previewsDeleted} files` : '',
    total > 0 ? `deleted ${total} old projects` : '',
  ].filter(Boolean)
  if (parts.length === 0) return 'Storage is already clean.'
  return `Cleaned up local storage: ${parts.join(', ')}.`
}

const conversionPercent = (job: Pick<ConversionJob, 'total' | 'completed' | 'failed'>) => {
  if (!job.total) return 0
  return Math.min(100, Math.round(((job.completed + job.failed) / job.total) * 100))
}

// Update URL without going through Next.js router (no re-render, instant)
function navReplace(url: string) {
  window.history.replaceState(null, '', url)
}

function getSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const p = window.location.pathname
  return p.startsWith(PROJECTS_ROUTE + '/')
    ? decodeURIComponent(p.slice(PROJECTS_ROUTE.length + 1))
    : null
}

export default function ToolProjectWorkspace() {
  const searchParams = useSearchParams()
  // Read actual browser URL (not Next.js router) — history.replaceState keeps this accurate
  const initialRouteProjectSlug = useRef(getSlugFromUrl())
  const access = useToolAccess()
  const projectFolder = useColorByNumberStore((state) => state.projectFolder)
  const projects = useColorByNumberStore((state) => state.projects)
  const conversionJob = useColorByNumberStore((state) => state.conversionJob)
  const summaries = useColorByNumberStore((state) => state.toolProjectSummaries)
  const hasLoadedSummaries = useColorByNumberStore((state) => state.hasLoadedToolProjectSummaries)
  const setSummaries = useColorByNumberStore((state) => state.setToolProjectSummaries)
  const hydrateProjectFolder = useColorByNumberStore((state) => state.hydrateProjectFolder)
  const clearProjectFolder = useColorByNumberStore((state) => state.clearProjectFolder)
  const globalCellSize = useColorByNumberStore((state) => state.globalCellSize)
  const globalShowNumbers = useColorByNumberStore((state) => state.globalShowNumbers)
  const globalTheme = useColorByNumberStore((state) => state.globalTheme)
  const globalGridType = useColorByNumberStore((state) => state.globalGridType)

  const [projectName, setProjectName] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(() => !hasLoadedSummaries)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [storageToast, setStorageToast] = useState<StorageToast | null>(null)
  const [showProjectList, setShowProjectList] = useState(!initialRouteProjectSlug.current)
  const [requestedTab, setRequestedTab] = useState<import('@/components/colorByNumber/dashboard/EmptyState').TabType | null>(null)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [isTrackerDismissed, setIsTrackerDismissed] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(
    null
  )
  const previousConversionStatusRef = useRef(conversionJob.status)

  const folderSettings = useMemo(
    () => ({ globalCellSize, globalShowNumbers, globalTheme, globalGridType }),
    [globalCellSize, globalShowNumbers, globalTheme, globalGridType]
  )

  const displayedSummaries = useMemo(() => {
    if (!projectFolder || !showProjectList) return summaries
    const activeSummary: StoredToolProjectSummary = {
      ...projectFolder,
      fileCount: projects.length,
      completedCount: projects.filter((project) => project.status === 'completed').length,
    }
    const rest = summaries.filter((summary) => summary.id !== projectFolder.id)
    return [activeSummary, ...rest]
  }, [projectFolder, projects, showProjectList, summaries])

  const showToast = useCallback((toast: Omit<StorageToast, 'id'>) => setStorageToast({ id: Date.now(), ...toast }), [])

  useEffect(() => {
    if (hasLoadedSummaries) setIsLoadingProjects(false)
  }, [hasLoadedSummaries])

  useEffect(() => {
    const previousStatus = previousConversionStatusRef.current
    if (conversionJob.status === 'running' && previousStatus !== 'running') {
      setIsTrackerDismissed(false)
    }
    if (conversionJob.status === 'completed' && previousStatus === 'running') {
      setIsTrackerDismissed(false)
    }
    previousConversionStatusRef.current = conversionJob.status
  }, [conversionJob.status])

  const checkStorageQuota = useCallback(async () => {
    const estimate = await estimateBrowserStorage()
    if (!estimate || estimate.usageRatio < 0.8) return
    showToast({
      kind: 'warning',
      title: 'Browser storage is almost full',
      message: quotaMessage(estimate),
      showCleanup: true,
      showClearAll: true,
    })
  }, [showToast])

  const refreshProjects = useCallback(async () => {
    if (!hasLoadedSummaries) setIsLoadingProjects(true)
    try {
      await deleteToolProject(GUEST_PROJECT_ID)
      const nextSummaries = await listToolProjects()
      setSummaries(nextSummaries)
      setStorageError(null)
      await checkStorageQuota()
    } catch (error) {
      console.error('Failed to list local projects:', error)
      setStorageError('Local browser storage is unavailable.')
    } finally {
      setIsLoadingProjects(false)
    }
  }, [checkStorageQuota, hasLoadedSummaries, setSummaries])

  const openGuestProject = useCallback(async () => {
    try {
      await deleteToolProject(GUEST_PROJECT_ID)
      const project = {
        ...createEmptyToolProject('Guest Project', folderSettings),
        id: GUEST_PROJECT_ID,
        name: 'Guest Project',
      }
      hydrateProjectFolder(
        { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt },
        [],
        project.settings
      )
      setStorageError(null)
    } catch (error) {
      console.error('Failed to open guest project:', error)
      setStorageError('Could not create a temporary guest project in this browser.')
    } finally {
      setIsLoadingProjects(false)
    }
  }, [access.maxFilesPerProject, folderSettings, hydrateProjectFolder])

  useEffect(() => {
    if (access.isLoading) return

    if (!access.canUseRecentProjects) {
      const frame = requestAnimationFrame(() => {
        setSummaries([])
        const legacyId = searchParams.get(PROJECT_QUERY_KEY) ?? searchParams.get('p')
        if (legacyId) {
          navReplace(projectRoute(legacyId))
          return
        }
        const shouldShowList = !initialRouteProjectSlug.current
        setShowProjectList(shouldShowList)
        if (!projectFolder && !shouldShowList) void openGuestProject()
        else setIsLoadingProjects(false)
      })
      return () => cancelAnimationFrame(frame)
    }

    // Already loaded — skip fetch, just clear the spinner
    if (hasLoadedSummaries) {
      setIsLoadingProjects(false)
      return
    }

    let alive = true
    listToolProjects()
      .then((projects) => {
        if (alive) setSummaries(projects)
        if (alive) setStorageError(null)
      })
      .catch((error) => {
        console.error('Failed to list local projects:', error)
        if (alive) setStorageError('Local browser storage is unavailable.')
      })
      .then(() => {
        if (alive) return checkStorageQuota()
      })
      .finally(() => {
        if (alive) setIsLoadingProjects(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.canUseRecentProjects, access.isLoading])

  // Auto-save whenever project state changes
  useEffect(() => {
    if (!projectFolder) return
    if (projectFolder.id === GUEST_PROJECT_ID) return
    const timeout = window.setTimeout(async () => {
      const updatedAt = new Date().toISOString()
      try {
        await saveToolProject({ ...projectFolder, updatedAt, settings: folderSettings, files: projects })
        const estimate = await estimateBrowserStorage()
        if (estimate && estimate.usageRatio > 0.8) await cleanupToolProjectStorage()
        await checkStorageQuota()
      } catch (error) {
        console.error('Failed to save local project:', error)
      }
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [checkStorageQuota, folderSettings, projectFolder, projects])

  const openProject = useCallback(
    (id: string, slug?: string) => {
      // Update URL + switch view immediately — no Next.js router overhead
      setShowProjectList(false)
      navReplace(projectRoute(slug ?? id))

      if (projectFolder?.id === id) return

      // Load project data after navigation
      setOpeningId(id)
      loadToolProject(id)
        .then((project) => {
          if (!project) {
            void refreshProjects()
            setShowProjectList(true)
            navReplace(PROJECTS_ROUTE)
            return
          }
          hydrateProjectFolder(
            { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt },
            project.files ?? [],
            project.settings
          )
          // Rewrite URL to use slug (in case we opened by UUID)
          navReplace(projectRoute(toSlug(project.name)))
          setStorageError(null)
          // Hydrate thumbnails in background — workspace doesn't need them
          void hydrateStoredProjectFiles(project.files ?? []).then((hydrated) => {
            hydrateProjectFolder(
              { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt },
              hydrated,
              project.settings
            )
          })
          void checkStorageQuota()
        })
        .catch((error) => {
          console.error('Failed to open local project:', error)
          toast.error('Could not open project')
          setStorageError('Could not open this local project.')
        })
        .finally(() => setOpeningId(null))
    },
    [checkStorageQuota, hydrateProjectFolder, projectFolder?.id, refreshProjects]
  )

  const handleBackToProjects = useCallback(() => {
    setShowProjectList(true)
    navReplace(PROJECTS_ROUTE)
  }, [])

  // Restore project from URL slug — runs once after access + summaries are ready
  const didRestoreRef = useRef(false)
  useEffect(() => {
    if (access.isLoading || !access.canUseRecentProjects || !hasLoadedSummaries || didRestoreRef.current) return
    didRestoreRef.current = true
    const legacyId = searchParams.get(PROJECT_QUERY_KEY) ?? searchParams.get('p')
    if (legacyId) {
      // Legacy UUID query param — find matching project by ID
      const found = summaries.find((s) => s.id === legacyId)
      if (found) navReplace(projectRoute(toSlug(found.name)))
      return
    }
    const slug = initialRouteProjectSlug.current
    setShowProjectList(!slug)
    if (!slug) return
    // Find project by matching slug of its name, then open by UUID
    const found = summaries.find((s) => toSlug(s.name) === slug)
    if (!found) {
      // Slug not found — go back to list
      setShowProjectList(true)
      navReplace(PROJECTS_ROUTE)
      return
    }
    const t = setTimeout(() => openProject(found.id, toSlug(found.name)), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.isLoading, access.canUseRecentProjects, hasLoadedSummaries])

  const createProject = async () => {
    if (displayedSummaries.length >= access.maxSavedProjects) {
      showToast({
        kind: 'info',
        title: access.isGuest ? 'Sign in to save projects' : 'Upgrade to save more projects',
        message: access.isGuest
          ? 'Guest work is saved as one temporary local project. Sign in to keep recent projects.'
          : `Your ${access.plan} plan can keep ${access.maxSavedProjects} local projects.`,
        actionLabel: access.isGuest ? 'Sign in' : 'Upgrade',
        actionHref: access.isGuest ? '/login?redirectTo=/studio/projects' : '/pricing',
      })
      return
    }
    const name = projectName.trim()
    if (!name) {
      setStorageError('Enter a project name first.')
      return
    }
    try {
      const project = access.isGuest
        ? { ...createEmptyToolProject(name, folderSettings), id: GUEST_PROJECT_ID, name }
        : createEmptyToolProject(name, folderSettings)
      if (!access.isGuest) await saveToolProject(project)
      if (access.isGuest) {
        hydrateProjectFolder(
          { id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt },
          [],
          project.settings
        )
      } else {
        const nextSummaries: StoredToolProjectSummary[] = [
          {
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            fileCount: 0,
            completedCount: 0,
          },
          ...summaries.filter((summary) => summary.id !== project.id),
        ]
        setSummaries(nextSummaries)
      }
      toast.success(`Project "${name}" created`)
      setShowProjectList(true)
      setProjectName('')
      setShowCreateProject(false)
      setStorageError(null)
      await checkStorageQuota()
    } catch (error) {
      console.error('Failed to create local project:', error)
      toast.error('Could not create project', { description: 'Browser storage may be unavailable.' })
      setStorageError('Could not create a local project in this browser.')
    }
  }

  const removeProject = (project: StoredToolProjectSummary) => {
    setConfirmModal({
      title: 'Delete project',
      message: `Delete "${project.name}" from this browser?`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await deleteToolProject(project.id)
          if (projectFolder?.id === project.id) {
            clearProjectFolder()
            setShowProjectList(true)
          }
          setSummaries(summaries.filter((summary) => summary.id !== project.id))
          toast.success(`"${project.name}" deleted`)
          await refreshProjects()
        } catch (error) {
          console.error('Failed to delete local project:', error)
          toast.error('Could not delete project')
        }
      },
    })
  }

  const runCleanup = async () => {
    try {
      const result = await cleanupToolProjectStorage()
      await refreshProjects()
      showToast({
        kind: result.after && result.after.usageRatio > 0.8 ? 'warning' : 'success',
        title: result.after && result.after.usageRatio > 0.8 ? 'Storage is still high' : 'Local storage cleaned',
        message: result.after ? `${cleanupMessage(result)} ${quotaMessage(result.after)}` : cleanupMessage(result),
        showCleanup: Boolean(result.after && result.after.usageRatio > 0.8),
        showClearAll: Boolean(result.after && result.after.usageRatio > 0.8),
      })
    } catch (error) {
      console.error('Failed to clean local storage:', error)
      toast.error('Cleanup failed', { description: 'Could not clean up browser storage.' })
    }
  }

  const clearAllProjects = () => {
    setConfirmModal({
      title: 'Clear all projects',
      message: 'Clear all local Mosaci projects from this browser? This cannot be undone.',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await clearAllToolProjects()
          clearProjectFolder()
          setSummaries([])
          toast.success('All projects cleared')
        } catch (error) {
          console.error('Failed to clear local projects:', error)
          toast.error('Clear failed', { description: 'Could not clear browser storage.' })
        }
      },
    })
  }

  const toastClass =
    storageToast?.kind === 'error'
      ? 'border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
      : storageToast?.kind === 'warning'
        ? 'border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]'
        : 'border-[var(--accent)]/30 bg-[var(--bg-secondary)] text-[var(--text-primary)]'

  const storageToastEl = storageToast ? (
    <div
      key={storageToast.id}
      className={`fixed bottom-4 right-4 z-[80] w-[min(420px,calc(100vw-2rem))] rounded-lg border p-4 shadow-2xl shadow-black/30 ${toastClass}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{storageToast.title}</p>
          <p className="mt-1 text-xs leading-5 opacity-85">{storageToast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => setStorageToast(null)}
          className="rounded px-1.5 text-lg leading-none opacity-70 transition hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {(storageToast.showCleanup || storageToast.showClearAll) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {storageToast.showCleanup && (
            <button
              type="button"
              onClick={() => void runCleanup()}
              className="rounded-md border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
            >
              Clean up
            </button>
          )}
          {storageToast.showClearAll && (
            <button
              type="button"
              onClick={() => void clearAllProjects()}
              className="rounded-md border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      {storageToast.actionHref && storageToast.actionLabel && (
        <a
          href={storageToast.actionHref}
          className="mt-3 inline-flex rounded-md border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
        >
          {storageToast.actionLabel}
        </a>
      )}
    </div>
  ) : null

  if (access.isLoading || (access.isGuest && !projectFolder && !showProjectList)) {
    return (
      <main className="flex h-full items-center justify-center bg-(--bg-primary) text-sm text-(--text-secondary)">
        <PageLoader />
      </main>
    )
  }

  // Skeleton shown while project data is loading after click
  if (openingId !== null) {
    return (
      <div id="workspace" className="h-full flex flex-col p-8 overflow-hidden">
        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-(--bg-tertiary) animate-pulse" />
            <div className="h-3 w-28 rounded bg-(--bg-tertiary) animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-(--bg-tertiary) animate-pulse" />
            <div className="h-8 w-24 rounded-lg bg-(--bg-tertiary) animate-pulse" />
          </div>
        </div>
        {/* Image grid skeleton */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 overflow-y-auto">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-square rounded-lg bg-(--bg-tertiary) animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
              <div className="h-3 w-3/4 rounded bg-(--bg-tertiary) animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const tracker =
    projectFolder && conversionJob.status !== 'idle' && !isTrackerDismissed ? (
      <ConversionTracker
        conversionJob={conversionJob}
        projectName={access.isGuest ? undefined : projectFolder.name}
        onOpenProject={() => {
          setShowProjectList(false)
          navReplace(projectRoute(toSlug(projectFolder.name)))
        }}
        onDismiss={() => setIsTrackerDismissed(true)}
      />
    ) : null

  const mainContent = projectFolder && !showProjectList ? (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {storageToastEl}
      {tracker}
      <section className="relative min-h-0 flex-1 overflow-hidden">
        <MosaicWorkspace
          access={access}
          onBack={handleBackToProjects}
          projectName={access.isGuest ? undefined : projectFolder.name}
          requestedTab={requestedTab ?? undefined}
          onTabHandled={() => setRequestedTab(null)}
        />
      </section>
    </div>
  ) : (
    <main className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--bg-primary)] px-5 py-8 text-[var(--text-primary)] sm:px-8">
      {storageToastEl}
        {tracker}
        {showCreateProject && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 px-4">
            <form
              className="w-full max-w-md rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl shadow-black/40"
              onSubmit={(event) => {
                event.preventDefault()
                void createProject()
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">New project</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Name this project before importing images.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectName('')
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-primary)] text-lg leading-none text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
                  aria-label="Close new project dialog"
                >
                  ×
                </button>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Project name</span>
                <input
                  autoFocus
                  value={projectName}
                  onChange={(event) => {
                    setProjectName(event.target.value)
                    if (storageError === 'Enter a project name first.') setStorageError(null)
                  }}
                  placeholder="Coloring book batch"
                  className="mt-2 h-11 w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProject(false)
                    setProjectName('')
                  }}
                  className="h-10 rounded-md border border-[var(--border-primary)] px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
                >
                  Create project
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">Local project folders</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Recent Projects</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Create a project folder before importing. Images and converted mosaic data are saved locally in this
                browser with IndexedDB.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setStorageError(null)
                  setProjectName('')
                  setShowCreateProject(true)
                }}
                className="h-10 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
              >
                New Project
              </button>
            </div>
          </section>

          {storageError && (
            <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
              {storageError}
            </div>
          )}

          <section>
            {isLoadingProjects && displayedSummaries.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-(--border-primary) bg-(--bg-secondary)">
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-(--bg-primary) animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-(--bg-tertiary) animate-pulse" />
                      </div>
                      <div className="mt-2 h-3 w-32 rounded bg-(--bg-tertiary) animate-pulse" />
                      <div className="mt-3 h-3 w-24 rounded bg-(--bg-tertiary) animate-pulse" />
                    </div>
                    <div className="flex justify-end border-t border-(--border-primary) px-3 py-2">
                      <div className="h-6 w-12 rounded bg-(--bg-tertiary) animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedSummaries.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--accent)]">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
                <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
                  Create your first project folder, then import images into it. Converted files will appear here next
                  time you open the tool.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {displayedSummaries.map((project) => {
                  const isActiveConversionProject = projectFolder?.id === project.id && conversionJob.status !== 'idle'
                  const projectPercent = isActiveConversionProject ? conversionPercent(conversionJob) : 0
                  return (
                    <article
                      key={project.id}
                      className="overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] transition hover:border-[var(--accent)]/50"
                    >
                      <button
                        type="button"
                        onClick={() => void openProject(project.id)}
                        disabled={openingId === project.id}
                        className="block w-full text-left disabled:cursor-wait"
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--accent)]">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                              >
                                <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              </svg>
                            </span>
                            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">
                              {project.name}
                            </h2>
                            {isActiveConversionProject && (
                              <span className="shrink-0 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                                {conversionJob.status === 'running' ? `${projectPercent}%` : 'Ready'}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {project.fileCount} files · {project.completedCount} converted
                          </p>
                          {isActiveConversionProject && (
                            <div className="mt-3">
                              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                                <div
                                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                                  style={{ width: `${projectPercent}%` }}
                                />
                              </div>
                              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                                {conversionJob.status === 'running'
                                  ? 'Converting in background'
                                  : 'Open project for download and PDF actions'}
                              </p>
                            </div>
                          )}
                          <p className="mt-3 text-xs text-[var(--text-muted)]">
                            Updated {formatDate(project.updatedAt)}
                          </p>
                        </div>
                      </button>
                      <div className="flex justify-end gap-2 border-t border-[var(--border-primary)] px-3 py-2">
                        {isActiveConversionProject && (
                          <button
                            type="button"
                            onClick={() => void openProject(project.id)}
                            className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
                          >
                            {conversionJob.status === 'completed' ? 'View results' : 'Open project'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeProject(project)}
                          disabled={isActiveConversionProject}
                          className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.05] hover:text-[var(--error)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-secondary)]"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
  )

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
      {projectFolder && !showProjectList && <StandaloneImportSidebar
        access={access}
        activeTab={requestedTab ?? undefined}
        onTabClick={(tab) => {
          setRequestedTab(tab)
          // If on project list, navigate into the current (or first) project
          if (showProjectList && projectFolder) {
            setShowProjectList(false)
            navReplace(projectRoute(toSlug(projectFolder.name)))
          }
        }}
      />}
      {mainContent}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        onConfirm={confirmModal?.onConfirm ?? (() => {})}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  )
}

function ConversionTracker({
  conversionJob,
  projectName,
  onOpenProject,
  onDismiss,
}: {
  conversionJob: ConversionJob
  projectName?: string
  onOpenProject: () => void
  onDismiss: () => void
}) {
  const percent = conversionPercent(conversionJob)
  const isRunning = conversionJob.status === 'running'

  return (
    <div className="fixed bottom-5 right-5 z-[90] w-[min(320px,calc(100vw-2rem))] rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 shadow-2xl shadow-black/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            {isRunning ? 'Converting' : 'Ready'}
          </p>
          {projectName && <p className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">{projectName}</p>}
          <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
            {conversionJob.activeName || conversionJob.message || 'Conversion progress'}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          <button
            type="button"
            onClick={onOpenProject}
            className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
          >
            {isRunning ? 'Open' : 'View results'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-primary)] text-sm leading-none text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)]"
            aria-label="Dismiss conversion tracker"
          >
            ×
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {conversionJob.completed + conversionJob.failed}/{conversionJob.total} images · {percent}%
      </p>
    </div>
  )
}
