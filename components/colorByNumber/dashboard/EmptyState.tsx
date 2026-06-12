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

export type TabType = 'standard' | 'object' | 'folder' | 'before-after' | 'mark-practice'

export const tabs: Array<{ id: TabType; name: string; icon: ReactNode; color: string }> = [
  {
    id: 'standard',
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
    id: 'object',
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
    id: 'folder',
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
  standard: 'standardImport',
  object: 'objectFocus',
  folder: 'folderUpload',
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
  const [sidebarHovering, setSidebarHovering] = useState(false)
  const isOpen = sidebarOpen || sidebarHovering

  const visibleTabs = tabs.filter((tab) => features[tabFeatureMap[tab.id]])
  const lockedReason = (tab: TabType): string | null => {
    if (tab === 'standard') return null
    if (tab === 'object' && !access.canUsePremiumPresets) return 'Pro'
    if (tab === 'folder' && !access.canUseFolderUpload) return 'Pro'
    if (tab === 'before-after' && !access.canUseBeforeAfter) return 'Pro'
    if (tab === 'mark-practice' && !access.canUseMarkPractice) return 'Pro'
    return null
  }

  return (
    <div
      className="relative hidden shrink-0 lg:flex"
      style={{ width: isOpen ? 240 : 60, transition: 'width 200ms ease-out' }}
      onMouseEnter={() => { if (!sidebarOpen) setSidebarHovering(true) }}
      onMouseLeave={() => setSidebarHovering(false)}
    >
      <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2" aria-label="Import modes">
          <p
            className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] transition-opacity duration-200"
            style={{ opacity: isOpen ? 1 : 0 }}
          >
            Import modes
          </p>
          <div className="space-y-0.5">
            {visibleTabs.map((tab) => {
              const locked = lockedReason(tab.id)
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  title={!isOpen ? tab.name : undefined}
                  onClick={() => onTabClick?.(tab.id)}
                  className={`flex items-center gap-2.5 rounded-lg py-1.5 text-left text-sm transition-colors ${isActive ? 'bg-white/[0.08] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'}`}
                  style={{ width: isOpen ? '100%' : 44, paddingLeft: 6, paddingRight: 6 }}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-[var(--bg-tertiary)] ${isActive ? 'border-[var(--accent)]/40' : 'border-[var(--border-primary)]'}`} style={{ color: tab.color }}>
                    {tab.icon}
                  </span>
                  <span
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-opacity duration-200"
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
        onClick={() => { setSidebarOpen((v) => !v); setSidebarHovering(false) }}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="absolute right-0 top-1/2 z-20 flex h-14 w-5 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform duration-200" style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)' }} aria-hidden>
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
              const isActive = effectiveTab === tab.id
              const locked = lockedReason(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  title={!sidebarOpen ? tab.name : undefined}
                  className={`flex items-center gap-2.5 rounded-lg py-1.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                  }`}
                  style={{ width: sidebarOpen ? '100%' : 44, paddingLeft: 6, paddingRight: sidebarOpen ? 6 : 6 }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-primary)] bg-[var(--bg-tertiary)]"
                    style={{ color: isActive ? tab.color : 'currentColor' }}
                  >
                    {tab.icon}
                  </span>
                  <span
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden transition-opacity duration-200"
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
          className="h-3 w-3 transition-transform duration-200"
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
  standard: 'standardImport',
  object: 'objectFocus',
  folder: 'folderUpload',
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
}: EmptyStateProps) {
  const features = useToolFeatures()
  const [activeTab, setActiveTab] = useState<TabType>(controlledTab ?? 'standard')

  useEffect(() => {
    if (controlledTab) setActiveTab(controlledTab)
  }, [controlledTab])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [markPracticeGridType, setMarkPracticeGridType] = useState<MarkPracticeGridType>('hexagon-mark')

  const [isGeneratingMarkPractice, setIsGeneratingMarkPractice] = useState(false)
  const [markPracticeStatus, setMarkPracticeStatus] = useState('')

  const lockedReason = (tab: TabType): string | null => {
    if (tab === 'standard') return null
    if (tab === 'object' && !access.canUsePremiumPresets) return 'Pro'
    if (tab === 'folder' && !access.canUseFolderUpload) return 'Pro'
    if (tab === 'before-after' && !access.canUseBeforeAfter) return 'Pro'
    if (tab === 'mark-practice' && !access.canUseMarkPractice) return 'Pro'
    return null
  }

  const renderLocked = (label: string) => (
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
        href={access.isGuest ? '/login?redirectTo=/studio/projects' : '/pricing'}
        className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)]"
      >
        {access.isGuest ? 'Sign in' : 'Upgrade'}
      </a>
    </div>
  )

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
    const reason = lockedReason(effectiveTab)
    if (reason) {
      const label = tabs.find((tab) => tab.id === effectiveTab)?.name ?? 'This workflow'
      return renderLocked(label)
    }
    switch (effectiveTab) {
      case 'standard':
        return (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Standard Import</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-md">
              Convert multiple images into mosaic patterns. Focuses on the entire frame of each image.
            </p>
            <button
              onClick={handleImportClick}
              className="px-12 py-5 text-xl font-semibold text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-2xl shadow-[0_8px_30px_rgb(34,211,238,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              Select Images
            </button>
          </div>
        )
      case 'object':
        return (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(168,85,247,0.1)] relative">
              <div className="absolute -top-2 -right-2 bg-purple-500 text-white p-1.5 rounded-full shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Object Focus</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-md">
              Automatically strips white backgrounds to isolate the main object. Perfect for creating character
              stickers.
            </p>
            <button
              onClick={handleImportTransparentClick}
              className="px-12 py-5 text-xl font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-2xl shadow-[0_8px_30px_rgba(168,85,247,0.3)] transition-all hover:scale-105 active:scale-95"
            >
              Transparent Import
            </button>
          </div>
        )
      case 'folder':
        return (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Folder Upload</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md">
              Bulk upload images with pre-separated <b>color/</b>, <b>uncolor/</b>, optional <b>palette/</b>, and{' '}
              <b>solutions_collage/</b> subfolders.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12 max-w-3xl">
              <div
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${
                  uploadedFolders.color
                    ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.color ? 'bg-green-500 text-white' : 'bg-white/10'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>Color</span>
              </div>
              <div
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${
                  uploadedFolders.uncolor
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.uncolor ? 'bg-blue-500 text-white' : 'bg-white/10'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span>Uncolor</span>
              </div>
              <div
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${
                  uploadedFolders.palette
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.palette ? 'bg-pink-500 text-white' : 'bg-white/10'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex flex-col items-center">
                  <span>Palette</span>
                  <span className="text-[10px] font-normal opacity-70">(Optional)</span>
                </div>
              </div>
              <div
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${
                  uploadedFolders.solutionsCollage
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'bg-white/5 border-white/10 text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.solutionsCollage ? 'bg-cyan-500 text-white' : 'bg-white/10'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex flex-col items-center">
                  <span>Solutions</span>
                  <span className="text-[10px] font-normal opacity-70">(Optional)</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 items-center">
              <button
                onClick={() => dirInputRef.current?.click()}
                disabled={isProcessingFolder}
                className="px-12 py-4 text-lg font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[260px]"
              >
                {isProcessingFolder ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Select Root Folder'
                )}
              </button>

              {uploadedFolders.color && uploadedFolders.uncolor && (
                <button
                  onClick={handleNextToSetup}
                  disabled={isPreparingStep2 || isProcessingFolder}
                  className="px-12 py-4 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[260px] animate-in fade-in slide-in-from-bottom-2"
                >
                  {isPreparingStep2 ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue to Setup
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )
      case 'before-after':
        return (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
                <rect x="3" y="5" width="6" height="14" rx="1.5" />
                <rect x="15" y="5" width="6" height="14" rx="1.5" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Before/After</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md">
              Import one image and generate a before/after PNG automatically: uncolored on the left, colored on the
              right.
            </p>

            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <span className="text-sm font-semibold text-amber-200">Mark</span>
              <select
                value={beforeAfterGridType}
                disabled={isProcessingFolder}
                onChange={(e) => setBeforeAfterGridType(e.target.value as BeforeAfterMarkGridType)}
                className="h-9 rounded-lg border border-amber-400/40 bg-[var(--bg-primary)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none"
              >
                <option value="square-mark">Square mark</option>
                <option value="hexagon-mark">Hexagon mark</option>
              </select>
            </div>

            <button
              onClick={() => beforeAfterInputRef.current?.click()}
              disabled={isProcessingFolder}
              className="px-12 py-4 text-lg font-semibold text-amber-300 border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[280px]"
            >
              {isProcessingFolder ? (
                <>
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Scanning...
                </>
              ) : (
                'Select Image'
              )}
            </button>
          </div>
        )
      case 'mark-practice':
        return (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-green-500/10 text-green-400 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
                <path d="M7 4v16" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Mark Practice</h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md">
              Export each mark into its own PNG strip with empty mark cells after it, plus two example images.
            </p>

            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-green-400/30 bg-green-400/10 px-4 py-3">
              <span className="text-sm font-semibold text-green-200">Mark</span>
              <select
                value={markPracticeGridType}
                disabled={isGeneratingMarkPractice}
                onChange={(e) => setMarkPracticeGridType(e.target.value as MarkPracticeGridType)}
                className="h-9 rounded-lg border border-green-400/40 bg-[var(--bg-primary)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none"
              >
                <option value="hexagon-mark">Hexagon mark</option>
                <option value="square-mark">Square mark</option>
              </select>
            </div>

            <button
              onClick={handleDownloadMarkPractice}
              disabled={isGeneratingMarkPractice}
              className="px-12 py-4 text-lg font-semibold text-green-300 border border-green-400/40 bg-green-400/10 hover:bg-green-400/15 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[300px]"
            >
              {isGeneratingMarkPractice ? (
                <>
                  <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                'Download Mark Files'
              )}
            </button>
            {markPracticeStatus && <p className="mt-4 text-sm text-[var(--text-secondary)]">{markPracticeStatus}</p>}
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

  const hiddenInputs = (
    <>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" multiple onChange={handleImageFileChange} />
      <input ref={transparentImageInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" multiple onChange={handleTransparentImageFileChange} />
      <input
        ref={dirInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory: string; directory: string })}
        className="hidden"
        onChange={handleDirUploadChange}
      />
      <input ref={beforeAfterInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleBeforeAfterImageChange} />
    </>
  )

  // contentOnly: render only the content area (no sidebar)
  if (contentOnly) {
    return (
      <>
        {hiddenInputs}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {visibleTabs.map((tab) => {
            const isActive = effectiveTab === tab.id
            const locked = lockedReason(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
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
        <div className="w-full max-w-4xl text-center">{renderContent()}</div>
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
                  className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
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
            <div className="w-full max-w-4xl text-center">{renderContent()}</div>
          </div>
        </div>
      </main>

      {/* Hidden Inputs */}
      {hiddenInputs}
    </div>
  )
}
