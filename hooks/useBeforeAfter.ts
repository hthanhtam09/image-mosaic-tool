'use client'

import type { ColorByNumberGridType, DirectImage } from '@/lib/colorByNumber'
import type { BeforeAfterTheme } from '@/lib/colorByNumber/beforeAfter'
import { exportBeforeAfterToCanvas } from '@/lib/colorByNumber/beforeAfter'
import { exportToCanvas } from '@/lib/colorByNumber/export'
import { imageToColorByNumber } from '@/lib/colorByNumber/imageToColorByNumber'
import { getThemeById } from '@/lib/colorByNumber/themes'
import { canvasToDpiPngBase64, canvasToDpiPngBlob } from '@/lib/colorByNumber/pngDpi'
import type { ToolAccess } from '@/lib/tools/access'
import { useCallback, useRef, useState } from 'react'
import { toast } from '@/store/useToastStore'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'

type BeforeAfterMarkGridType = Extract<ColorByNumberGridType, 'square-mark' | 'hexagon-mark'>

type BeforeAfterJob = {
  name: string
  sourceFile: File
  beforeUrl: string
  afterUrl: string
  previewUrl: string
}

interface UseBeforeAfterOptions {
  access: ToolAccess
  requestPaidAccess: (msg: string) => void
  globalCellSize: number
  globalTheme: string
  directImages: DirectImage[]
}

export function useBeforeAfter({
  access,
  requestPaidAccess,
  globalCellSize,
  globalTheme,
  directImages,
}: UseBeforeAfterOptions) {
  const [beforeAfterTheme, setBeforeAfterTheme] = useState<BeforeAfterTheme>({
    backgroundColor: '#000000',
    borderColor: '#f6c64a',
    arrowColor: '#ffc24a',
    textColor: '#111111',
    labelBackgroundColor: '#ffc24a',
    transparentBackground: true,
  })
  const [beforeAfterGridType, setBeforeAfterGridType] = useState<BeforeAfterMarkGridType>('square-mark')
  const [beforeAfterJob, setBeforeAfterJob] = useState<BeforeAfterJob | null>(null)
  const [isProcessingFolder, setIsProcessingFolder] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [baProgress, setBaProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const beforeAfterInputRef = useRef<HTMLInputElement>(null)

  const generateBeforeAfterJob = useCallback(
    async (file: File, gridType: BeforeAfterMarkGridType, theme: BeforeAfterTheme) => {
      const data = await imageToColorByNumber(file, {
        gridType,
        cellSize: globalCellSize,
        useDithering: true,
        removeWhiteBackground: true,
        removeBottomWatermark: false,
      })
      const colorTheme = getThemeById(globalTheme)
      const uncolorCanvas = exportToCanvas(data, {}, {
        showCodes: true, colored: false, showPalette: false,
        bgColor: colorTheme.backgroundColor, showMagnifier: false,
        transparentBg: true, removeBgColorCells: true,
      })
      const colorCanvas = exportToCanvas(data, {}, {
        showCodes: true, colored: true, showPalette: false,
        bgColor: colorTheme.backgroundColor, showMagnifier: false,
        transparentBg: true, removeBgColorCells: true,
      })
      const beforeUrl = uncolorCanvas.toDataURL('image/png')
      const afterUrl = colorCanvas.toDataURL('image/png')
      const baCanvas = await exportBeforeAfterToCanvas(beforeUrl, afterUrl, theme)
      setBeforeAfterJob({ name: file.name, sourceFile: file, beforeUrl, afterUrl, previewUrl: baCanvas.toDataURL('image/png') })
      uncolorCanvas.width = 0; uncolorCanvas.height = 0
      colorCanvas.width = 0; colorCanvas.height = 0
      baCanvas.width = 0; baCanvas.height = 0
    },
    [globalCellSize, globalTheme]
  )

  const handleBeforeAfterImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!access.canUseBeforeAfter) {
        requestPaidAccess('Before/After exports are available on Pro.')
        e.target.value = ''
        return
      }
      const file = e.target.files?.[0]
      if (!file) return
      setIsProcessingFolder(true)
      try {
        await generateBeforeAfterJob(file, beforeAfterGridType, beforeAfterTheme)
        toast.success('Before/After image generated')
      } catch (error) {
        console.error('Failed to generate before/after image:', error)
        toast.error('Before/After failed', { description: 'Could not process image.' })
      } finally {
        setIsProcessingFolder(false)
        e.target.value = ''
      }
    },
    [access.canUseBeforeAfter, beforeAfterGridType, beforeAfterTheme, generateBeforeAfterJob, requestPaidAccess]
  )

  const updateBeforeAfterGridType = useCallback(
    async (gridType: BeforeAfterMarkGridType) => {
      setBeforeAfterGridType(gridType)
      if (!beforeAfterJob) return
      setIsProcessingFolder(true)
      try {
        await generateBeforeAfterJob(beforeAfterJob.sourceFile, gridType, beforeAfterTheme)
      } catch (error) {
        console.error('Failed to regenerate before/after image:', error)
      } finally {
        setIsProcessingFolder(false)
      }
    },
    [beforeAfterJob, beforeAfterTheme, generateBeforeAfterJob]
  )

  const updateBeforeAfterTheme = useCallback(
    async (updates: Partial<BeforeAfterTheme>) => {
      const nextTheme = { ...beforeAfterTheme, ...updates }
      setBeforeAfterTheme(nextTheme)
      if (!beforeAfterJob) return
      const canvas = await exportBeforeAfterToCanvas(beforeAfterJob.beforeUrl, beforeAfterJob.afterUrl, nextTheme)
      setBeforeAfterJob({ ...beforeAfterJob, previewUrl: canvas.toDataURL('image/png') })
      canvas.width = 0; canvas.height = 0
    },
    [beforeAfterJob, beforeAfterTheme]
  )

  const handleDownloadSingleBeforeAfter = useCallback(async () => {
    if (!beforeAfterJob) return
    const canvas = await exportBeforeAfterToCanvas(beforeAfterJob.beforeUrl, beforeAfterJob.afterUrl, beforeAfterTheme)
    const baseName = beforeAfterJob.name.replace(/\.[^/.]+$/, '')
    saveAs(canvasToDpiPngBlob(canvas), `before-after-${baseName}.png`)
    canvas.width = 0; canvas.height = 0
    toast.success('Image downloaded')
  }, [beforeAfterJob, beforeAfterTheme])

  const handleDownloadBeforeAfter = useCallback(async () => {
    if (!access.canUseBeforeAfter) {
      requestPaidAccess('Before/After batch export is available on Pro.')
      return
    }
    const pairs = directImages.filter((img) => img.uncolorUrl && img.colorUrl)
    if (pairs.length === 0) return
    setIsZipping(true)
    setBaProgress({ current: 0, total: pairs.length })
    try {
      const zip = new JSZip()
      const folder = zip.folder('before_after')
      for (let i = 0; i < pairs.length; i++) {
        const img = pairs[i]
        setBaProgress({ current: i + 1, total: pairs.length })
        const canvas = await exportBeforeAfterToCanvas(img.uncolorUrl, img.colorUrl, beforeAfterTheme)
        const baseName = img.name.replace(/\.[^/.]+$/, '')
        folder?.file(`${baseName}.png`, canvasToDpiPngBase64(canvas), { base64: true })
        canvas.width = 0; canvas.height = 0
        await new Promise((r) => setTimeout(r, 0))
      }
      saveAs(await zip.generateAsync({ type: 'blob' }), 'before_after_images.zip')
      toast.success('Before/After ZIP downloaded')
    } catch (error) {
      console.error('Failed to export before/after images:', error)
      toast.error('Export failed', { description: 'Could not package before/after images.' })
    } finally {
      setIsZipping(false)
    }
  }, [access.canUseBeforeAfter, beforeAfterTheme, directImages, requestPaidAccess])

  return {
    beforeAfterTheme,
    setBeforeAfterTheme,
    beforeAfterGridType,
    setBeforeAfterGridType,
    beforeAfterJob,
    isProcessingFolder,
    isZipping,
    baProgress,
    beforeAfterInputRef,
    handleBeforeAfterImageChange,
    updateBeforeAfterGridType,
    updateBeforeAfterTheme,
    handleDownloadSingleBeforeAfter,
    handleDownloadBeforeAfter,
  }
}
