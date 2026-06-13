'use client'

import { exportPaletteToCanvas } from '@/lib/colorByNumber/export'
import {
  generateSolutionCollagePageDataUrls,
  getReadyProjects,
  parseSolutionNamesCsv,
} from '@/lib/colorByNumber/canvasHelpers'
import { getThemeById } from '@/lib/colorByNumber/themes'
import { generateBookPdf, parseCSV, type PDFCsvRow } from '@/lib/colorByNumber/pdfExport'
import type { ToolAccess } from '@/lib/tools/access'
import type { Project } from '@/store/useColorByNumberStore'
import { useCallback, useRef, useState } from 'react'
import { toast } from '@/store/useToastStore'
import { useBookDesignStore } from '@/store/useBookDesignStore'

type DirectImage = { name: string; colorUrl: string; uncolorUrl: string; paletteUrl?: string }

interface UsePdfExportOptions {
  access: ToolAccess
  requestPaidAccess: (msg: string) => void
  projects: Project[]
  globalTheme: string
  globalShowNumbers: boolean
  directImages: DirectImage[]
  paletteImages: string[]
  setPaletteImages: (imgs: string[]) => void
  solutionCollagePages: string[]
  setSolutionCollagePages: (pages: string[]) => void
  uploadedFolders: { color: boolean; uncolor: boolean; palette: boolean; solutionsCollage: boolean }
  setUploadedFolders: React.Dispatch<React.SetStateAction<{ color: boolean; uncolor: boolean; palette: boolean; solutionsCollage: boolean }>>
  setCurrentStep: (step: 1 | 'design-config' | 2 | 3) => void
  setDirectImages: React.Dispatch<React.SetStateAction<DirectImage[]>>
  setUploadedFoldersReset: () => void
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

export function usePdfExport({
  access,
  requestPaidAccess,
  projects,
  globalTheme,
  globalShowNumbers,
  directImages,
  paletteImages,
  setPaletteImages,
  solutionCollagePages,
  setSolutionCollagePages,
  uploadedFolders,
  setUploadedFolders,
  setCurrentStep,
  setDirectImages,
  setUploadedFoldersReset,
}: UsePdfExportOptions) {
  const [bgImages, setBgImages] = useState<string[]>([])
  const [csvData, setCsvData] = useState<PDFCsvRow[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [prefixPages, setPrefixPages] = useState<string[]>([])
  const [suffixPages, setSuffixPages] = useState<string[]>([])
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 })
  const [showStoryInput, setShowStoryInput] = useState(true)
  const [solutionNameList, setSolutionNameList] = useState<string[]>([])
  const [isPreparingStep2, setIsPreparingStep2] = useState(false)

  const bgInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const prefixInputRef = useRef<HTMLInputElement>(null)
  const suffixInputRef = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const solutionCollageInputRef = useRef<HTMLInputElement>(null)
  const solutionNamesInputRef = useRef<HTMLInputElement>(null)
  const solutionNamesStep1InputRef = useRef<HTMLInputElement>(null)

  const handleBgChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const dataUrls = await Promise.all(files.map(readFileAsDataURL))
    setBgImages((prev) => [...prev, ...dataUrls])
  }, [])

  const handlePrefixChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPrefixPages(await Promise.all(files.map(readFileAsDataURL)))
  }, [])

  const handleSuffixChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSuffixPages(await Promise.all(files.map(readFileAsDataURL)))
  }, [])

  const handlePaletteChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    if (files.length === 0) return
    setPaletteImages(await Promise.all(files.map(readFileAsDataURL)))
    if (directImages.length > 0) setUploadedFolders((prev) => ({ ...prev, palette: true }))
  }, [directImages.length, setPaletteImages, setUploadedFolders])

  const handleSolutionCollageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    )
    if (files.length === 0) return
    setSolutionCollagePages(await Promise.all(files.map(readFileAsDataURL)))
    if (directImages.length > 0) setUploadedFolders((prev) => ({ ...prev, solutionsCollage: true }))
  }, [directImages.length, setSolutionCollagePages, setUploadedFolders])

  const handleSolutionNamesChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const labels = parseSolutionNamesCsv(await file.text())
    if (labels.length === 0) {
      toast.error('Invalid CSV', { description: 'File must have a "text" header and at least one row.' })
      e.target.value = ''
      return
    }
    setSolutionNameList(labels)
    toast.success('Solution names imported')
    if (directImages.length === 0) {
      const generatedPages = await generateSolutionCollagePageDataUrls(
        getReadyProjects(projects), globalTheme, globalShowNumbers, labels
      )
      setSolutionCollagePages(generatedPages)
    }
    e.target.value = ''
  }, [directImages.length, globalShowNumbers, globalTheme, projects, setSolutionCollagePages])

  const handleCsvChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setCsvData(parseCSV(await file.text()))
  }, [])

  const handleGeneratePdf = useCallback(async () => {
    const readyProjects = getReadyProjects(projects)
    if (readyProjects.length === 0 && directImages.length === 0) {
      toast.error('No ready images found', {
        description: 'Please convert at least one image in grid view before exporting to PDF.',
      })
      return
    }
    const pdfItems = directImages.length > 0 ? directImages.length : readyProjects.length
    if (pdfItems > access.maxPdfItems) {
      requestPaidAccess(`Your ${access.plan} workspace can export PDF with up to ${access.maxPdfItems} image(s).`)
      return
    }

    // setCurrentStep(3)
    setIsGeneratingPdf(true)
    setPdfProgress({ current: 0, total: 100 })
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      const blob = await generateBookPdf(
        {
          projects: readyProjects.map((p) => ({
            data: p.data!, filled: p.filled,
            partialColorMode: p.partialColorMode, removeBackground: p.removeBackground,
          })),
          directImages: directImages.map((img) => ({
            colorUrl: img.colorUrl, uncolorUrl: img.uncolorUrl, paletteUrl: img.paletteUrl,
          })),
          backgroundImages: bgImages, csvData, prefixPages, suffixPages,
          solutionPages: solutionCollagePages,
          globalOptions: {
            showCodes: globalShowNumbers,
            showPalette: useBookDesignStore.getState().coloringDisplayMode === 'side-by-side',
            theme: globalTheme,
            showStoryInput,
            globalExportPalette:
              directImages.length > 0
                ? directImages.some((img) => !!img.paletteUrl) || paletteImages.some(Boolean)
                : true,
            paletteImages,
          },
        },
        (current: number, total: number) => setPdfProgress({ current, total })
      )

      const url = globalThis.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'; a.href = url; a.download = 'ColorByNumber_Book.pdf'
      document.body.appendChild(a); a.click()
      globalThis.URL.revokeObjectURL(url); a.remove()
      toast.success('PDF downloaded')
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      toast.error('PDF generation failed', { description: 'An error occurred while building the PDF.' })
      // setCurrentStep(2)
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [access, bgImages, csvData, directImages, globalShowNumbers, globalTheme, paletteImages, prefixPages, requestPaidAccess, setCurrentStep, showStoryInput, solutionCollagePages, suffixPages, projects])

  const handleNextToSetup = useCallback(async () => {
    const readyProjects = getReadyProjects(projects)
    const pdfItems = directImages.length > 0 ? directImages.length : readyProjects.length
    if (pdfItems === 0) {
      toast.error('No ready images found', {
        description: 'Please convert at least one image before setting up the PDF.',
      })
      return
    }
    if (pdfItems > access.maxPdfItems) {
      requestPaidAccess(`Your ${access.plan} workspace can export PDF with up to ${access.maxPdfItems} image(s).`)
      return
    }

    setIsPreparingStep2(true)
    const theme = getThemeById(globalTheme)

    if (readyProjects.length > 0 && directImages.length === 0) {
      const { badgeBgImageUrl } = useBookDesignStore.getState()
      let loadedBadgeBgImg: HTMLImageElement | null = null
      if (badgeBgImageUrl) {
        try {
          loadedBadgeBgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = badgeBgImageUrl
            img.onload = () => resolve(img)
            img.onerror = (e) => reject(e)
          })
        } catch (err) {
          console.error('Failed to load badge background pattern:', err)
        }
      }

      const generatedPalettes: string[] = []
      for (let idx = 0; idx < readyProjects.length; idx++) {
        const project = readyProjects[idx]
        if (!project.data) continue
        const canvas = exportPaletteToCanvas(project.data, {
          bgColor: theme.backgroundColor, themeColor: theme.backgroundColor,
          pageNumber: idx + 1, transparentBg: true, removeBgColorCells: true,
          badgeBgImage: loadedBadgeBgImg,
        })
        generatedPalettes.push(canvas.toDataURL('image/png'))
        canvas.width = 0; canvas.height = 0
        await new Promise((r) => setTimeout(r, 0))
      }
      setPaletteImages(generatedPalettes)
    }

    if (readyProjects.length > 0 && directImages.length === 0) {
      setSolutionCollagePages(
        await generateSolutionCollagePageDataUrls(readyProjects, globalTheme, globalShowNumbers, solutionNameList)
      )
    }

    await new Promise((resolve) => setTimeout(resolve, 600))
    setCurrentStep(2)
    setIsPreparingStep2(false)
  }, [access, directImages, globalShowNumbers, globalTheme, projects, requestPaidAccess, setCurrentStep, setPaletteImages, setSolutionCollagePages, solutionNameList])

  return {
    bgImages, setBgImages,
    csvData, setCsvData,
    csvFileName, setCsvFileName,
    prefixPages, setPrefixPages,
    suffixPages, setSuffixPages,
    isGeneratingPdf,
    pdfProgress,
    showStoryInput, setShowStoryInput,
    solutionNameList, setSolutionNameList,
    isPreparingStep2,
    bgInputRef, csvInputRef, prefixInputRef, suffixInputRef,
    paletteInputRef, solutionCollageInputRef,
    solutionNamesInputRef, solutionNamesStep1InputRef,
    handleBgChange, handlePrefixChange, handleSuffixChange,
    handlePaletteChange, handleSolutionCollageChange,
    handleSolutionNamesChange, handleCsvChange,
    handleGeneratePdf, handleNextToSetup,
  }
}
