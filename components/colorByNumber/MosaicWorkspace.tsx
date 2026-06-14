'use client'

import type { ColorByNumberGridType, PartialColorMode } from '@/lib/colorByNumber'
import type { ToolAccess } from '@/lib/tools/access'
import { useColorByNumberStore, type Project } from '@/store/useColorByNumberStore'
import { useBookDesignStore } from '@/store/useBookDesignStore'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
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
    projectFolder,
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
  const hasObjectFocusProjectsForRoute = projects.some((project) => project.removeBackground)
  const objectFocusStepParam = activeTab === 'object-focus' ? searchParams.get('step') : null
  const objectFocusStep =
    activeTab === 'object-focus' && (objectFocusStepParam === 'import' || !hasObjectFocusProjectsForRoute)
      ? 'import'
      : 'convert'

  useEffect(() => {
    if (typeof window === 'undefined') return
    const folderName = projectName || projectFolder?.name
    if (!folderName) return
    const slug = toSlug(folderName)
    const basePath = activeTab 
      ? `/studio/projects/${slug}/${activeTab}` 
      : `/studio/projects/${slug}`

    const url = new URL(window.location.href)
    if (activeTab === 'object-focus') {
      url.searchParams.set('step', objectFocusStep)
    } else if (activeTab !== null) {
      url.searchParams.delete('step')
    } else {
      if (currentStep === 'design-config') {
        url.searchParams.set('step', 'design-config')
      } else if (currentStep === 2) {
        url.searchParams.set('step', 'pdf')
      } else if (currentStep === 3) {
        url.searchParams.set('step', 'pdf-progress')
      } else if (currentStep === 1) {
        url.searchParams.set('step', 'convert')
      } else {
        url.searchParams.delete('step')
      }
    }
    const nextUrl = basePath + url.search + url.hash
    if (window.location.pathname + window.location.search + window.location.hash !== nextUrl) {
      router.replace(nextUrl)
    }
  }, [currentStep, activeTab, objectFocusStep, projectName, projectFolder?.name, router])

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
    onImportSuccess: useCallback((mode: 'standard' | 'object-focus') => {
      if (mode === 'object-focus') {
        setActiveTab?.('object-focus')
        setCurrentStep(1)
        const folderName = projectName || projectFolder?.name
        if (folderName) {
          router.replace(`/studio/projects/${toSlug(folderName)}/object-focus?step=convert`)
        }
        return
      }

      setActiveTab?.(null)
      const folderName = projectName || projectFolder?.name
      if (folderName) {
        router.replace(`/studio/projects/${toSlug(folderName)}`)
      }
      // Show Design Config right after first import so user can configure before converting
      setCurrentStep('design-config')
    }, [projectName, projectFolder?.name, setActiveTab, setCurrentStep, router])
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

  const objectFocusProjects = useMemo(
    () =>
      projects
        .filter((project) => project.removeBackground)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })),
    [projects]
  )
  const objectFocusSelectedIds = useMemo(
    () => new Set(objectFocusProjects.filter((project) => selectedIds.has(project.id)).map((project) => project.id)),
    [objectFocusProjects, selectedIds]
  )

  const zipHook = useZipExport({
    access, requestPaidAccess,
    projects, globalTheme, globalShowNumbers,
    solutionNameList, paletteImages,
  })
  const { isZipping, zipProgress, handleDownloadAllImages } = zipHook
  const objectZipHook = useZipExport({
    access,
    requestPaidAccess,
    projects: objectFocusProjects,
    globalTheme,
    globalShowNumbers,
    solutionNameList,
    paletteImages: [],
  })
  const { isZipping: isObjectFocusZipping, zipProgress: objectFocusZipProgress, handleDownloadAllImages: handleDownloadObjectFocusImages } = objectZipHook

  const isAnyActionRunning = isConverting || isPreparingStep2 || isGeneratingPdf || isZipping || isObjectFocusZipping || baIsZipping

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

  const handleConvertObjectFocus = useCallback(async (onlySelected: boolean) => {
    if (isConverting) return
    const selected = new Set(selectedIds)
    const toConvert = objectFocusProjects.filter((project) => {
      const canConvert = project.status === 'idle' || project.status === 'error'
      return canConvert && (!onlySelected || selected.has(project.id))
    })
    if (toConvert.length === 0) return
    if (toConvert.length > access.maxConvertAtOnce) {
      requestPaidAccess(`Your ${access.plan} workspace can convert ${access.maxConvertAtOnce} image(s) at once.`)
      return
    }

    setIsConverting(true)
    try {
      const convertSingleProject = useColorByNumberStore.getState().convertSingleProject
      const cpuCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4
      const limit = Math.min(Math.max(cpuCores, 2), 3)
      const queue = [...toConvert]

      const runProcessor = async () => {
        while (queue.length > 0) {
          const project = queue.shift()
          if (!project) break
          try {
            await convertSingleProject(project.id)
          } catch (err) {
            console.error(err)
          }
        }
      }

      await Promise.all(Array.from({ length: Math.min(limit, toConvert.length) }, runProcessor))
    } finally {
      setIsConverting(false)
    }
  }, [access, isConverting, objectFocusProjects, requestPaidAccess, selectedIds, setIsConverting])

  const visibleGridTypes = useMemo(() => {
    return GRID_TYPES.filter((type) => enabledPatterns[type.value] !== false)
  }, [enabledPatterns])
  const isFolderModeActive = directImages.length > 0
  useEffect(() => {
    if (activeTab === 'before-after' && beforeAfterJob && currentStep !== 1) {
      setCurrentStep(1)
    }
  }, [activeTab, beforeAfterJob, currentStep, setCurrentStep])

  const shouldShowImportScreen =
    // Always show tab content when a tab is explicitly selected (overrides any step)
    (activeTab !== null && activeTab !== 'image-import' && activeTab !== 'object-focus' && !(activeTab === 'before-after' && beforeAfterJob)) ||
    (activeTab === 'image-import' && projects.length === 0) ||
    // Show import screen when no tab selected and not on design-config step
    (activeTab === null && currentStep !== 'design-config' && (
      (projects.length === 0 && !isFolderModeActive && !beforeAfterJob) ||
      (isFolderModeActive && currentStep === 1)
    ))

  const idleCount = projects.filter((p) => p.status === 'idle').length
  const selectedIdleCount = projects.filter((p) => selectedIds.has(p.id) && (p.status === 'idle' || p.status === 'error')).length
  const objectFocusIdleCount = objectFocusProjects.filter((p) => p.status === 'idle' || p.status === 'error').length
  const selectedObjectFocusIdleCount = objectFocusProjects.filter((p) => selectedIds.has(p.id) && (p.status === 'idle' || p.status === 'error')).length

  return (
    <div id="workspace" className="h-full flex overflow-hidden">
      {/* Main content area */}
      {activeTab === 'object-focus' && objectFocusStep === 'import' ? (
        <ObjectFocusImportWorkspace
          objectCount={objectFocusProjects.length}
          importProgress={importProgress}
          isImporting={importIsConverting}
          isAnyActionRunning={isAnyActionRunning}
          onAdd={handleImportTransparentClick}
          onViewObjects={() => {
            if (!projectName && !projectFolder?.name) return
            const folderName = projectName || projectFolder?.name
            if (folderName) router.replace(`/studio/projects/${toSlug(folderName)}/object-focus?step=convert`)
          }}
        />
      ) : shouldShowImportScreen ? (
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
                  router.replace(`/studio/projects/${toSlug(projectName)}/${tab}`)
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
              isProcessingFolder={isProcessingFolder || beforeAfterHook.isProcessingFolder}
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
      ) : activeTab === 'object-focus' ? (
        <ObjectFocusWorkspace
          projects={objectFocusProjects}
          selectedIds={objectFocusSelectedIds}
          idleCount={objectFocusIdleCount}
          selectedIdleCount={selectedObjectFocusIdleCount}
          isConverting={isConverting}
          isZipping={isObjectFocusZipping}
          isAnyActionRunning={isAnyActionRunning}
          zipProgress={objectFocusZipProgress}
          onAdd={handleImportTransparentClick}
          onConvertAll={() => void handleConvertObjectFocus(false)}
          onConvertSelected={() => void handleConvertObjectFocus(true)}
          onDownloadAll={handleDownloadObjectFocusImages}
          onToggleSelect={onToggleSelect}
          onSelectAll={() => setSelectedIds((prev) => {
            const next = new Set(prev)
            const allSelected = objectFocusProjects.length > 0 && objectFocusProjects.every((project) => next.has(project.id))
            if (allSelected) {
              objectFocusProjects.forEach((project) => next.delete(project.id))
            } else {
              objectFocusProjects.forEach((project) => next.add(project.id))
            }
            return next
          })}
          onDeleteSelected={() => {
            if (objectFocusSelectedIds.size === 0) return
            if (!window.confirm(`Delete ${objectFocusSelectedIds.size} selected object image(s)? This cannot be undone.`)) return
            objectFocusSelectedIds.forEach((id) => removeProject(id))
            setSelectedIds((prev) => {
              const next = new Set(prev)
              objectFocusSelectedIds.forEach((id) => next.delete(id))
              return next
            })
          }}
          setPreviewProjectId={setPreviewProjectId}
          updateProject={updateProject}
          removeProject={removeProject}
          onBackToImport={() => {
            const folderName = projectName || projectFolder?.name
            if (folderName) router.replace(`/studio/projects/${toSlug(folderName)}/object-focus?step=import`)
          }}
        />
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
          ) : (currentStep === 1 && activeTab === null) ? (
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
          ) : currentStep === 'design-config' ? (
            <button
              type="button"
              onClick={() => {
                removeAllProjects();
                autoCycleIndexRef.current = 0;
                setActiveTab?.('image-import');
                setCurrentStep(1);
                if (projectName) {
                  router.replace(`/studio/projects/${toSlug(projectName)}/image-import`);
                }
              }}
              disabled={isAnyActionRunning}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-white/5 px-3.5 text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)]/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Back to Import Images"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-sm font-medium pr-0.5 select-none">Back to Import Images</span>
            </button>
          ) : (activeTab !== null && activeTab !== 'image-import') || (activeTab === 'image-import' && projects.length > 0) ? (
            <button
              type="button"
              onClick={() => {
                setActiveTab?.(null);
                if (projectName) {
                  router.replace(`/studio/projects/${toSlug(projectName)}`);
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
                  {/* Next: PDF Book Setup — goes to pdf setup step */}
                  <button
                    onClick={handleNextToSetup}
                    disabled={isAnyActionRunning}
                    className="flex h-10 items-center justify-center px-6 text-sm font-semibold text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl shadow-md shadow-[var(--accent)]/15 active:scale-[0.98] transition-all duration-200 gap-2 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreparingStep2 ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Next: PDF Book Setup</span>
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
              onClick={() => setCurrentStep(1)}
              disabled={isAnyActionRunning}
              className="flex h-10 items-center justify-center gap-2 px-6 rounded-xl text-sm font-semibold text-[var(--bg-primary)]
                bg-[var(--accent)] hover:bg-[var(--accent-hover)]
                shadow-md shadow-[var(--accent)]/15 active:scale-[0.98] transition-all duration-200 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next: Convert Images</span>
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
            router.replace(`/studio/projects/${toSlug(projectName)}/image-import`)
          }
        }}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
        </div>
      )}

      {activeTab === 'object-focus' && previewProjectId && (
        <ProjectPreviewModal
          projectId={previewProjectId}
          projects={projects}
          onClose={() => setPreviewProjectId(null)}
          onNavigate={setPreviewProjectId}
        />
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
        isOpen={isGeneratingPdf || isZipping || isObjectFocusZipping || baIsZipping}
        type={isGeneratingPdf ? "pdf" : (isZipping || isObjectFocusZipping) ? "zip" : baIsZipping ? "before-after-zip" : null}
        progress={
          isGeneratingPdf
            ? pdfProgress
            : isZipping
            ? zipProgress
            : isObjectFocusZipping
            ? objectFocusZipProgress
            : baIsZipping
            ? baProgress
            : { current: 0, total: 0 }
        }
      />
    </div>
  )
}

function ObjectFocusImportWorkspace({
  objectCount,
  importProgress,
  isImporting,
  isAnyActionRunning,
  onAdd,
  onViewObjects,
}: {
  objectCount: number
  importProgress: { current: number; total: number } | null
  isImporting: boolean
  isAnyActionRunning: boolean
  onAdd: () => void
  onViewObjects: () => void
}) {
  const progressPercent = importProgress && importProgress.total > 0
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0

  return (
    <div className="min-w-0 flex-1 overflow-hidden bg-[var(--bg-primary)] p-6 lg:p-8">
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-[var(--border-default)] pb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
            Object Focus Import
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Import isolated-object source images
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            This mode uses mark patterns and removes white backgrounds during conversion.
          </p>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="w-full max-w-xl">
            {isImporting ? (
              <div className="rounded-xl border border-purple-500/20 bg-[var(--bg-secondary)] p-8 text-center">
                <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-purple-400/20 border-t-purple-300 animate-spin" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Importing objects</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {importProgress ? `Reading file ${importProgress.current} of ${importProgress.total}` : 'Preparing files'}
                </p>
                {importProgress && (
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-purple-300 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                disabled={isAnyActionRunning}
                className="group w-full rounded-xl border-2 border-dashed border-purple-500/25 bg-[var(--bg-secondary)] p-12 text-center transition hover:border-purple-400/60 hover:bg-purple-500/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--bg-primary)] text-purple-400 ring-1 ring-purple-500/20 transition group-hover:ring-purple-400/40">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[var(--text-primary)]">Select object images</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">PNG or JPG files with white backgrounds work best.</p>
              </button>
            )}

            {objectCount > 0 && !isImporting && (
              <button
                type="button"
                onClick={onViewObjects}
                disabled={isAnyActionRunning}
                className="mt-4 h-11 w-full rounded-lg bg-purple-400 text-sm font-semibold text-black transition hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                View imported objects ({objectCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ObjectFocusWorkspace({
  projects,
  selectedIds,
  idleCount,
  selectedIdleCount,
  isConverting,
  isZipping,
  isAnyActionRunning,
  zipProgress,
  onAdd,
  onConvertAll,
  onConvertSelected,
  onDownloadAll,
  onToggleSelect,
  onSelectAll,
  onDeleteSelected,
  setPreviewProjectId,
  updateProject,
  removeProject,
  onBackToImport,
}: {
  projects: Project[]
  selectedIds: Set<string>
  idleCount: number
  selectedIdleCount: number
  isConverting: boolean
  isZipping: boolean
  isAnyActionRunning: boolean
  zipProgress: { current: number; total: number }
  onAdd: () => void
  onConvertAll: () => void
  onConvertSelected: () => void
  onDownloadAll: () => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeleteSelected: () => void
  setPreviewProjectId: (id: string | null) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  onBackToImport: () => void
}) {
  const selectedCount = selectedIds.size
  const completedCount = projects.filter((project) => project.status === 'completed').length
  const allSelected = projects.length > 0 && projects.every((project) => selectedIds.has(project.id))

  return (
    <div className="min-w-0 flex-1 overflow-hidden bg-[var(--bg-primary)] p-6 lg:p-8">
      <div className="flex h-full min-h-0 flex-col gap-5">
        <div className="shrink-0 border-b border-[var(--border-default)] pb-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                Object Focus
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Isolated objects
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
                White backgrounds are removed during conversion and exports use transparent artwork without palette columns.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onBackToImport}
                disabled={isAnyActionRunning}
                className="h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back to import
              </button>
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  disabled={isAnyActionRunning}
                  className="h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  disabled={isAnyActionRunning}
                  className="h-10 rounded-lg border border-red-500/25 px-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected ({selectedCount})
                </button>
              )}
              <button
                type="button"
                onClick={onAdd}
                disabled={isAnyActionRunning}
                className="h-10 rounded-lg border border-purple-500/25 bg-purple-500/10 px-4 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add objects
              </button>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  onClick={onConvertSelected}
                  disabled={isAnyActionRunning || selectedIdleCount === 0}
                  className="h-10 rounded-lg bg-purple-400 px-4 text-sm font-semibold text-black transition hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConverting ? 'Converting...' : `Convert selected (${selectedIdleCount})`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConvertAll}
                  disabled={isAnyActionRunning || idleCount === 0}
                  className="h-10 rounded-lg bg-purple-400 px-4 text-sm font-semibold text-black transition hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConverting ? 'Converting...' : `Convert objects (${idleCount})`}
                </button>
              )}
              <button
                type="button"
                onClick={onDownloadAll}
                disabled={isAnyActionRunning || completedCount === 0}
                className="h-10 rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-4 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isZipping ? `Preparing ${zipProgress.current}/${zipProgress.total}` : 'Download PNGs'}
              </button>
            </div>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <button
              type="button"
              onClick={onAdd}
              disabled={isAnyActionRunning}
              className="group w-full max-w-xl rounded-xl border-2 border-dashed border-purple-500/25 bg-[var(--bg-secondary)] p-12 text-center transition hover:border-purple-400/60 hover:bg-purple-500/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--bg-primary)] text-purple-400 ring-1 ring-purple-500/20 transition group-hover:ring-purple-400/40">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="12" cy="12" r="3.5" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Select object images</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">PNG or JPG files with white backgrounds work best.</p>
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 pb-8">
              {projects.map((project) => {
                const isSelected = selectedIds.has(project.id)
                const isProcessing = project.status === 'processing'
                const isReady = project.status === 'completed'
                const isError = project.status === 'error'

                return (
                  <article
                    key={project.id}
                    className={`overflow-hidden rounded-xl border bg-[var(--bg-secondary)] transition ${
                      isSelected ? 'border-purple-400/70 shadow-lg shadow-purple-950/20' : 'border-[var(--border-default)] hover:border-purple-400/35'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(project.id)}
                      disabled={isAnyActionRunning}
                      className="group block w-full text-left disabled:cursor-not-allowed"
                    >
                      <div className="relative aspect-square bg-[var(--bg-primary)]">
                        <img
                          src={project.thumbnailDataUrl}
                          alt={project.name}
                          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute left-3 top-3">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                            isSelected
                              ? 'border-purple-300 bg-purple-300 text-black'
                              : 'border-white/30 bg-black/45 text-transparent'
                          }`}>
                            {isSelected && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                        </div>
                        <div className="absolute right-3 top-3">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                            isReady
                              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                              : isProcessing
                                ? 'border-purple-400/25 bg-purple-400/10 text-purple-300'
                                : isError
                                  ? 'border-red-400/25 bg-red-400/10 text-red-300'
                                  : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                          }`}>
                            {isReady ? 'Ready' : isProcessing ? 'Converting' : isError ? 'Error' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="space-y-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]" title={project.name}>
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          {isReady ? `${project.data?.cells.length ?? 0} cells` : 'Transparent export preset'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={project.gridType}
                          disabled={isAnyActionRunning || isProcessing}
                          onChange={(event) =>
                            updateProject(project.id, {
                              gridType: event.target.value as ColorByNumberGridType,
                              status: 'idle',
                            })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-2 text-xs text-[var(--text-primary)] outline-none"
                        >
                          <option value="square-mark">Square mark</option>
                          <option value="hexagon-mark">Hexagon mark</option>
                        </select>
                        {isReady && (
                          <button
                            type="button"
                            onClick={() => setPreviewProjectId(project.id)}
                            disabled={isAnyActionRunning}
                            className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Preview
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void useColorByNumberStore.getState().convertSingleProject(project.id)}
                          disabled={isAnyActionRunning || isProcessing || isReady}
                          className="h-9 flex-1 rounded-lg bg-purple-400 text-xs font-bold text-black transition hover:bg-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isProcessing ? 'Converting...' : isReady ? 'Converted' : 'Convert'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAnyActionRunning) return
                            if (window.confirm(`Delete "${project.name}"?`)) removeProject(project.id)
                          }}
                          disabled={isAnyActionRunning}
                          className="h-9 rounded-lg border border-red-500/25 px-3 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, '-').replace(/^-|-$/g, '')
}
