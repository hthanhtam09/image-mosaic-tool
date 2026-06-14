'use client'

import MosaicWorkspace from '@/components/colorByNumber/MosaicWorkspace'
import { StandaloneImportSidebar, type TabType } from '@/components/colorByNumber/dashboard/EmptyState'
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

// Router functions are now defined inside ToolProjectWorkspace using next/navigation useRouter

const VALID_TABS = ['image-import', 'object-focus', 'before-after', 'mark-practice'] as const

function getProjectAndTabFromUrl(): { projectSlug: string | null; tab: TabType | null } {
  if (typeof window === 'undefined') return { projectSlug: null, tab: null }
  const p = window.location.pathname
  if (!p.startsWith(PROJECTS_ROUTE + '/')) {
    return { projectSlug: null, tab: null }
  }
  const subPath = p.slice(PROJECTS_ROUTE.length + 1)
  const parts = subPath.split('/').map(decodeURIComponent)
  const projectSlug = parts[0] || null
  const tabCandidate = parts[1] || null
  const tab = (VALID_TABS as readonly string[]).includes(tabCandidate || '') ? (tabCandidate as TabType) : null
  return { projectSlug, tab }
}

export default function ToolProjectWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navReplace = useCallback((url: string, _state?: unknown) => {
    router.replace(url)
  }, [router])

  const navPush = useCallback((url: string, _state?: unknown) => {
    router.push(url)
  }, [router])

  const [initialUrlInfo] = useState(() => getProjectAndTabFromUrl())
  const [initialRouteProjectSlug] = useState(() => initialUrlInfo.projectSlug)
  const access = useToolAccess()
  const projectFolder = useColorByNumberStore((state) => state.projectFolder)
  const projects = useColorByNumberStore((state) => state.projects)
  const conversionJob = useColorByNumberStore((state) => state.conversionJob)
  const summaries = useColorByNumberStore((state) => state.toolProjectSummaries)
  const hasLoadedSummaries = useColorByNumberStore((state) => state.hasLoadedToolProjectSummaries)
  const setSummaries = useColorByNumberStore((state) => state.setToolProjectSummaries)
  const hydrateProjectFolder = useColorByNumberStore((state) => state.hydrateProjectFolder)
  const updateProject = useColorByNumberStore((state) => state.updateProject)
  const clearProjectFolder = useColorByNumberStore((state) => state.clearProjectFolder)
  const removeAllProjects = useColorByNumberStore((state) => state.removeAllProjects)
  const globalCellSize = useColorByNumberStore((state) => state.globalCellSize)
  const globalShowNumbers = useColorByNumberStore((state) => state.globalShowNumbers)
  const globalTheme = useColorByNumberStore((state) => state.globalTheme)
  const globalGridType = useColorByNumberStore((state) => state.globalGridType)

  const [projectName, setProjectName] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(() => !hasLoadedSummaries)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [storageToast, setStorageToast] = useState<StorageToast | null>(null)
  const showProjectList = useColorByNumberStore((state) => state.workspaceShowProjectList)
  const setShowProjectList = useColorByNumberStore((state) => state.setWorkspaceShowProjectList)
  const activeTab = useColorByNumberStore((state) => state.workspaceActiveTab) as TabType | null
  const setActiveTab = useColorByNumberStore((state) => state.setWorkspaceActiveTab)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [isTrackerDismissed, setIsTrackerDismissed] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    confirmLabel?: string
    onConfirm: () => void
    onCancel?: () => void
  } | null>(null)
  const previousConversionStatusRef = useRef(conversionJob.status)
  const prevProjectsStateRef = useRef<{ id: string; status: string }[]>([])

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
    if (hasLoadedSummaries) {
      const handle = requestAnimationFrame(() => setIsLoadingProjects(false))
      return () => cancelAnimationFrame(handle)
    }
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

  useEffect(() => {
    if (access.isLoading) return

    // Already loaded — skip fetch, just clear the spinner
    if (hasLoadedSummaries) {
      const handle = requestAnimationFrame(() => setIsLoadingProjects(false))
      return () => cancelAnimationFrame(handle)
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
  }, [access.isLoading])

  // Auto-save whenever project state changes (immediate save for structural/status changes)
  useEffect(() => {
    if (!projectFolder) return

    const currentProjectStates = projects.map(p => ({ id: p.id, status: p.status }))
    const prevStates = prevProjectsStateRef.current

    // Detect structural changes (add/delete/status changes)
    const isStateChanged = projects.length !== prevStates.length ||
                           projects.some((p, idx) => {
                             const prev = prevStates[idx]
                             return !prev || prev.id !== p.id || prev.status !== p.status
                           })

    prevProjectsStateRef.current = currentProjectStates

    const save = async () => {
      const updatedAt = new Date().toISOString()
      try {
        await saveToolProject({ ...projectFolder, updatedAt, settings: folderSettings, files: projects })
        const estimate = await estimateBrowserStorage()
        if (estimate && estimate.usageRatio > 0.8) await cleanupToolProjectStorage()
        await checkStorageQuota()
      } catch (error) {
        console.error('Failed to save local project:', error)
      }
    }

    if (isStateChanged) {
      // Save when browser is idle to let React rendering and image decoding complete smoothly.
      // Timeout at 1000ms to ensure it saves eventually. Fallback to 500ms setTimeout if requestIdleCallback is unavailable.
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        const handle = (window as unknown as { requestIdleCallback: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback(save, { timeout: 1000 })
        return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle)
      } else {
        const t = setTimeout(save, 500)
        return () => clearTimeout(t)
      }
    }

    // Debounce for cell coloring or viewport updates
    const timeout = setTimeout(save, 800)
    return () => clearTimeout(timeout)
  }, [checkStorageQuota, folderSettings, projectFolder, projects])

  const openProject = useCallback(
    (id: string, slug?: string, tab?: TabType | null, navAction: 'push' | 'replace' | 'skip' = 'replace') => {
      // Update URL + switch view immediately — no Next.js router overhead
      setShowProjectList(false)

      let targetSlug = slug
      const summary = summaries.find((s) => s.id === id)
      if (!targetSlug && summary) {
        targetSlug = toSlug(summary.name)
      }
      if (!targetSlug) {
        targetSlug = id
      }
      const activeProjects = useColorByNumberStore.getState().projects
      const isProjectEmpty = projectFolder?.id === id
        ? activeProjects.length === 0
        : (summary ? summary.fileCount === 0 : true)
      const targetTab = tab || (isProjectEmpty ? 'image-import' : null)
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      if (targetTab === 'object-focus') {
        const stepParam = params.get('step')
        if (stepParam !== 'import' && stepParam !== 'convert') {
          params.set('step', isProjectEmpty ? 'import' : 'convert')
        }
      } else if (targetTab) {
        params.delete('step')
      } else if (!params.has('step')) {
        params.set('step', 'convert')
      }
      const search = params.toString() ? `?${params.toString()}` : ''
      const nextUrl = targetTab 
        ? `${projectRoute(targetSlug)}/${targetTab}${search}` 
        : `${projectRoute(targetSlug)}${search}`
      
      const currentHistoryState = typeof window !== 'undefined' ? window.history.state : null
      if (navAction === 'push') {
        navPush(nextUrl, { fromWorkspaceList: true })
      } else if (navAction === 'replace') {
        navReplace(nextUrl, currentHistoryState)
      }

      if (projectFolder?.id === id) {
        setActiveTab(targetTab)
        return
      }

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
        
        const projectFiles = project.files ?? []
        let finalTab = targetTab
        if (!finalTab && projectFiles.length === 0) {
          finalTab = 'image-import'
        }
        
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const stepParam = params.get('step')
        let nextStep: 1 | 'design-config' | 2 | 3 = 1
        if (finalTab) {
          nextStep = 1
        } else if (stepParam === 'design-config') {
          nextStep = 'design-config'
        } else if (stepParam === 'pdf' || stepParam === 'pdf-setup' || stepParam === '2') {
          nextStep = 2
        } else if (stepParam === 'pdf-progress' || stepParam === '3') {
          nextStep = 3
        } else if (stepParam === 'convert' || stepParam === '1') {
          nextStep = 1
        }
        useColorByNumberStore.getState().setWorkspaceStep(nextStep)
        setActiveTab(finalTab)

        // Rewrite URL to use slug (in case we opened by UUID)
        const finalSlug = toSlug(project.name)
        if (finalTab === 'object-focus') {
          const stepParam = params.get('step')
          if (stepParam !== 'import' && stepParam !== 'convert') {
            params.set('step', projectFiles.some((file) => file.removeBackground) ? 'convert' : 'import')
          }
        } else if (finalTab) {
          params.delete('step')
        } else if (!params.has('step')) {
          params.set('step', 'convert')
        }
        const finalSearch = params.toString() ? `?${params.toString()}` : ''
        const finalUrl = finalTab 
          ? `${projectRoute(finalSlug)}/${finalTab}${finalSearch}` 
          : `${projectRoute(finalSlug)}${finalSearch}`
        const latestHistoryState = typeof window !== 'undefined' ? window.history.state : null
        navReplace(finalUrl, latestHistoryState)

          setStorageError(null)
          // Hydrate thumbnails in background — only patch thumbnailDataUrl on existing store
          // projects; do NOT call hydrateProjectFolder here to avoid overriding any images the
          // user may have already imported since the project was opened.
          void hydrateStoredProjectFiles(projectFiles).then((hydrated) => {
            for (const hydratedFile of hydrated) {
              if (hydratedFile.thumbnailDataUrl) {
                updateProject(hydratedFile.id, { thumbnailDataUrl: hydratedFile.thumbnailDataUrl })
              }
            }
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
    [checkStorageQuota, hydrateProjectFolder, updateProject, projectFolder?.id, refreshProjects, summaries, setActiveTab, setShowProjectList]
  )

  const handleBackToProjects = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.fromWorkspaceList) {
      window.history.back()
    } else {
      setShowProjectList(true)
      setActiveTab(null)
      navReplace(PROJECTS_ROUTE)
    }
  }, [setActiveTab, setShowProjectList])

  // Synchronize state with URL pathname and search parameters reactively
  useEffect(() => {
    if (access.isLoading || !hasLoadedSummaries) return

    const { projectSlug, tab } = getProjectAndTabFromUrl()
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    const stepParam = params.get('step')
    let nextStep: 1 | 'design-config' | 2 | 3 | null = null
    if (stepParam === 'design-config') {
      nextStep = 'design-config'
    } else if (stepParam === 'pdf' || stepParam === 'pdf-setup' || stepParam === '2') {
      nextStep = 2
    } else if (stepParam === 'pdf-progress' || stepParam === '3') {
      nextStep = 3
    } else if (stepParam === 'convert' || stepParam === '1') {
      nextStep = 1
    }

    if (!projectSlug) {
      setShowProjectList(true)
      setActiveTab(null)
    } else {
      const found = summaries.find((s) => toSlug(s.name) === projectSlug || s.id === projectSlug)
      if (found) {
        if (openingId !== found.id && (!projectFolder || projectFolder.id !== found.id)) {
          openProject(found.id, toSlug(found.name), tab, 'skip')
        } else if (projectFolder && projectFolder.id === found.id) {
          setActiveTab(tab)
          if (!tab && nextStep !== null) {
            useColorByNumberStore.getState().setWorkspaceStep(nextStep)
          }
          setShowProjectList(false)
        }
      } else {
        setShowProjectList(true)
        setActiveTab(null)
      }
    }
  }, [pathname, searchParams, access.isLoading, hasLoadedSummaries, summaries, projectFolder, openingId, openProject, setActiveTab, setShowProjectList])

  useEffect(() => {
    if (
      showProjectList ||
      openingId !== null ||
      !projectFolder ||
      activeTab !== 'image-import' ||
      projects.length === 0 ||
      confirmModal
    ) {
      return
    }

    const slug = toSlug(projectFolder.name)
    const convertUrl = `${projectRoute(slug)}?step=convert`
    const importUrl = `${projectRoute(slug)}/image-import`

    setConfirmModal({
      title: 'Clear imported images?',
      message: `Going back to Image Import will remove all ${projects.length} imported image(s) and converted mosaic data from this project. This cannot be undone.`,
      confirmLabel: 'Clear data',
      onConfirm: () => {
        setConfirmModal(null)
        removeAllProjects()
        setActiveTab('image-import')
        useColorByNumberStore.getState().setWorkspaceStep(1)
        navReplace(importUrl)
      },
      onCancel: () => {
        setConfirmModal(null)
        setActiveTab(null)
        useColorByNumberStore.getState().setWorkspaceStep(1)
        navReplace(convertUrl)
      },
    })
  }, [
    activeTab,
    confirmModal,
    navReplace,
    openingId,
    projectFolder,
    projects.length,
    removeAllProjects,
    setActiveTab,
    showProjectList,
  ])

  useEffect(() => {
    setShowProjectList(!initialRouteProjectSlug)
    setActiveTab(initialUrlInfo.tab)
  }, [setShowProjectList, setActiveTab, initialRouteProjectSlug, initialUrlInfo.tab])

  // Redirect guest or legacy UUID URLs once summaries are loaded
  const didRestoreRef = useRef(false)
  useEffect(() => {
    if (access.isLoading || !hasLoadedSummaries || didRestoreRef.current) return
    didRestoreRef.current = true
    const legacyId = searchParams.get(PROJECT_QUERY_KEY) ?? searchParams.get('p')
    if (legacyId) {
      const found = summaries.find((s) => s.id === legacyId)
      if (found) navReplace(projectRoute(toSlug(found.name)))
      return
    }
    const slug = initialRouteProjectSlug
    if (!slug && access.isGuest && summaries.length > 0) {
      const found = summaries[0]
      navReplace(projectRoute(toSlug(found.name)))
    }
  }, [access.isLoading, access.isGuest, hasLoadedSummaries, summaries, initialRouteProjectSlug, searchParams, navReplace])

  const createProject = async () => {
    if (displayedSummaries.length >= access.maxSavedProjects) {
      let redirectPath = '/studio/projects'
      if (typeof window !== 'undefined') {
        redirectPath = window.location.pathname + window.location.search
      }
      showToast({
        kind: 'info',
        title: access.isGuest ? 'Sign in to save projects' : 'Upgrade to save more projects',
        message: access.isGuest
          ? 'Guest work is saved as one temporary local project. Sign in to keep recent projects.'
          : `Your ${access.plan} plan can keep ${access.maxSavedProjects} local projects.`,
        actionLabel: access.isGuest ? 'Sign in' : 'Upgrade',
        actionHref: access.isGuest ? `/login?redirectTo=${encodeURIComponent(redirectPath)}` : '/pricing',
      })
      return
    }
    const name = projectName.trim()
    if (!name) {
      setStorageError('Enter a project name first.')
      return
    }
    try {
      const project = createEmptyToolProject(name, folderSettings)
      await saveToolProject(project)
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
      toast.success(`Project "${name}" created`)
      
      // Open the new project immediately
      openProject(project.id, toSlug(project.name), null, 'push')
      
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

  // Skeleton shown inline below

  const tracker =
    projectFolder && conversionJob.status !== 'idle' && !isTrackerDismissed ? (
      <ConversionTracker
        conversionJob={conversionJob}
        projectName={access.isGuest ? undefined : projectFolder.name}
        onOpenProject={() => {
          openProject(projectFolder.id, toSlug(projectFolder.name), null, 'push')
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
                        onClick={() => void openProject(project.id, toSlug(project.name), null, 'push')}
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
                            onClick={() => void openProject(project.id, toSlug(project.name), null, 'push')}
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
        activeTab={activeTab ?? undefined}
        onTabClick={(tab) => {
          setActiveTab(tab)
          if (projectFolder) {
            const currentHistoryState = typeof window !== 'undefined' ? window.history.state : null
            const tabUrl = tab === 'object-focus'
              ? `${projectRoute(toSlug(projectFolder.name))}/${tab}?step=${projects.some((project) => project.removeBackground) ? 'convert' : 'import'}`
              : `${projectRoute(toSlug(projectFolder.name))}/${tab}`
            navReplace(tabUrl, currentHistoryState)
          }
        }}
      />}
      {openingId !== null ? (
        <div id="workspace" className="flex-1 h-full flex flex-col p-8 overflow-hidden bg-[var(--bg-primary)]">
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
      ) : mainContent}
      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel}
        onConfirm={confirmModal?.onConfirm ?? (() => {})}
        onCancel={confirmModal?.onCancel ?? (() => setConfirmModal(null))}
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
