'use client'

import type { ColorByNumberGridType, PartialColorMode } from '@/lib/colorByNumber'
import type { ToolAccess } from '@/lib/tools/access'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  requestedTab,
  onTabHandled,
}: {
  access: ToolAccess
  onBack?: () => void
  projectName?: string
  requestedTab?: TabType
  onTabHandled?: () => void
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
  } = useColorByNumberStore()

  const enabledPatterns = useToolPatterns()
  const autoCycleIndexRef = useRef(0)

  const { gateNotice, setGateNotice, requestPaidAccess } = useAccessGate(access)

  const [showSettings, setShowSettings] = useState(false)
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const splitColorRef = useRef<HTMLDivElement>(null)

  const handleGridTypeChange = useCallback(
    (gridType: ColorByNumberGridType | 'auto') => {
      if (gridType === 'auto') {
        const cycle = ALL_PATTERNS.filter((p) => enabledPatterns[p] !== false)
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
    access, requestPaidAccess, enabledPatterns, globalGridType, autoCycleIndexRef,
  })

  const {
    isConverting: importIsConverting, setIsConverting,
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

  useEffect(() => {
    if (!requestedTab) return
    setKeepImportScreen(true)
    onTabHandled?.()
  }, [requestedTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const isConverting = importIsConverting || conversionJob.status === 'running'

  const beforeAfterHook = useBeforeAfter({
    access, requestPaidAccess, globalCellSize, globalTheme, directImages,
  })

  const {
    beforeAfterTheme, setBeforeAfterTheme,
    beforeAfterGridType, setBeforeAfterGridType,
    beforeAfterJob,
    isZipping: baIsZipping,
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
  const { isZipping, handleDownloadAllImages } = zipHook

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

  const visibleGridTypes = GRID_TYPES.filter((type) => enabledPatterns[type.value] !== false)
  const isFolderModeActive = directImages.length > 0
  const shouldShowImportScreen =
    keepImportScreen ||
    (projects.length === 0 && !isFolderModeActive && !beforeAfterJob) ||
    (isFolderModeActive && currentStep === 1)

  const idleCount = projects.filter((p) => p.status === 'idle').length

  return (
    <div id="workspace" className="h-full flex overflow-hidden">
      {/* Main content area */}
      {shouldShowImportScreen ? (
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[var(--bg-primary)] p-4 sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative z-10 flex h-full w-full items-center justify-center">
            <EmptyState
              contentOnly
              activeTab={requestedTab}
              onTabSelect={onTabHandled}
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button type="button" onClick={onBack} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-(--border-primary) text-(--text-secondary) transition hover:bg-white/5 hover:text-(--text-primary)" title="Back to projects">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            {projectName && <p className="text-xs font-medium text-(--accent) mb-0.5 truncate">{projectName}</p>}
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <GlobalSettings showSettings={showSettings} setShowSettings={setShowSettings} disabled={isConverting} onGridTypeChange={handleGridTypeChange} />

          <button onClick={() => handleImportClick(projects.length)} disabled={isConverting} className="px-4 py-2 text-sm font-medium text-(--text-primary) border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            + Add More
          </button>

          {projects.length > 0 && !isConverting && (
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="p-2 rounded-lg border border-[var(--border-default)] text-(--text-muted) hover:text-red-400 hover:border-red-400/40 transition-colors"
              title="Delete all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}

          {(idleCount > 0 || isConverting) && (
            <button onClick={handleConvertAll} disabled={isConverting} className="px-6 py-2 text-sm font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[150px]">
              {isConverting ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Converting...</>
              ) : `Convert All (${idleCount})`}
            </button>
          )}

          {currentStep === 1 && (projects.length > 0 || directImages.length > 0) && idleCount === 0 && !isConverting && (
            <div className="flex gap-3">
              {projects.length > 0 && (globalGridType === 'square-mark' || globalGridType === 'hexagon-mark') && (
                <button onClick={() => solutionNamesStep1InputRef.current?.click()} disabled={isZipping || isConverting} className="px-6 py-2 text-sm font-medium text-(--accent) border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Import CSV Name (optional){solutionNameList.length > 0 ? ` (${solutionNameList.length})` : ''}
                </button>
              )}
              {projects.length > 0 && (
                <button onClick={handleDownloadAllImages} disabled={isZipping || isConverting} className="px-6 py-2 text-sm font-medium text-(--accent) border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isZipping ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
                  Download All (.zip)
                </button>
              )}
              {directImages.some((img) => img.colorUrl && img.uncolorUrl) && (
                <button onClick={handleDownloadBeforeAfter} disabled={baIsZipping || isConverting} className="px-6 py-2 text-sm font-medium text-yellow-300 border border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/15 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {baIsZipping ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>}
                  Before/After
                </button>
              )}
              <button onClick={handleNextToSetup} disabled={isConverting || isPreparingStep2} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed">
                {isPreparingStep2 ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><span>Next: Setup PDF</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg></>}
              </button>
            </div>
          )}

          <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" multiple disabled={isConverting} onChange={(e) => handleImageFileChange(e, projects.length)} />
          <input ref={solutionNamesStep1InputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleSolutionNamesChange} />
        </div>
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
              isConverting={isConverting}
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
        title="Delete all images"
        message={`Delete all ${projects.length} image(s)? This cannot be undone.`}
        onConfirm={() => { setShowDeleteAllConfirm(false); removeAllProjects(); autoCycleIndexRef.current = 0 }}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
        </div>
      )}
    </div>
  )
}
