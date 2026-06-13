import { useToolFeatures } from '@/components/ToolFlagsProvider'
import type { ColorByNumberGridType } from '@/lib/colorByNumber'
import {
  generateMarkPracticeExampleImages,
  generateMarkPracticeImages,
  markPracticeCanvasToBlob,
  type MarkPracticeGridType,
} from '@/lib/colorByNumber/markPractice'
import type { ToolFeatureFlags } from '@/lib/featureFlags'
import type { ToolAccess } from '@/lib/tools/access'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import React, { type ReactNode, useEffect, useState } from 'react'

type BeforeAfterMarkGridType = Extract<ColorByNumberGridType, 'square-mark' | 'hexagon-mark'>

export type TabType = 'image-import' | 'object-focus' | 'batch-upload' | 'before-after' | 'mark-practice'

export const tabs: Array<{ id: TabType; name: string; icon: ReactNode; color: string }> = [
  {
    id: 'image-import',
    name: 'Image Import',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
        <circle cx="8.5" cy="8.5" r="1.5" />
      </svg>
    ),
    color: 'var(--accent)',
  },
  {
    id: 'object-focus',
    name: 'Object Focus',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    color: '#a855f7',
  },
  {
    id: 'batch-upload',
    name: 'Batch Upload',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
        <path d="M12 13v4M10 15l2-2 2 2" />
      </svg>
    ),
    color: '#3b82f6',
  },
  {
    id: 'before-after',
    name: 'Before / After',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="9" height="16" rx="1.5" />
        <rect x="13" y="4" width="9" height="16" rx="1.5" />
        <path d="M11.5 12h1" />
      </svg>
    ),
    color: '#f59e0b',
  },
  {
    id: 'mark-practice',
    name: 'Mark Practice',
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    color: '#22c55e',
  },
]

// tabFeature lives at module scope so StandaloneImportSidebar can use it
const tabFeatureMap: Record<TabType, keyof ToolFeatureFlags> = {
  'image-import': 'standardImport',
  'object-focus': 'objectFocus',
  'batch-upload': 'folderUpload',
  'before-after': 'beforeAfter',
  'mark-practice': 'markPractice',
}

/** Self-contained sidebar that manages its own state. Only needs access prop. */
export function StandaloneImportSidebar({
  access,
  activeTab,
  onTabClick,
}: {
  access: ToolAccess
  activeTab?: TabType
  onTabClick?: (tab: TabType) => void
}) {
  const features = useToolFeatures()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isOpen = sidebarOpen

  const visibleTabs = tabs.filter((tab) => features[tabFeatureMap[tab.id]])
  const lockedReason = (tab: TabType): string | null => {
    if (tab === 'image-import') return null
    if (tab === 'object-focus' && !access.canUsePremiumPresets) return 'Pro'
    if (tab === 'batch-upload' && !access.canUseFolderUpload) return 'Pro'
    if (tab === 'before-after' && !access.canUseBeforeAfter) return 'Pro'
    if (tab === 'mark-practice' && !access.canUseMarkPractice) return 'Pro'
    return null
  }

  return (
    <div
      className="relative hidden shrink-0 lg:flex"
      style={{ width: isOpen ? 240 : 60, transition: 'width 200ms ease-out' }}
    >
      <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2" aria-label="Import modes">
          <div className="space-y-0.5">
            {visibleTabs.map((tab) => {
              const locked = lockedReason(tab.id)
              const isActive = activeTab === tab.id || (tab.id === 'image-import' && !activeTab)
              return (
                <button
                  key={tab.id}
                  title={!isOpen ? tab.name : undefined}
                  onClick={() => onTabClick?.(tab.id)}
                  className={`flex items-center gap-2.5 rounded-lg py-1.5 text-left text-sm transition-colors focus:outline-none ${isActive ? 'bg-white/[0.08] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'}`}
                  style={{ width: isOpen ? '100%' : 44, paddingLeft: 6, paddingRight: 6 }}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[var(--bg-tertiary)] ${isActive ? 'border-[var(--accent)]/40 text-[var(--accent)]' : 'border-[var(--border-primary)] text-[var(--text-secondary)]'}`}>
                    {tab.icon}
                  </span>
                  <span
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-opacity"
                    style={{ opacity: isOpen ? 1 : 0 }}
                  >
                    <span className="truncate font-medium">{tab.name}</span>
                    {locked && (
                      <span className="ml-auto shrink-0 rounded-full border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {locked}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </aside>
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute right-0 top-1/2 z-20 flex h-14 w-5 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform" style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)' }} aria-hidden>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>
  )
}

interface ImportSidebarProps {
  tabs: Array<{ id: TabType; name: string; icon: ReactNode; color: string }>
  visibleTabs: Array<{ id: TabType; name: string; icon: ReactNode; color: string }>
  effectiveTab: TabType | undefined
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  onTabClick: (tab: TabType) => void
  lockedReason: (tab: TabType) => string | null
}

export function ImportSidebar({
  visibleTabs,
  effectiveTab,
  sidebarOpen,
  setSidebarOpen,
  onTabClick,
  lockedReason,
}: ImportSidebarProps) {
  return (
    <div
      className="relative hidden shrink-0 lg:flex"
      style={{ width: sidebarOpen ? 240 : 60, transition: 'width 200ms ease-out' }}
    >
      <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2" aria-label="Import modes">
          <div className="space-y-0.5">
            {visibleTabs.map((tab) => {
              const isActive = effectiveTab === tab.id || (tab.id === 'image-import' && !effectiveTab)
              const locked = lockedReason(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  title={!sidebarOpen ? tab.name : undefined}
                  className={`flex items-center gap-2.5 rounded-lg py-1.5 text-left text-sm transition-colors focus:outline-none ${
                    isActive
                      ? 'bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                  }`}
                  style={{ width: sidebarOpen ? '100%' : 44, paddingLeft: 6, paddingRight: sidebarOpen ? 6 : 6 }}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[var(--bg-tertiary)] ${isActive ? 'border-[var(--accent)]/40 text-[var(--accent)]' : 'border-[var(--border-primary)] text-[var(--text-secondary)]'}`}
                  >
                    {tab.icon}
                  </span>
                  <span
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-opacity"
                    style={{ opacity: sidebarOpen ? 1 : 0 }}
                  >
                    <span className="truncate font-medium">{tab.name}</span>
                    {locked && (
                      <span className="ml-auto shrink-0 rounded-full border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {locked}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </aside>

      <button
        onClick={() => setSidebarOpen((v) => !v)}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute right-0 top-1/2 z-20 flex h-14 w-5 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 transition-transform"
          style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>
  )
}

// Maps each import mode to the admin-controlled feature flag that gates it.
const tabFeature: Record<TabType, keyof ToolFeatureFlags> = {
  'image-import': 'standardImport',
  'object-focus': 'objectFocus',
  'batch-upload': 'folderUpload',
  'before-after': 'beforeAfter',
  'mark-practice': 'markPractice',
}

interface EmptyStateProps {
  handleImportClick: () => void
  dirInputRef: React.RefObject<HTMLInputElement | null>
  handleDirUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  beforeAfterInputRef: React.RefObject<HTMLInputElement | null>
  handleBeforeAfterImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  beforeAfterGridType: BeforeAfterMarkGridType
  setBeforeAfterGridType: (gridType: BeforeAfterMarkGridType) => void
  isProcessingFolder: boolean
  uploadedFolders: { color: boolean; uncolor: boolean; palette: boolean; solutionsCollage: boolean }
  imageInputRef: React.RefObject<HTMLInputElement | null>
  handleImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Transparent Importer
  handleImportTransparentClick: () => void
  transparentImageInputRef: React.RefObject<HTMLInputElement | null>
  handleTransparentImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Navigation
  handleNextToSetup?: () => void
  isPreparingStep2?: boolean
  access: ToolAccess

  // Render mode: sidebarOnly renders only the sidebar (no content, no hidden inputs)
  // contentOnly renders only the content area (no sidebar)
  // onTabSelect is called when a tab is clicked (in addition to internal state update)
  sidebarOnly?: boolean
  contentOnly?: boolean
  onTabSelect?: (tab: TabType) => void
  // Controlled active tab — when provided, overrides internal state
  activeTab?: TabType
  importProgress?: { current: number; total: number } | null
}

export default function EmptyState({
  handleImportClick,
  dirInputRef,
  handleDirUploadChange,
  beforeAfterInputRef,
  handleBeforeAfterImageChange,
  beforeAfterGridType,
  setBeforeAfterGridType,
  isProcessingFolder,
  uploadedFolders,
  imageInputRef,
  handleImageFileChange,
  handleImportTransparentClick,
  transparentImageInputRef,
  handleTransparentImageFileChange,
  handleNextToSetup,
  isPreparingStep2,
  access,
  sidebarOnly = false,
  contentOnly = false,
  onTabSelect,
  activeTab: controlledTab,
  importProgress,
}: EmptyStateProps) {
  const features = useToolFeatures()
  const [activeTab, setActiveTab] = useState<TabType>(controlledTab ?? 'image-import')

  useEffect(() => {
    if (controlledTab) setActiveTab(controlledTab)
  }, [controlledTab])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [markPracticeGridType, setMarkPracticeGridType] = useState<MarkPracticeGridType>('hexagon-mark')

  const [isGeneratingMarkPractice, setIsGeneratingMarkPractice] = useState(false)
  const [markPracticeStatus, setMarkPracticeStatus] = useState('')

  const lockedReason = (tab: TabType): string | null => {
    if (tab === 'image-import') return null
    if (tab === 'object-focus' && !access.canUsePremiumPresets) return 'Pro'
    if (tab === 'batch-upload' && !access.canUseFolderUpload) return 'Pro'
    if (tab === 'before-after' && !access.canUseBeforeAfter) return 'Pro'
    if (tab === 'mark-practice' && !access.canUseMarkPractice) return 'Pro'
    return null
  }

  const renderLocked = (label: string) => {
    let redirectPath = '/studio/projects'
    if (typeof window !== 'undefined') {
      redirectPath = window.location.pathname + window.location.search
    }
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-primary)] text-[var(--accent)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{label} is Pro</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Guest and Free workspaces can upload, preview, convert up to 3 images, adjust basic settings, and export limited
          PNG/PDF.
        </p>
        <a
          href={access.isGuest ? `/login?redirectTo=${encodeURIComponent(redirectPath)}` : '/pricing'}
          className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
        >
          {access.isGuest ? 'Sign in' : 'Upgrade'}
        </a>
      </div>
    )
  }

  const handleDownloadMarkPractice = async () => {
    if (!access.canUseMarkPractice) {
      setMarkPracticeStatus('Mark Practice is available on Pro.')
      return
    }
    setIsGeneratingMarkPractice(true)
    setMarkPracticeStatus('')
    try {
      const images = [
        ...generateMarkPracticeImages(markPracticeGridType),
        ...generateMarkPracticeExampleImages(markPracticeGridType),
      ]
      const zip = new JSZip()
      const folder = zip.folder('mark_practice')
      for (const image of images) {
        const blob = await markPracticeCanvasToBlob(image.canvas)
        folder?.file(image.fileName, blob)
        image.canvas.width = 0
        image.canvas.height = 0
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `mark-practice-${markPracticeGridType}.zip`)
      setMarkPracticeStatus(`Created ${images.length} mark files.`)
    } catch (error) {
      console.error('Failed to generate mark practice files:', error)
      setMarkPracticeStatus('Failed to generate mark files.')
    } finally {
      setIsGeneratingMarkPractice(false)
    }
  }

  // Only show import modes whose feature flag is enabled by the admin.
  const visibleTabs = tabs.filter((tab) => features[tabFeature[tab.id]])
  const effectiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : visibleTabs[0]?.id

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab)
    onTabSelect?.(tab)
  }

  const renderContent = () => {
    if (!effectiveTab) {
      return (
        <p className="text-lg text-[var(--text-secondary)]">
          No tools are currently enabled. Please contact your administrator.
        </p>
      )
    }

    if (importProgress && (effectiveTab === 'image-import' || effectiveTab === 'object-focus')) {
      return (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 p-8 rounded-2xl border border-white/10 bg-[var(--bg-secondary)] shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="relative flex items-center justify-center w-14 h-14 mb-2">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-[var(--accent)] animate-spin" />
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">Importing Images...</p>
            <p className="mt-1 text-xs text-white/50">Reading file {importProgress.current} of {importProgress.total}</p>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )
    }
    const reason = lockedReason(effectiveTab)
    if (reason) {
      const label = tabs.find((tab) => tab.id === effectiveTab)?.name ?? 'This workflow'
      return renderLocked(label)
    }
    switch (effectiveTab) {
      case 'image-import':
        return (
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 outline-none border-none">
            {/* Big drop zone */}
            <button
              onClick={handleImportClick}
              className="group relative w-full rounded-2xl border-2 border-dashed border-[var(--border-primary)] bg-[var(--bg-secondary)] p-14 text-center transition-all hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/[0.03]"
            >
              {/* Upload arrow */}
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-primary)] text-[var(--text-muted)] ring-1 ring-[var(--border-primary)] transition-all group-hover:text-[var(--accent)] group-hover:ring-[var(--accent)]/40">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Drop images here</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">or click to browse your files</p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">PNG · JPG · Multiple files supported</p>
            </button>
            {/* Primary CTA */}
            <button
              onClick={handleImportClick}
              className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              Select Images
            </button>
          </div>
        )
      case 'object-focus':
        return (
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 outline-none border-none">
            {/* Context label */}
            <div className="flex items-center gap-2 self-center rounded-full bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              White backgrounds removed automatically
            </div>
            {/* Big drop zone */}
            <button
              onClick={handleImportTransparentClick}
              className="group relative w-full rounded-2xl border-2 border-dashed border-purple-500/25 bg-[var(--bg-secondary)] p-14 text-center transition-all hover:border-purple-400/60 hover:bg-purple-500/[0.04]"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-primary)] text-purple-500/50 ring-1 ring-purple-500/20 transition-all group-hover:text-purple-400 group-hover:ring-purple-400/40">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Drop images here</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Object will be isolated, background stripped</p>
              <p className="mt-3 text-xs text-[var(--text-muted)]">PNG · JPG · Multiple files supported</p>
            </button>
            <button
              onClick={handleImportTransparentClick}
              className="w-full rounded-xl bg-purple-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-600"
            >
              Select Images
            </button>
          </div>
        )
      case 'batch-upload':
        return (
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 outline-none border-none">
            {/* Folder structure diagram */}
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Expected folder structure</p>
              <div className="space-y-1 font-mono text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span className="text-[var(--text-primary)] font-semibold">my-project/</span>
                  <span className="text-[10px] text-[var(--text-muted)]">← select this</span>
                </div>
                {[
                  { label: 'color/', ready: uploadedFolders.color, required: true, dot: 'bg-green-500' },
                  { label: 'uncolor/', ready: uploadedFolders.uncolor, required: true, dot: 'bg-blue-500' },
                  { label: 'palette/', ready: uploadedFolders.palette, required: false, dot: 'bg-pink-500' },
                  { label: 'solutions_collage/', ready: uploadedFolders.solutionsCollage, required: false, dot: 'bg-cyan-500' },
                ].map(({ label, ready, required, dot }) => (
                  <div key={label} className="flex items-center gap-2 pl-5">
                    <span className="text-[var(--text-muted)]">└─</span>
                    <span className={`${ready ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
                    {required && !ready && <span className="text-[10px] text-[var(--text-muted)]">required</span>}
                    {!required && <span className="text-[10px] text-[var(--text-muted)]">optional</span>}
                    {ready && <span className={`ml-auto h-2 w-2 rounded-full ${dot}`} />}
                  </div>
                ))}
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => dirInputRef.current?.click()}
                disabled={isProcessingFolder}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 py-3 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
              >
                {isProcessingFolder ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />Scanning…</>
                ) : (
                  <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Select Root Folder</>
                )}
              </button>
              {uploadedFolders.color && uploadedFolders.uncolor && (
                <button
                  onClick={handleNextToSetup}
                  disabled={isPreparingStep2 || isProcessingFolder}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 animate-in fade-in slide-in-from-right-2"
                >
                  {isPreparingStep2 ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>Continue <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>
                  )}
                </button>
              )}
            </div>
          </div>
        )
      case 'before-after':
        return (
          <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 outline-none border-none">
            {/* Visual preview of what this mode does */}
            <div className="flex w-full items-stretch gap-2 rounded-2xl border border-amber-500/20 bg-[var(--bg-secondary)] p-4">
              <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-[var(--bg-primary)] py-5">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 w-4 rounded-sm bg-white/10" />
                  ))}
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)]">Uncolored</span>
              </div>
              <div className="flex shrink-0 items-center px-1 text-amber-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-[var(--bg-primary)] py-5">
                <div className="flex gap-0.5">
                  {['bg-red-400','bg-blue-400','bg-green-400','bg-yellow-400'].map((c,i) => (
                    <div key={i} className={`h-4 w-4 rounded-sm ${c} opacity-80`} />
                  ))}
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)]">Colored</span>
              </div>
            </div>
            {/* Mark style selector */}
            <div className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3">
              <span className="text-sm text-[var(--text-secondary)]">Mark style</span>
              <select
                value={beforeAfterGridType}
                disabled={isProcessingFolder}
                onChange={(e) => setBeforeAfterGridType(e.target.value as BeforeAfterMarkGridType)}
                className="ml-auto h-8 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="square-mark">Square</option>
                <option value="hexagon-mark">Hexagon</option>
              </select>
            </div>
            {/* CTA */}
            <button
              onClick={() => beforeAfterInputRef.current?.click()}
              disabled={isProcessingFolder}
              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-[var(--bg-primary)] transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {isProcessingFolder ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />Scanning…
                </span>
              ) : 'Select 1 Image → Auto-generate Split'}
            </button>
          </div>
        )
      case 'mark-practice':
        return (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 outline-none border-none">
            {/* Description card */}
            <div className="rounded-2xl border border-green-500/20 bg-[var(--bg-secondary)] p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">What you'll get</p>
                  <p className="text-xs text-[var(--text-muted)]">A ZIP archive with printable practice sheets</p>
                </div>
              </div>
              <ul className="space-y-2">
                {['One PNG strip per mark type with empty practice cells', 'Two completed example sheets for reference', 'All bundled into a single ZIP file'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <svg className="mt-0.5 shrink-0 text-green-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Mark style */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-3">
              <span className="text-sm text-[var(--text-secondary)]">Mark style</span>
              <select
                value={markPracticeGridType}
                disabled={isGeneratingMarkPractice}
                onChange={(e) => setMarkPracticeGridType(e.target.value as MarkPracticeGridType)}
                className="ml-auto h-8 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="hexagon-mark">Hexagon</option>
                <option value="square-mark">Square</option>
              </select>
            </div>
            {markPracticeStatus && (
              <p className="text-center text-sm text-[var(--text-secondary)]">{markPracticeStatus}</p>
            )}
            {/* Generate button */}
            <button
              onClick={handleDownloadMarkPractice}
              disabled={isGeneratingMarkPractice}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isGeneratingMarkPractice ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Generating…</>
              ) : (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Generate &amp; Download ZIP</>
              )}
            </button>
          </div>
        )
      default:
        return null
    }
  }


  // sidebarOnly: render only the ImportSidebar (no content, no hidden inputs)
  if (sidebarOnly) {
    return (
      <ImportSidebar
        tabs={tabs}
        visibleTabs={visibleTabs}
        effectiveTab={effectiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onTabClick={handleTabClick}
        lockedReason={lockedReason}
      />
    )
  }

  // contentOnly: render only the content area (no sidebar)
  if (contentOnly) {
    return (
      <>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {visibleTabs.map((tab) => {
            const isActive = effectiveTab === tab.id
            const locked = lockedReason(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none ${
                  isActive
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                    : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                <span style={{ color: isActive ? 'var(--accent)' : 'currentColor' }}>{tab.icon}</span>
                {tab.name}
                {locked && (
                  <span className="rounded-full border border-[var(--accent)]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {locked}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="w-full max-w-4xl text-center outline-none border-none">{renderContent()}</div>
      </>
    )
  }

  // Default: full layout (sidebar + content + hidden inputs)
  return (
    <div id="import-modes" className="flex h-full w-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar wrapper */}
      <ImportSidebar
        tabs={tabs}
        visibleTabs={visibleTabs}
        effectiveTab={effectiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onTabClick={handleTabClick}
        lockedReason={lockedReason}
      />

      <main className="relative min-w-0 flex-1 overflow-hidden bg-[var(--bg-primary)] p-4 sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative z-10 flex h-full w-full flex-col">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {visibleTabs.map((tab) => {
              const isActive = effectiveTab === tab.id
              const locked = lockedReason(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none ${
                    isActive
                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--text-primary)]'
                      : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span style={{ color: isActive ? 'var(--accent)' : 'currentColor' }}>{tab.icon}</span>
                  {tab.name}
                  {locked && (
                    <span className="rounded-full border border-[var(--accent)]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                      {locked}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-4xl text-center outline-none border-none">{renderContent()}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
