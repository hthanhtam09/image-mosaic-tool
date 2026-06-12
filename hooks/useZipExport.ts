'use client'

import { exportCollagePagesToCanvas, exportDotCodeMagnifierToCanvas, exportPaletteToCanvas, exportToCanvas } from '@/lib/colorByNumber/export'
import { shouldShowCodes, shouldUseTightCrop } from '@/lib/colorByNumber/objectFocus'
import { canvasToDpiPngBase64 } from '@/lib/colorByNumber/pngDpi'
import { getThemeById } from '@/lib/colorByNumber/themes'
import type { ToolAccess } from '@/lib/tools/access'
import {
  createProjectColorCanvas,
  createSolutionThumbCanvas,
  getReadyProjects,
} from '@/lib/colorByNumber/canvasHelpers'
import type { Project } from '@/store/useColorByNumberStore'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { useCallback, useState } from 'react'
import { toast } from '@/store/useToastStore'

interface UseZipExportOptions {
  access: ToolAccess
  requestPaidAccess: (msg: string) => void
  projects: Project[]
  globalTheme: string
  globalShowNumbers: boolean
  solutionNameList: string[]
  paletteImages: string[]
}

export function useZipExport({
  access,
  requestPaidAccess,
  projects,
  globalTheme,
  globalShowNumbers,
  solutionNameList,
  paletteImages,
}: UseZipExportOptions) {
  const [isZipping, setIsZipping] = useState(false)

  const handleDownloadAllImages = useCallback(async () => {
    if (!access.canExportZip) {
      requestPaidAccess('ZIP export is available on Pro.')
      return
    }
    const readyProjects = getReadyProjects(projects)
    if (readyProjects.length === 0) return

    setIsZipping(true)
    const zip = new JSZip()
    const rootFolder = zip.folder('converted_images')
    const colorFolder = rootFolder?.folder('color')
    const uncolorFolder = rootFolder?.folder('uncolor')
    let circleFolder: JSZip | null = null
    const collageFolder = rootFolder?.folder('solutions_collage')
    const paletteFolder = rootFolder?.folder('palette')

    const coloredCanvases: HTMLCanvasElement[] = []
    const collageLabels: Array<string | undefined> = []

    try {
      for (let i = 0; i < readyProjects.length; i++) {
        const project = readyProjects[i]
        const baseName = project.name.replace(/\.[^/.]+$/, '')
        const theme = getThemeById(globalTheme)
        const useObjectTightCrop = shouldUseTightCrop(project.data, project.removeBackground)

        const canvasColor = createProjectColorCanvas(project, globalTheme, globalShowNumbers)
        if (!canvasColor) continue
        coloredCanvases.push(createSolutionThumbCanvas(canvasColor))
        collageLabels.push(solutionNameList[i])
        colorFolder?.file(`${baseName}.png`, canvasToDpiPngBase64(canvasColor), { base64: true })

        if (project.removeBackground && (project.data?.gridType === 'square-mark' || project.data?.gridType === 'hexagon-mark')) {
          const canvasCircle = exportDotCodeMagnifierToCanvas(project.data, { transparentBg: true })
          circleFolder ??= rootFolder?.folder('circle') ?? null
          circleFolder?.file(`${baseName}.png`, canvasToDpiPngBase64(canvasCircle), { base64: true })
          canvasCircle.width = 0; canvasCircle.height = 0
        }
        canvasColor.width = 0; canvasColor.height = 0

        const canvasUncolor = exportToCanvas(project.data!, project.filled, {
          showCodes: shouldShowCodes(project.data, project.removeBackground, !project.removeBackground),
          colored: false, showPalette: false,
          partialColorMode: project.partialColorMode,
          bgColor: theme.backgroundColor, transparentBg: project.removeBackground,
          tightCrop: useObjectTightCrop, removeBgColorCells: true,
        })
        uncolorFolder?.file(`${baseName}.png`, canvasToDpiPngBase64(canvasUncolor), { base64: true })
        canvasUncolor.width = 0; canvasUncolor.height = 0

        if (paletteFolder && project.data) {
          const canvasPalette = exportPaletteToCanvas(project.data, {
            bgColor: theme.backgroundColor, themeColor: theme.backgroundColor,
            pageNumber: i + 1, transparentBg: true, removeBgColorCells: true,
          })
          paletteFolder.file(`${baseName}.png`, canvasToDpiPngBase64(canvasPalette), { base64: true })
          canvasPalette.width = 0; canvasPalette.height = 0
        }

        await new Promise((r) => setTimeout(r, 0))
      }

      if (collageFolder && coloredCanvases.length > 0) {
        const theme = getThemeById(globalTheme)
        const collagePages = exportCollagePagesToCanvas(coloredCanvases, { bgColor: theme.backgroundColor, labels: collageLabels })
        collagePages.forEach((pageCanvas, idx) => {
          collageFolder.file(`collage_page_${idx + 1}.png`, canvasToDpiPngBase64(pageCanvas), { base64: true })
        })
      }

      saveAs(await zip.generateAsync({ type: 'blob' }), 'converted_images.zip')
      toast.success('ZIP downloaded')
    } catch (error) {
      console.error('Failed to ZIP images:', error)
      toast.error('ZIP export failed', { description: 'Could not package images.' })
    } finally {
      setIsZipping(false)
    }
  }, [access, globalShowNumbers, globalTheme, paletteImages, projects, requestPaidAccess, solutionNameList])

  return { isZipping, handleDownloadAllImages }
}
