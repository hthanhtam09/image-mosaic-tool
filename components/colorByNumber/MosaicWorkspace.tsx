'use client'

import type { ColorByNumberGridType, PartialColorMode } from '@/lib/colorByNumber'
import type { ToolAccess } from '@/lib/tools/access'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'
import { useBookDesignStore } from '@/store/useBookDesignStore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { useToolPatterns } from '@/components/ToolFlagsProvider'

import { useAccessGate } from '@/hooks/useAccessGate'
import { useBeforeAfter } from '@/hooks/useBeforeAfter'
import { useImageImport } from '@/hooks/useImageImport'
import { usePdfExport } from '@/hooks/usePdfExport'
import { useZipExport } from '@/hooks/useZipExport'

import ProjectPreviewModal from './ProjectPreviewModal'
import BeforeAfterPanel from './workspace/BeforeAfterPanel'
import EmptyState, { type TabType } from './dashboard/EmptyState'
import GlobalSettings from './dashboard/GlobalSettings'
import PdfProgressStep from './dashboard/PdfProgressStep'
import PdfSetupStep from './dashboard/PdfSetupStep'
import ProjectGrid from './dashboard/ProjectGrid'
import DownloadProgressModal from './dashboard/DownloadProgressModal'
import BookDesignConfigStep from './dashboard/BookDesignConfigStep'

const SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[] = [
  { value: 'none', label: 'Full Color', icon: '🟩' },
  { value: 'diagonal-bl-tr', label: 'Diagonal ↗', icon: '◣' },
  { value: 'diagonal-tl-br', label: 'Diagonal ↘', icon: '◤' },
  { value: 'horizontal-middle', label: 'Top Half', icon: '⬒' },
  { value: 'horizontal-sides', label: 'Bottom Half', icon: '⬓' },
]

const GRID_TYPES: { value: ColorByNumberGridType; label: string }[] = [
  { value: 'standard', label: 'Square' },
  { value: 'honeycomb', label: 'Circle' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'pentagon', label: 'Hexagon' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'islamic', label: 'Islamic' },
  { value: 'fish-scale', label: 'Fish Scale' },
  { value: 'trapezoid', label: 'Trapezoid' },
  { value: 'square-mark', label: 'Square mark' },
  { value: 'hexagon-mark', label: 'Hexagon mark' },
]

const ALL_PATTERNS: ColorByNumberGridType[] = GRID_TYPES.map((g) => g.value)

export default function MosaicWorkspace({
  access,
  onBack,
  projectName,
  activeTab,
  setActiveTab,
}: {
  access: ToolAccess
  onBack?: () => void
  projectName?: string
  activeTab?: TabType | null
  setActiveTab?: (tab: TabType | null) => void
}) {
  const {
    projects,
    convertAllIdleProjects,
    conversionJob,
    globalTheme,
    globalShowNumbers,
    globalGridType,
    globalCellSize,
    setGlobalTheme,
    setGlobalGridType,
    updateProject,
    removeAllProjects,
    removeProject,
  } = useColorByNumberStore()

  const enabledPatterns = useToolPatterns()
  const autoCycleIndexRef = useRef(0)

  const { gateNotice, setGateNotice, requestPaidAccess } = useAccessGate(access)

  // Load custom base64 font if present in useBookDesignStore
  const customFontName = useBookDesignStore((s) => s.customFontName);
  const customFontBase64 = useBookDesignStore((s) => s.customFontBase64);
  const customFontExtension = useBookDesignStore((s) => s.customFontExtension);

  useEffect(() => {
    if (!customFontName || !customFontBase64) return;
    
    const fontId = `custom-font-${customFontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(fontId)) return;

    const format = customFontExtension || 'ttf';
    const fontUrl = `data:font/${format};base64,${customFontBase64}`;
    
    const fontFace = new FontFace(customFontName, `url(${fontUrl})`);
    fontFace.load().then((loadedFace) => {
      document.fonts.add(loadedFace);
      
      const styleEl = document.createElement('style');
      styleEl.id = fontId;
      styleEl.textContent = `
        @font-face {
          font-family: '${customFontName}';
          src: url(${fontUrl}) format('${format}');
        }
        text, .cbn-text, svg text {
          font-family: '${customFontName}', 'Noto Sans', sans-serif !important;
        }
      `;
      document.head.appendChild(styleEl);

      // Force canvas redraw
      window.dispatchEvent(new CustomEvent('custom-font-loaded', { detail: customFontName }));
    }).catch((err) => {
      console.error('Failed to load custom font face:', err);
    });

    return () => {
      const styleEl = document.getElementById(fontId);
      if (styleEl) styleEl.remove();
    };
  }, [customFontName, customFontBase64, customFontExtension]);

  const [showSettings, setShowSettings] = useState(false)
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null)
  const currentStep = useColorByNumberStore((state) => state.workspaceStep)
  const setCurrentStep = useColorByNumberStore((state) => state.setWorkspaceStep)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (currentStep === 'design-config') {
      url.searchParams.set('step', 'design-config')
    } else if (currentStep === 2) {
      url.searchParams.set('step', 'pdf')
    } else if (currentStep === 3) {
      url.searchParams.set('step', 'pdf-progress')
    } else if (currentStep === 1) {
      if (projects.length > 0) {
        url.searchParams.set('step', 'convert')
      } else {
        url.searchParams.delete('step')
      }
    } else {
      url.searchParams.delete('step')
    }
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [currentStep, projects.length])

  useEffect(() => {
    // Only force currentStep to 1 if we are navigating into a sub-tab
    if (activeTab !== null) {
      setCurrentStep(1)
    }
  }, [activeTab, setCurrentStep])

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const splitColorRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleGridTypeChange = useCallback(
    (gridType: ColorByNumberGridType | 'auto') => {
      if (gridType === 'auto') {
        const cycle = ALL_PATTERNS.filter((p) => p !== 'square-mark' && p !== 'hexagon-mark' && enabledPatterns[p] !== false)
        autoCycleIndexRef.current = 0
        projects
          .filter((p) => !p.removeBackground)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
          .forEach((p) => {
            updateProject(p.id, {
              gridType: cycle[autoCycleIndexRef.current++ % cycle.length],
              status: p.status === 'completed' ? 'idle' : p.status,
            })
          })
      }
      setGlobalGridType(gridType)
    },
    [enabledPatterns, projects, setGlobalGridType, updateProject]
  )

  const importHook = useImageImport({
    access,
    requestPaidAccess,
    enabledPatterns,
    globalGridType,
    autoCycleIndexRef,
    onImportSuccess: useCallback(() => {
      setActiveTab?.(null)
      if (projectName) {
        window.history.replaceState(null, '', `/studio/projects/${toSlug(projectName)}`)
      }
      // Show Design Config right after first import so user can configure before converting
      setCurrentStep('design-config')
    }, [projectName, setActiveTab])
  })

  const {
    isConverting: importIsConverting, setIsConverting,
    importProgress,
    isProcessingFolder, keepImportScreen, setKeepImportScreen,
    directImages, setDirectImages,
    paletteImages, setPaletteImages,
    solutionCollagePages, setSolutionCollagePages,
    uploadedFolders, setUploadedFolders,
    imageInputRef, transparentImageInputRef, dirInputRef,
    handleImportClick, handleImageFileChange,
    handleImportTransparentClick, handleTransparentImageFileChange,
    handleDirUploadChange, removeDirectImage,
  } = importHook

  // removed requestedTab effect

  const isConverting = importIsConverting || conversionJob.status === 'running'

  const beforeAfterHook = useBeforeAfter({
    access, requestPaidAccess, globalCellSize, globalTheme, directImages,
  })

  const {
    beforeAfterTheme, setBeforeAfterTheme,
    beforeAfterGridType, setBeforeAfterGridType,
    beforeAfterJob,
    isZipping: baIsZipping,
    baProgress,
    beforeAfterInputRef,
    handleBeforeAfterImageChange,
    updateBeforeAfterGridType, updateBeforeAfterTheme,
    handleDownloadSingleBeforeAfter, handleDownloadBeforeAfter,
  } = beforeAfterHook

  const pdfHook = usePdfExport({
    access, requestPaidAccess,
    projects, globalTheme, globalShowNumbers,
    directImages, paletteImages, setPaletteImages,
    solutionCollagePages, setSolutionCollagePages,
    uploadedFolders, setUploadedFolders,
    setCurrentStep,
    setDirectImages,
    setUploadedFoldersReset: () => setUploadedFolders({ color: false, uncolor: false, palette: false, solutionsCollage: false }),
  })

  const {
    bgImages, setBgImages,
    csvData, setCsvData,
    csvFileName, setCsvFileName,
    prefixPages, setPrefixPages,
    suffixPages, setSuffixPages,
    isGeneratingPdf, pdfProgress,
    showStoryInput, setShowStoryInput,
    solutionNameList,
    isPreparingStep2,
    bgInputRef, csvInputRef, prefixInputRef, suffixInputRef,
    paletteInputRef, solutionCollageInputRef,
    solutionNamesInputRef, solutionNamesStep1InputRef,
    handleBgChange, handlePrefixChange, handleSuffixChange,
    handlePaletteChange, handleSolutionCollageChange,
    handleSolutionNamesChange, handleCsvChange,
    handleGeneratePdf, handleNextToSetup,
  } = pdfHook

  const zipHook = useZipExport({
    access, requestPaidAccess,
    projects, globalTheme, globalShowNumbers,
    solutionNameList, paletteImages,
  })
  const { isZipping, zipProgress, handleDownloadAllImages } = zipHook

  const isAnyActionRunning = isConverting || isPreparingStep2 || isGeneratingPdf || isZipping || baIsZipping

  const handleConvertAll = useCallback(async () => {
    if (isConverting) return
    const idleCount = projects.filter((p) => p.status === 'idle' || p.status === 'error').length
    if (idleCount > access.maxConvertAtOnce) {
      requestPaidAccess(`Your ${access.plan} workspace can convert ${access.maxConvertAtOnce} image(s) at once.`)
      return
    }
    setIsConverting(true)
    try {
      await convertAllIdleProjects()
    } finally {
      setIsConverting(false)
    }
  }, [access, convertAllIdleProjects, isConverting, requestPaidAccess, setIsConverting, projects])

  const handleConvertSelected = useCallback(async () => {
    if (isConverting) return
    const toConvert = projects.filter((p) => selectedIds.has(p.id) && (p.status === 'idle' || p.status === 'error'))
    if (toConvert.length === 0) return
    if (toConvert.length > access.maxConvertAtOnce) {
      requestPaidAccess(`Your ${access.plan} workspace can convert ${access.maxConvertAtOnce} image(s) at once.`)
      return
    }
    setIsConverting(true)
    try {
      const convertSingleProject = useColorByNumberStore.getState().convertSingleProject
      const cpuCores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4
      const limit = Math.min(Math.max(cpuCores, 2), 3)
      const queue = [...toConvert]

      const runProcessor = async () => {
        while (queue.length > 0) {
          const p = queue.shift()
          if (!p) break
          try {
            await convertSingleProject(p.id)
          } catch (err) {
            console.error(err)
          }
        }
      }

      const processors = []
      for (let i = 0; i < Math.min(limit, toConvert.length); i++) {
        processors.push(runProcessor())
      }
      await Promise.all(processors)
    } finally {
      setIsConverting(false)
    }
  }, [access, isConverting, projects, selectedIds, requestPaidAccess, setIsConverting])

  const visibleGridTypes = useMemo(() => {
    return GRID_TYPES.filter((type) => enabledPatterns[type.value] !== false)
  }, [enabledPatterns])
  const isFolderModeActive = directImages.length > 0
  const shouldShowImportScreen =
    currentStep !== 'design-config' && (
      (activeTab !== null && activeTab !== 'image-import') ||
      (activeTab === 'image-import' && projects.length === 0) ||
      (projects.length === 0 && !isFolderModeActive && !beforeAfterJob) ||
      (isFolderModeActive && currentStep === 1)
    )

  const idleCount = projects.filter((p) => p.status === 'idle').length
  const selectedIdleCount = projects.filter((p) => selectedIds.has(p.id) && (p.status === 'idle' || p.status === 'error')).length

  return (
    <div id="workspace" className="h-full flex overflow-hidden">
      {/* Main content area */}
      {shouldShowImportScreen ? (
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[var(--bg-primary)] p-4 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            <EmptyState
              contentOnly
              activeTab={activeTab ?? undefined}
              importProgress={importProgress}
              onTabSelect={(tab) => {
                setActiveTab?.(tab)
                if (projectName) {
                  window.history.replaceState(null, '', `/studio/projects/${toSlug(projectName)}/${tab}`)
                }
              }}
              handleImportClick={() => handleImportClick(projects.length)}
              handleImportTransparentClick={handleImportTransparentClick}
              dirInputRef={dirInputRef}
              handleDirUploadChange={handleDirUploadChange}
              beforeAfterInputRef={beforeAfterInputRef}
              handleBeforeAfterImageChange={handleBeforeAfterImageChange}
              beforeAfterGridType={beforeAfterGridType}
              setBeforeAfterGridType={setBeforeAfterGridType}
              isProcessingFolder={isProcessingFolder}
              uploadedFolders={uploadedFolders}
              imageInputRef={imageInputRef}
              handleImageFileChange={(e) => handleImageFileChange(e, projects.length)}
              transparentImageInputRef={transparentImageInputRef}
              handleTransparentImageFileChange={(e) => handleTransparentImageFileChange(e, projects.length, setCurrentStep)}
              handleNextToSetup={handleNextToSetup}
              isPreparingStep2={isPreparingStep2}
              access={access}
            />
          </div>
          {previewProjectId && (
            <ProjectPreviewModal
              projectId={previewProjectId}
              projects={projects}
              onClose={() => setPreviewProjectId(null)}
              onNavigate={setPreviewProjectId}
            />
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1 flex flex-col p-8 overflow-hidden">
      {gateNotice && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm text-(--text-primary)">
          <div>
            <p className="font-semibold">{gateNotice.title}</p>
            <p className="mt-1 text-(--text-secondary)">{gateNotice.message}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={gateNotice.href} className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-primary)]">
              {gateNotice.action}
            </a>
            <button type="button" onClick={() => setGateNotice(null)} className="rounded-md px-2 py-1 text-xs text-(--text-secondary) hover:bg-white/10 hover:text-(--text-primary)">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-default)]">
        {/* Left Side: Navigation & Project Context */}
        <div className="flex items-center gap-3.5 min-w-0">
          {currentStep === 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to PDF Setup"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to PDF Setup</span>
            </button>
          ) : currentStep === 2 ? (
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                if (directImages.length > 0) {
                  setDirectImages([]);
                  setUploadedFolders({ color: false, uncolor: false, palette: false, solutionsCollage: false });
                  setSolutionCollagePages([]);
                }
              }}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to Convert"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to Convert</span>
            </button>
          ) : currentStep === 'design-config' ? (
            onBack ? (
              <button
                type="button"
                onClick={onBack}
                disabled={isAnyActionRunning}
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Back to Projects"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="text-sm font-medium pr-0.5 select-none">Back to Projects</span>
              </button>
            ) : null
          ) : (activeTab !== null && activeTab !== 'image-import') || (activeTab === 'image-import' && projects.length > 0) ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab?.(null);
                if (projectName) {
                  window.history.replaceState(null, '', `/studio/projects/${toSlug(projectName)}`);
                }
              }}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to Convert"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to Convert</span>
            </button>
          ) : projects.length > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep('design-config')}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to Design Config"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to Design Config</span>
            </button>
          ) : onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to Projects"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to Projects</span>
            </button>
          ) : null}
          {currentStep === 1 && projects.length > 0 && (
            <div className="flex items-center gap-2 pl-4 ml-1.5 border-l border-white/10" onClick={(e) => e.stopPropagation()}>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedIds.size === projects.length && projects.length > 0}
                  onChange={() => {
                    if (selectedIds.size === projects.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(projects.map((p) => p.id)));
                    }
                  }}
                  disabled={isAnyActionRunning}
                  className="h-5 w-5 rounded-full border-2 border-white/60 bg-black/40 checked:bg-[var(--accent)] checked:border-[var(--accent)] appearance-none cursor-pointer transition-all duration-200 flex items-center justify-center after:content-['✓'] after:text-[var(--bg-primary)] after:text-[10px] after:font-bold after:hidden checked:after:block shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span className="text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                  {selectedIds.size === projects.length ? 'Deselect All' : 'Select All'}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Right Side: Re-grouped Actions */}
        {currentStep === 1 && (
          <div className="flex gap-5 items-center">
            {/* Group A: Project Management (Settings, Add, Delete) */}
            <div className="flex items-center gap-2.5">
              <GlobalSettings showSettings={showSettings} setShowSettings={setShowSettings} disabled={isAnyActionRunning} onGridTypeChange={handleGridTypeChange} />
              <button
                onClick={() => handleImportClick(projects.length)}
                disabled={isAnyActionRunning}
                className="flex h-10 items-center justify-center px-4 text-sm font-semibold text-[var(--text-primary)] border border-[var(--border-default)] bg-white/5 rounded-xl shadow-sm hover:bg-white/10 hover:border-[var(--text-secondary)]/30 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
              </button>

              {projects.length > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  disabled={isAnyActionRunning}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 active:scale-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={selectedIds.size > 0 ? `Delete selected (${selectedIds.size})` : "Delete all"}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Group Splitter: Vertical Divider */}
            {((selectedIds.size > 0 ? selectedIdleCount > 0 : idleCount > 0) || isAnyActionRunning || (currentStep === 1 && (projects.length > 0 || directImages.length > 0) && (selectedIds.size > 0 ? selectedIdleCount === 0 : idleCount === 0) && !isAnyActionRunning)) && (
              <div className="h-6 w-px bg-[var(--border-default)] mx-3 self-center" />
            )}

            {/* Group B: Action Execution (Convert / Export / Next Step) */}
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 ? (
                (selectedIdleCount > 0 || isAnyActionRunning) && (
                  <button
                    onClick={handleConvertSelected}
                    disabled={isAnyActionRunning}
                    className="flex h-10 items-center justify-center px-6 text-sm font-semibold text-[var(--bg-primary)] bg-gradient-to-r from-[var(--accent-deep)] to-[var(--accent)] hover:from-[var(--accent)] hover:to-[var(--accent-hover)] rounded-xl shadow-lg shadow-[var(--accent)]/15 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2 min-w-[160px]"
                  >
                    {isConverting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        Convert Selected ({selectedIdleCount})
                      </>
                    )}
                  </button>
                )
              ) : (
                (idleCount > 0 || isAnyActionRunning) && (
                  <button
                    onClick={handleConvertAll}
                    disabled={isAnyActionRunning}
                    className="flex h-10 items-center justify-center px-6 text-sm font-semibold text-[var(--bg-primary)] bg-gradient-to-r from-[var(--accent-deep)] to-[var(--accent)] hover:from-[var(--accent)] hover:to-[var(--accent-hover)] rounded-xl shadow-lg shadow-[var(--accent)]/15 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2 min-w-[160px]"
                  >
                    {isConverting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        Convert All ({idleCount})
                      </>
                    )}
                  </button>
                )
              )}

              {currentStep === 1 && (projects.length > 0 || directImages.length > 0) && idleCount === 0 && !isConverting && (
                <div className="flex gap-3 items-center">
                  {projects.length > 0 && (globalGridType === 'square-mark' || globalGridType === 'hexagon-mark') && (
                    <button
                      onClick={() => solutionNamesStep1InputRef.current?.click()}
                      disabled={isZipping || isAnyActionRunning}
                      className="flex h-10 items-center justify-center px-5 text-sm font-semibold text-[var(--accent)] border border-[var(--accent)]/20 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/40 rounded-xl shadow-sm active:scale-[0.98] transition-all duration-200 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      Import CSV Name (optional){solutionNameList.length > 0 ? ` (${solutionNameList.length})` : ''}
                    </button>
                  )}
                  {projects.length > 0 && (
                    <button
                      onClick={handleDownloadAllImages}
                      disabled={isZipping || isAnyActionRunning}
                      className="flex h-10 items-center justify-center px-5 text-sm font-semibold text-[var(--accent)] border border-[var(--accent)]/20 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/40 rounded-xl shadow-sm active:scale-[0.98] transition-all duration-200 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isZipping ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
                      Download All (.zip)
                    </button>
                  )}
                  {directImages.some((img) => img.colorUrl && img.uncolorUrl) && (
                    <button
                      onClick={handleDownloadBeforeAfter}
                      disabled={baIsZipping || isAnyActionRunning}
                      className="flex h-10 items-center justify-center px-5 text-sm font-semibold text-amber-300 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 rounded-xl shadow-sm active:scale-[0.98] transition-all duration-200 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {baIsZipping ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>}
                      Before/After
                    </button>
                  )}
                  {/* Next: Setup PDF — goes directly to step 2 (Design Config is now pre-convert) */}
                  <button
                    onClick={handleNextToSetup}
                    disabled={isAnyActionRunning}
                    className="flex h-10 items-center justify-center px-6 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/15 active:scale-[0.98] transition-all duration-200 gap-2 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreparingStep2 ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Next: Setup PDF</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 'design-config' && (
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                useBookDesignStore.getState().resetToDefaults()
                setGlobalTheme('light')
                setGlobalGridType('standard')
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/80 border border-white/8 bg-white/5 transition-all active:scale-[0.98]"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs text-white
                bg-gradient-to-r from-[var(--accent-deep)] to-[var(--accent)] hover:from-[var(--accent)] hover:to-[var(--accent-hover)]
                shadow-lg shadow-[var(--accent)]/10 active:scale-[0.98] transition-all duration-200"
            >
              Next: Convert
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <button
            onClick={handleGeneratePdf}
            disabled={isAnyActionRunning}
            className="px-6 py-2.5 text-xs font-bold text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl active:scale-95 transition-all duration-200 shadow-md shadow-[var(--accent)]/15 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <span>Generate & Download PDF</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              </>
            )}
          </button>
        )}
      </div>

      {/* Step 1: Grid */}
      {currentStep === 1 && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <BeforeAfterPanel
            beforeAfterJob={beforeAfterJob}
            beforeAfterTheme={beforeAfterTheme}
            setBeforeAfterTheme={setBeforeAfterTheme}
            beforeAfterGridType={beforeAfterGridType}
            isProcessingFolder={beforeAfterHook.isProcessingFolder}
            directImages={directImages}
            beforeAfterInputRef={beforeAfterInputRef}
            updateBeforeAfterGridType={updateBeforeAfterGridType}
            updateBeforeAfterTheme={updateBeforeAfterTheme}
            handleDownloadSingleBeforeAfter={handleDownloadSingleBeforeAfter}
          />
          {!beforeAfterJob && (
            <ProjectGrid
              projects={projects}
              directImages={directImages}
              removeDirectImage={removeDirectImage}
              splitColorRef={splitColorRef}
              setPreviewProjectId={setPreviewProjectId}
              SPLIT_COLOR_MODES={SPLIT_COLOR_MODES}
              GRID_TYPES={visibleGridTypes}
              isConverting={isAnyActionRunning}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
            />
          )}
        </div>
      )}

      {/* Step 2: PDF Setup */}
      {currentStep === 2 && (
        <PdfSetupStep
          directImages={directImages}
          uploadedFolders={uploadedFolders}
          prefixPages={prefixPages}
          prefixInputRef={prefixInputRef}
          handlePrefixChange={handlePrefixChange}
          setPrefixPages={setPrefixPages}
          bgImages={bgImages}
          bgInputRef={bgInputRef}
          handleBgChange={handleBgChange}
          setBgImages={setBgImages}
          csvFileName={csvFileName}
          csvData={csvData}
          csvInputRef={csvInputRef}
          handleCsvChange={handleCsvChange}
          setCsvFileName={setCsvFileName}
          setCsvData={setCsvData}
          suffixPages={suffixPages}
          suffixInputRef={suffixInputRef}
          handleSuffixChange={handleSuffixChange}
          setSuffixPages={setSuffixPages}
          globalTheme={globalTheme}
          setGlobalTheme={setGlobalTheme}
          setCurrentStep={setCurrentStep}
          setDirectImages={setDirectImages}
          setUploadedFolders={setUploadedFolders}
          handleGeneratePdf={handleGeneratePdf}
          showStoryInput={showStoryInput}
          setShowStoryInput={setShowStoryInput}
          globalExportPalette={true}
          paletteImages={paletteImages}
          setPaletteImages={setPaletteImages}
          paletteInputRef={paletteInputRef}
          handlePaletteChange={handlePaletteChange}
          solutionCollagePages={solutionCollagePages}
          setSolutionCollagePages={setSolutionCollagePages}
          solutionCollageInputRef={solutionCollageInputRef}
          handleSolutionCollageChange={handleSolutionCollageChange}
          solutionNameList={solutionNameList}
          solutionNamesInputRef={solutionNamesInputRef}
          handleSolutionNamesChange={handleSolutionNamesChange}
          disabled={isAnyActionRunning}
        />
      )}

      {/* Step design-config: Book Design Config (appears after import, before convert) */}
      {currentStep === 'design-config' && (
        <BookDesignConfigStep
          projectCount={projects.length + directImages.length}
          firstImageUrl={projects[0]?.thumbnailDataUrl || directImages[0]?.colorUrl || directImages[0]?.uncolorUrl}
        />
      )}

      {/* Step 3: PDF Progress */}
      {currentStep === 3 && (
        <PdfProgressStep
          isGeneratingPdf={isGeneratingPdf}
          pdfProgress={pdfProgress}
          setCurrentStep={setCurrentStep}
          setDirectImages={setDirectImages}
          setUploadedFolders={setUploadedFolders}
        />
      )}

      {previewProjectId && (
        <ProjectPreviewModal
          projectId={previewProjectId}
          projects={projects}
          onClose={() => setPreviewProjectId(null)}
          onNavigate={setPreviewProjectId}
        />
      )}

      <ConfirmModal
        open={showDeleteAllConfirm}
        title={selectedIds.size > 0 ? "Delete selected images" : "Delete all images"}
        message={selectedIds.size > 0
          ? `Delete the ${selectedIds.size} selected image(s)? This cannot be undone.`
          : `Delete all ${projects.length} image(s)? This cannot be undone.`}
        onConfirm={() => {
          setShowDeleteAllConfirm(false)
          if (selectedIds.size > 0) {
            selectedIds.forEach((id) => removeProject(id))
            setSelectedIds(new Set())
          } else {
            removeAllProjects()
            autoCycleIndexRef.current = 0
          }
          setActiveTab?.('image-import')
          if (projectName) {
            window.history.replaceState(null, '', `/studio/projects/${toSlug(projectName)}/image-import`)
          }
        }}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
        </div>
      )}

      {/* Hidden inputs always in DOM to support Toolbar "+ Add More" */}
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" multiple onChange={(e) => handleImageFileChange(e, projects.length)} />
      <input ref={transparentImageInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" multiple onChange={(e) => handleTransparentImageFileChange(e, projects.length, setCurrentStep)} />
      <input
        ref={dirInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory: string; directory: string })}
        className="hidden"
        onChange={handleDirUploadChange}
      />
      <input ref={beforeAfterInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleBeforeAfterImageChange} />

      {/* Blocking Download Progress Modal */}
      <DownloadProgressModal
        isOpen={isGeneratingPdf || isZipping || baIsZipping}
        type={isGeneratingPdf ? "pdf" : isZipping ? "zip" : baIsZipping ? "before-after-zip" : null}
        progress={
          isGeneratingPdf
            ? pdfProgress
            : isZipping
            ? zipProgress
            : baIsZipping
            ? baProgress
            : { current: 0, total: 0 }
        }
      />
    </div>
  )
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, '-').replace(/^-|-$/g, '')
}
