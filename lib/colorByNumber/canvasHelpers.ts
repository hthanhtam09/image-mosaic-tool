import { getThemeById } from '@/lib/colorByNumber/themes'
import type { Project } from '@/store/useColorByNumberStore'
import { exportCollagePagesToCanvas, exportToCanvas } from '@/lib/colorByNumber/export'
import { shouldShowCodes, shouldUseTightCrop } from '@/lib/colorByNumber/objectFocus'

export const getReadyProjects = (projects: Project[]): Project[] =>
  [...projects]
    .filter((p) => p.status === 'completed')
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

export const createProjectColorCanvas = (
  project: Project,
  globalTheme: string,
  globalShowNumbers: boolean
): HTMLCanvasElement | null => {
  if (!project.data) return null
  const theme = getThemeById(globalTheme)
  return exportToCanvas(project.data, project.filled, {
    showCodes: shouldShowCodes(project.data, project.removeBackground, globalShowNumbers),
    colored: true,
    showPalette: false,
    partialColorMode: project.partialColorMode,
    bgColor: theme.backgroundColor,
    transparentBg: project.removeBackground,
    tightCrop: shouldUseTightCrop(project.data, project.removeBackground),
    removeBgColorCells: true,
    showMagnifier: false,
  })
}

export const createSolutionThumbCanvas = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
  const maxDim = 600
  const scale = Math.min(1, maxDim / Math.max(sourceCanvas.width, sourceCanvas.height))
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = sourceCanvas.width * scale
  thumbCanvas.height = sourceCanvas.height * scale
  const ctx = thumbCanvas.getContext('2d')
  ctx?.drawImage(sourceCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height)
  return thumbCanvas
}

export const generateSolutionCollagePageDataUrls = async (
  readyProjects: Project[],
  globalTheme: string,
  globalShowNumbers: boolean,
  labels: string[] = []
): Promise<string[]> => {
  const theme = getThemeById(globalTheme)
  const colorCanvases: HTMLCanvasElement[] = []
  const collageLabels: Array<string | undefined> = []

  for (let idx = 0; idx < readyProjects.length; idx++) {
    const fullCanvas = createProjectColorCanvas(readyProjects[idx], globalTheme, globalShowNumbers)
    if (!fullCanvas) continue
    colorCanvases.push(createSolutionThumbCanvas(fullCanvas))
    collageLabels.push(labels[idx])
    fullCanvas.width = 0
    fullCanvas.height = 0
    await new Promise((r) => setTimeout(r, 0))
  }

  if (colorCanvases.length === 0) return []

  const generatedPages = exportCollagePagesToCanvas(colorCanvases, {
    bgColor: theme.backgroundColor,
    labels: collageLabels,
  })
  colorCanvases.forEach((c) => { c.width = 0; c.height = 0 })

  return generatedPages.map((canvas) => {
    const dataUrl = canvas.toDataURL('image/png')
    canvas.width = 0
    canvas.height = 0
    return dataUrl
  })
}

export const parseSolutionNamesCsv = (csvText: string): string[] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i]
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { cell += ch }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  row.push(cell)
  rows.push(row)

  const nonEmptyRows = rows.filter((r) => r.some((v) => v.trim()))
  if (nonEmptyRows.length === 0) return []

  const headers = nonEmptyRows[0].map((v, i) =>
    (i === 0 ? v.replace(/^﻿/, '') : v).trim().toLowerCase()
  )
  const textIndex = headers.indexOf('text')
  if (textIndex === -1) return []

  return nonEmptyRows.slice(1).map((r) => r[textIndex]?.trim() ?? '').filter(Boolean)
}
