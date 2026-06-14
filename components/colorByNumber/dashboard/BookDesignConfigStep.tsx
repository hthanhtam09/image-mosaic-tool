'use client'

/**
 * BookDesignConfigStep – UI for users to configure how their coloring book looks before converting.
 * Displays BOTH pages (Page 1 - Palette Page, Page 2 - Coloring Sheet) side-by-side at a large size.
 * Previews are rendered using the actual high-res PDF canvas exporters for perfect fidelity.
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { useBookDesignStore, type BadgeStyle, type ColoringDisplayMode } from '@/store/useBookDesignStore'
import { useColorByNumberStore } from '@/store/useColorByNumberStore'
import { THEMES, getThemeById } from '@/lib/colorByNumber/themes'
import type { ColorByNumberGridType, ColorByNumberData, ColorByNumberCell } from '@/lib/colorByNumber'
import { quantizeImage } from '@/lib/quantize'
import { rgbToHex } from '@/lib/utils'
import { getHexColorName } from '@/lib/palette'
import { exportPaletteToCanvas, exportToCanvas } from '@/lib/colorByNumber/export'
import { imageToColorByNumber } from '@/lib/colorByNumber/imageToColorByNumber'

// ─── Grid types ──────────────────────────────────────────────────────────────
const GRID_TYPES_REGULAR: { value: ColorByNumberGridType | 'auto'; label: string }[] = [
  { value: 'auto',       label: 'Auto cycle' },
  { value: 'standard',   label: 'Square'     },
  { value: 'honeycomb',  label: 'Circle'     },
  { value: 'diamond',    label: 'Diamond'    },
  { value: 'pentagon',   label: 'Hexagon'    },
  { value: 'puzzle',     label: 'Puzzle'     },
  { value: 'islamic',    label: 'Islamic'    },
  { value: 'fish-scale', label: 'Fish Scale' },
  { value: 'trapezoid',  label: 'Trapezoid'  },
]

const GRID_TYPES_MARK: { value: ColorByNumberGridType; label: string; desc: string }[] = [
  { value: 'square-mark',  label: 'Square Mark',  desc: 'Codes 1–5 by tone' },
  { value: 'hexagon-mark', label: 'Hexagon Mark', desc: 'Codes ./1–5 by tone' },
]

// Canvas interaction tool
type CanvasTool = 'select' | 'hand'

// ─── Fallback swatches if no image is available ───────────────────────────────
const FALLBACK_SWATCHES = [
  { color: '#E74C3C' },
  { color: '#3498DB' },
  { color: '#2ECC71' },
  { color: '#F39C12' },
  { color: '#9B59B6' },
  { color: '#1ABC9C' },
  { color: '#E67E22' },
  { color: '#34495E' },
]

// ─── Color sampling using real quantizer ──────────────────────────────────────
function sampleColorsFromImage(dataUrl: string, count = 12): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 120
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(FALLBACK_SWATCHES.map(s => s.color)); return }

      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      const imageData = ctx.getImageData(0, 0, SIZE, SIZE)

      try {
        const { palette } = quantizeImage(imageData, count)
        const hex = palette.map(rgbToHex)
        // Pad with fallbacks if too few colors returned
        while (hex.length < count) {
          const fallback = FALLBACK_SWATCHES[hex.length % FALLBACK_SWATCHES.length].color
          hex.push(fallback)
        }
        resolve(hex)
      } catch (err) {
        console.error("Quantization failed in preview:", err)
        resolve(FALLBACK_SWATCHES.map(s => s.color))
      }
    }
    img.onerror = () => resolve(FALLBACK_SWATCHES.map(s => s.color))
    img.src = dataUrl
  })
}

// ─── Hook: sample colors from a thumbnail data URL ────────────────────────────
function useSampledColors(imageUrl: string | undefined) {
  const [colors, setColors] = useState<string[]>(FALLBACK_SWATCHES.map(s => s.color))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!imageUrl) {
      setColors(FALLBACK_SWATCHES.map(s => s.color))
      setReady(true)
      return
    }
    setReady(false)
    sampleColorsFromImage(imageUrl, 12).then(c => {
      setColors(c)
      setReady(true)
    })
  }, [imageUrl])

  return { colors, ready }
}

// ─── Helper to generate a realistic mock ColorByNumberData pre-conversion ──────
const MARK_CODES_SQUARE = ['1', '2', '3', '4', '5']
const MARK_CODES_HEXAGON = ['.', '1', '2', '3', '4', '5']

const createMockProjectData = (
  gridType: ColorByNumberGridType | 'auto',
  colors: string[],
  width = 24,
  height = 30,
  cellSize = 30,
): ColorByNumberData => {
  const resolvedType = gridType === 'auto' ? 'standard' : gridType
  const isMarkGrid = resolvedType === 'square-mark' || resolvedType === 'hexagon-mark'
  const markCodes = resolvedType === 'hexagon-mark' ? MARK_CODES_HEXAGON : MARK_CODES_SQUARE

  const cells: ColorByNumberCell[] = []
  const numColors = Math.max(1, colors.length)

  if (isMarkGrid) {
    // For mark grids: simulate a tone gradient top-to-bottom (light→dark)
    // so the mock preview shows all mark code levels visually
    const grays = ['#f0f0f0', '#c8c8c8', '#a0a0a0', '#787878', '#505050']
    if (resolvedType === 'hexagon-mark') grays.unshift('#fafafa')
    const numLevels = markCodes.length
    for (let y = 0; y < height; y++) {
      const levelIdx = Math.min(numLevels - 1, Math.floor((y / height) * numLevels))
      for (let x = 0; x < width; x++) {
        cells.push({
          x,
          y,
          code: markCodes[levelIdx],
          color: grays[levelIdx] ?? '#888888',
        })
      }
    }
  } else {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) % numColors
        cells.push({
          x,
          y,
          code: (idx + 1).toString(),
          color: colors[idx],
        })
      }
    }
  }

  return {
    gridType: resolvedType,
    width,
    height,
    cellSize,
    cellGap: gridType === 'honeycomb' ? 2 : 0,
    cells,
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer select-none group">
      <span className="text-xs font-semibold text-white/75 group-hover:text-white transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none
          ${checked ? 'bg-[var(--accent)]' : 'bg-white/10'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-300
            ${checked ? 'translate-x-4.5' : 'translate-x-1'}`}
        />
      </button>
    </label>
  )
}

// ─── Palette Page – REAL Page Preview ─────────────────────────────────────────
function PalettePreview({
  data,
  theme,
  badgeStyle,
  showWaterdropIcon,
  showColorInput,
  badgeBgImageUrl,
  isConverting,
}: {
  data: ColorByNumberData
  theme: string
  badgeStyle: BadgeStyle
  showWaterdropIcon: boolean
  showColorInput: boolean
  badgeBgImageUrl: string | null
  isConverting?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeObj = getThemeById(theme)
  const bg = themeObj.backgroundColor

  const fg = useMemo(() => {
    const s = bg.replace('#', '')
    if (s.length !== 6) return '#1a1a1a'
    const r = parseInt(s.slice(0, 2), 16)
    const g = parseInt(s.slice(2, 4), 16)
    const b = parseInt(s.slice(4, 6), 16)
    const isDark = (r * 299 + g * 587 + b * 114) / 1000 < 128
    return isDark ? '#ffffff' : '#1a1a1a'
  }, [bg])

  const customFontName = useBookDesignStore((s) => s.customFontName)
  const [fontLoadedTrigger, setFontLoadedTrigger] = useState(0)
  const [loadedBadgeBgImg, setLoadedBadgeBgImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const handler = () => setFontLoadedTrigger((p) => p + 1)
    window.addEventListener('custom-font-loaded', handler)
    return () => window.removeEventListener('custom-font-loaded', handler)
  }, [])

  useEffect(() => {
    if (!badgeBgImageUrl) {
      setLoadedBadgeBgImg(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = badgeBgImageUrl
    img.onload = () => {
      setLoadedBadgeBgImg(img)
    }
    img.onerror = () => {
      setLoadedBadgeBgImg(null)
    }
  }, [badgeBgImageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render palette page using high-res canvas exporter
    const pageCanvas = exportPaletteToCanvas(data, {
      bgColor: bg,
      themeColor: fg,
      pageNumber: 1,
      badgeBgImage: loadedBadgeBgImg,
      forPreview: true, // show all actual colors, no 23-color snap/merge
    })

    // Downsample using canvas image smoothing to make preview very crisp and clear
    const targetW = 1200
    const targetH = Math.round(1200 * (11 / 8.5)) // 1553
    
    canvas.width = targetW
    canvas.height = targetH
    
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(pageCanvas, 0, 0, targetW, targetH)
  }, [data, bg, fg, badgeStyle, showWaterdropIcon, showColorInput, badgeBgImageUrl, loadedBadgeBgImg, customFontName, fontLoadedTrigger])

  if (isConverting) {
    return (
      <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-[#18181c]/95 flex flex-col p-8 items-center justify-between">
        {/* Header skeleton */}
        <div className="flex flex-col items-center gap-2.5 w-full mt-4">
          <div className="h-6 w-1/3 bg-white/10 rounded-md animate-pulse" />
          <div className="h-3 w-1/2 bg-white/5 rounded-md animate-pulse" />
        </div>
        {/* Main Swatches grid */}
        <div className="grid grid-cols-4 gap-5 w-full px-6 my-auto">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/10 animate-pulse flex items-center justify-center" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="w-5 h-5 rounded-full bg-white/5" />
            </div>
          ))}
        </div>
        {/* Spinner & footer */}
        <div className="flex flex-col items-center gap-2.5 mb-4 w-full">
          <div className="w-6 h-6 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Loading Preview</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-white transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.6)]">
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-300 ${isConverting ? 'opacity-40' : 'opacity-100'}`} />
    </div>
  )
}

// ─── Coloring Page – REAL Page Preview ────────────────────────────────────────
function ColoringPreview({
  data,
  theme,
  displayMode,
  badgeStyle,
  isConverting,
}: {
  data: ColorByNumberData
  theme: string
  displayMode: ColoringDisplayMode
  badgeStyle: BadgeStyle
  isConverting?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeObj = getThemeById(theme)
  const bg = themeObj.backgroundColor

  const customFontName = useBookDesignStore((s) => s.customFontName)
  const [fontLoadedTrigger, setFontLoadedTrigger] = useState(0)
  const removeBg = useColorByNumberStore((s) => s.projects[0]?.removeBackground ?? false)

  useEffect(() => {
    const handler = () => setFontLoadedTrigger((p) => p + 1)
    window.addEventListener('custom-font-loaded', handler)
    return () => window.removeEventListener('custom-font-loaded', handler)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render coloring page using high-res canvas exporter (uncolored page preview)
    const isMark = data.gridType === 'square-mark' || data.gridType === 'hexagon-mark'
    const pageCanvas = exportToCanvas(
      data,
      {}, // empty filled map so it is completely uncolored
      {
        showCodes: true,
        colored: false, // uncolored page preview
        showPalette: displayMode === 'side-by-side' && !isMark,
        showMagnifier: false,
        bgColor: bg,
        transparentBg: removeBg,
        tightCrop: removeBg && !isMark,
        removeBgColorCells: true,
      }
    )

    // Downsample using canvas image smoothing to make preview very crisp and clear
    const targetW = 1200
    const targetH = Math.round(1200 * (11 / 8.5)) // 1553
    
    canvas.width = targetW
    canvas.height = targetH
    
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(pageCanvas, 0, 0, targetW, targetH)
  }, [data, bg, displayMode, badgeStyle, customFontName, fontLoadedTrigger, removeBg])

  if (isConverting) {
    return (
      <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-[#18181c]/95 flex flex-col p-8 items-center justify-between">
        {/* Header */}
        <div className="flex flex-col items-center gap-2.5 w-full mt-4">
          <div className="h-5 w-1/2 bg-white/10 rounded-md animate-pulse" />
        </div>
        {/* Main grid pattern skeleton */}
        <div className="w-full flex-1 max-h-[60%] border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden my-auto flex items-center justify-center">
          <div className="absolute inset-0 grid grid-cols-12 gap-1.5 p-4 opacity-[0.08]">
            {Array.from({ length: 108 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white rounded-sm animate-pulse" style={{ animationDelay: `${(i % 12 + Math.floor(i / 12)) * 30}ms` }} />
            ))}
          </div>
          <div className="z-10 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-[10px] text-white/40 font-semibold tracking-wider">Generating pattern...</span>
          </div>
        </div>
        {/* Page number */}
        <div className="h-3 w-8 bg-white/10 rounded-md mb-4 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-white transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.6)]">
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-300 ${isConverting ? 'opacity-40' : 'opacity-100'}`} />
    </div>
  )
}
// ─── Colored Page – REAL colored preview ─────────────────────────────────────
function ColoredPreview({
  data,
  theme,
  badgeStyle,
  isConverting,
  showCodes = false,
}: {
  data: ColorByNumberData
  theme: string
  badgeStyle: BadgeStyle
  isConverting?: boolean
  showCodes?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const themeObj = getThemeById(theme)
  const bg = themeObj.backgroundColor

  const customFontName = useBookDesignStore((s) => s.customFontName)
  const [fontLoadedTrigger, setFontLoadedTrigger] = useState(0)
  const removeBg = useColorByNumberStore((s) => s.projects[0]?.removeBackground ?? false)

  useEffect(() => {
    const handler = () => setFontLoadedTrigger((p) => p + 1)
    window.addEventListener('custom-font-loaded', handler)
    return () => window.removeEventListener('custom-font-loaded', handler)
  }, [])

  // Build a fully-filled map: all cell codes set to true
  const allFilledMap = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const cell of data.cells) {
      if (cell.code) m[cell.code] = true
    }
    return m
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render fully colored page
    const isMark = data.gridType === 'square-mark' || data.gridType === 'hexagon-mark'
    const pageCanvas = exportToCanvas(
      data,
      allFilledMap,
      {
        showCodes,
        colored: true,
        showPalette: false,
        showMagnifier: false,
        bgColor: bg,
        transparentBg: removeBg,
        tightCrop: removeBg && !isMark,
        removeBgColorCells: true,
      }
    )

    const targetW = 1200
    const targetH = Math.round(1200 * (11 / 8.5))
    canvas.width = targetW
    canvas.height = targetH
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(pageCanvas, 0, 0, targetW, targetH)
  }, [data, bg, allFilledMap, badgeStyle, customFontName, fontLoadedTrigger, showCodes, removeBg])

  if (isConverting) {
    return (
      <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-[#18181c]/95 flex flex-col p-8 items-center justify-between">
        {/* Header */}
        <div className="flex flex-col items-center gap-2.5 w-full mt-4">
          <div className="h-5 w-1/2 bg-white/10 rounded-md animate-pulse" />
        </div>
        {/* Main grid colored pattern skeleton */}
        <div className="w-full flex-1 max-h-[60%] border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden my-auto flex items-center justify-center">
          <div className="absolute inset-0 grid grid-cols-12 gap-1.5 p-4 opacity-[0.15]">
            {Array.from({ length: 108 }).map((_, i) => {
              const colorClasses = [
                'bg-red-500/20', 'bg-blue-500/20', 'bg-green-500/20',
                'bg-yellow-500/20', 'bg-purple-500/20', 'bg-pink-500/20',
                'bg-indigo-500/20', 'bg-teal-500/20', 'bg-orange-500/20'
              ]
              const bgClass = colorClasses[i % colorClasses.length]
              return (
                <div key={i} className={`aspect-square rounded-sm animate-pulse ${bgClass}`} style={{ animationDelay: `${(i % 12 + Math.floor(i / 12)) * 30}ms` }} />
              )
            })}
          </div>
          <div className="z-10 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-white/20 border-t-[var(--accent)] rounded-full animate-spin" />
            <span className="text-[10px] text-white/40 font-semibold tracking-wider">Rendering coloring...</span>
          </div>
        </div>
        {/* Page number */}
        <div className="h-3 w-8 bg-white/10 rounded-md mb-4 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full aspect-[8.5/11] rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 bg-white transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.6)]">
      <canvas ref={canvasRef} className={`w-full h-full object-contain transition-opacity duration-300 ${isConverting ? 'opacity-40' : 'opacity-100'}`} />
    </div>
  )
}

export default function BookDesignConfigStep({
  projectCount = 0,
  firstImageUrl,
}: {
  projectCount?: number
  firstImageUrl?: string
}) {
  const {
    badgeStyle, setBadgeStyle,
    showWaterdropIcon, toggleWaterdropIcon,
    showColorInput, toggleColorInput,
    badgeBgImageUrl, setBadgeBgImage,
    coloringTheme, setColoringTheme,
    coloringPattern, setColoringPattern,
    customFontName,
    setCustomFont,
    showColoredNumbers, toggleColoredNumbers,
  } = useBookDesignStore()

  const { projects, setGlobalTheme, setGlobalGridType, globalCellSize, setGlobalCellSize } = useColorByNumberStore()

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  useEffect(() => {
    if (globalCellSize < 12 || globalCellSize > 36) {
      setGlobalCellSize(Math.max(12, Math.min(36, globalCellSize)))
    }
  }, [globalCellSize, setGlobalCellSize])

  const fontInputRef = useRef<HTMLInputElement>(null)

  const handleFontUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64Data = result.split(',')[1]
      const extension = file.name.split('.').pop() || 'ttf'
      const fontName = file.name.replace(/\.[^/.]+$/, "")
      setCustomFont(fontName, base64Data, extension)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [setCustomFont])

  // Find the first completed/converted project
  const firstConvertedProject = useMemo(() => {
    return projects.find((p) => p.data && p.data.cells.length > 0)
  }, [projects])

  // Sample real colors from the first imported image using real quantizer (pre-conversion fallback)
  const { colors: sampledColors, ready: colorsReady } = useSampledColors(firstImageUrl)

  // Extract unique colors from project cells if converted
  const previewColors = useMemo(() => {
    if (firstConvertedProject && firstConvertedProject.data) {
      const uniqueColors = Array.from(new Set(firstConvertedProject.data.cells.map(c => c.color)))
      if (uniqueColors.length > 0) return uniqueColors
    }
    return sampledColors
  }, [firstConvertedProject, sampledColors])

  // Stable primitives from projects[0] — used as useEffect deps to avoid re-triggering on unrelated store updates
  const firstProject = projects[0]
  const firstProjectId = firstProject?.id
  const firstProjectFile = firstProject?.originalFile
  const firstProjectUseDithering = firstProject?.useDithering ?? true
  const firstProjectRemoveBg = firstProject?.removeBackground ?? false

  const [realConvertedData, setRealConvertedData] = useState<ColorByNumberData | null>(null)
  const [isConvertingPreview, setIsConvertingPreview] = useState(() => {
    return projects.length > 0 && !!projects[0]?.originalFile
  })
  const [gridPatternTab, setGridPatternTab] = useState<'regular' | 'mark'>(() =>
    (coloringPattern === 'square-mark' || coloringPattern === 'hexagon-mark') ? 'mark' : 'regular'
  )

  // ── Figma-like canvas state ──────────────────────────────────────────────────
  const [tool, setTool] = useState<CanvasTool>('hand')
  const [isDragging, setIsDragging] = useState(false)
  const [tempHand, setTempHand] = useState(false) // Space held
  const [viewState, setViewState] = useState({ zoom: 0.82, x: 0, y: 0 })
  const vsRef = useRef({ zoom: 0.82, x: 0, y: 0 }) // kept in sync for non-render paths
  const dragRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const commitView = useCallback((v: { zoom: number; x: number; y: number }) => {
    vsRef.current = v
    setViewState(v)
  }, [])

  // Native wheel → zoom toward cursor
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { zoom, x, y } = vsRef.current
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
      const newZoom = Math.min(Math.max(zoom * factor, 0.1), 8)
      commitView({
        zoom: newZoom,
        x: cx - (cx - x) * (newZoom / zoom),
        y: cy - (cy - y) * (newZoom / zoom),
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [commitView])

  // Initialise offset so grid is centred
  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    // estimate content width = containerWidth (grid fills 100% at zoom=1)
    // place top-left so it's centred
    const initX = width * (1 - vsRef.current.zoom) / 2
    const initY = 48 // leave room for zoom bar label + top padding
    commitView({ ...vsRef.current, x: initX, y: initY })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard shortcuts: Space / Digit0
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setTempHand(true) }
      if ((e.ctrlKey || e.metaKey) && e.code === 'Digit0') {
        e.preventDefault()
        const el = previewContainerRef.current
        if (!el) return
        const { width } = el.getBoundingClientRect()
        const fitZoom = 0.82
        commitView({ zoom: fitZoom, x: width * (1 - fitZoom) / 2, y: 48 })
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setTempHand(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [commitView])

  const isHandActive = true

  // Toolbar zoom helpers (zoom toward container centre)
  const zoomBy = useCallback((factor: number) => {
    const el = previewContainerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const cx = width / 2; const cy = height / 2
    const { zoom, x, y } = vsRef.current
    const newZoom = Math.min(Math.max(zoom * factor, 0.1), 8)
    commitView({ zoom: newZoom, x: cx - (cx - x) * (newZoom / zoom), y: cy - (cy - y) * (newZoom / zoom) })
  }, [commitView])

  const zoomFit = useCallback(() => {
    const el = previewContainerRef.current
    if (!el) return
    const { width } = el.getBoundingClientRect()
    const fitZoom = 0.82
    commitView({ zoom: fitZoom, x: width * (1 - fitZoom) / 2, y: 48 })
  }, [commitView])

  // Mouse drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHandActive) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mx: e.clientX, my: e.clientY, ox: vsRef.current.x, oy: vsRef.current.y }
    setIsDragging(true)
  }, [isHandActive])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.mx
    const dy = e.clientY - dragRef.current.my
    const v = { ...vsRef.current, x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }
    vsRef.current = v
    setViewState(v)
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current = null
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (!firstProjectId || !firstProjectFile) {
      setRealConvertedData(null)
      setIsConvertingPreview(false)
      return
    }

    setIsConvertingPreview(true)

    let active = true
    const timer = setTimeout(() => {
      const isMark = coloringPattern === 'square-mark' || coloringPattern === 'hexagon-mark'
      imageToColorByNumber(firstProjectFile, {
        gridType: coloringPattern === 'auto' ? 'standard' : coloringPattern,
        cellSize: globalCellSize,
        useDithering: firstProjectUseDithering,
        removeWhiteBackground: firstProjectRemoveBg || isMark,
      }).then((data) => {
        if (active) {
          setRealConvertedData(data)
          setIsConvertingPreview(false)
        }
      }).catch((err) => {
        console.error("Preview conversion failed:", err)
        if (active) {
          setRealConvertedData(null)
          setIsConvertingPreview(false)
        }
      })
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstProjectId, firstProjectFile, coloringPattern, globalCellSize, firstProjectUseDithering, firstProjectRemoveBg])

  // Determine active project data to pass to exporters
  const activeData = useMemo(() => {
    if (realConvertedData) {
      return realConvertedData
    }
    if (firstConvertedProject && firstConvertedProject.data) {
      return firstConvertedProject.data
    }

    // Dynamically adjust number of grid columns & rows based on cell size so that dragging the slider changes the density of cells in real-time
    const isMarkGrid = coloringPattern === "square-mark" || coloringPattern === "hexagon-mark"
    const targetAspect = isMarkGrid ? 7.8 / 10.2 : 7.0 / 10.2
    
    // The convert tool uses maxWidth=1800 for cell density calculations (imageToColorByNumber default)
    const baseWidth = 1800
    const baseHeight = Math.round(baseWidth / targetAspect)
    
    const mockWidth = Math.max(5, Math.round(baseWidth / globalCellSize))
    const mockHeight = Math.max(5, Math.round(baseHeight / globalCellSize))
    return createMockProjectData(coloringPattern, previewColors, mockWidth, mockHeight, globalCellSize)
  }, [realConvertedData, firstConvertedProject, coloringPattern, previewColors, globalCellSize])

  const badgeBgInputRef = useRef<HTMLInputElement>(null)

  const handleBadgeBgChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setBadgeBgImage(file, url)
    e.target.value = ''
  }, [setBadgeBgImage])

  const removeBadgeBg = useCallback(() => {
    if (badgeBgImageUrl) URL.revokeObjectURL(badgeBgImageUrl)
    setBadgeBgImage(null, null)
  }, [badgeBgImageUrl, setBadgeBgImage])

  const badgeStyles: { value: BadgeStyle; label: string; desc: string }[] = useMemo(() => [
    { value: 'letter', label: 'A–Z', desc: 'Letters only' },
    { value: 'mixed',  label: 'A1…', desc: 'Letter + number (Recommended)' },
  ], [])

  const handleThemeChange = (themeId: string) => {
    setColoringTheme(themeId)
    setGlobalTheme(themeId)
  }

  const handlePatternChange = (pattern: ColorByNumberGridType | 'auto') => {
    setColoringPattern(pattern)
    setGlobalGridType(pattern)
    // Auto-switch tab to match pattern category
    const isMark = pattern === 'square-mark' || pattern === 'hexagon-mark'
    setGridPatternTab(isMark ? 'mark' : 'regular')
  }

  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex-1 min-h-0 overflow-hidden relative bg-transparent">
      {/* Settings toggle button — always visible */}
      <button
        type="button"
        onClick={() => setShowSettings(p => !p)}
        className={`absolute top-4 right-4 z-30 flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-bold transition-all duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md ${
          showSettings
            ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
            : 'border-white/20 bg-[#16161a]/95 text-white hover:border-[var(--accent)] hover:text-[var(--accent)]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        {showSettings ? 'Hide Settings' : 'Settings'}
      </button>

      {/* Main content area: previews + optional overlaid settings panel */}
      <div className="flex h-full">
        {/* Previews — infinite canvas */}
        <div
          ref={previewContainerRef}
          className="flex-1 min-w-0 overflow-hidden relative select-none"
          style={{ cursor: isHandActive ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Scalable / translatable canvas content */}
          <div
            style={{
              position: 'absolute',
              left: 0, top: 0,
              transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              // pointer-events: none on canvas content when dragging so pointer capture works cleanly
              pointerEvents: isDragging ? 'none' : 'auto',
            }}
          >
            <div className="px-6 py-6">
              <div className="grid grid-cols-3 gap-6 items-start" style={{ minWidth: 900 }}>
                {/* Page 1: Palette Key */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-white/45 text-center tracking-wide">Color Palette Key</p>
                  <PalettePreview
                    data={activeData}
                    theme={coloringTheme}
                    badgeStyle={badgeStyle}
                    showWaterdropIcon={showWaterdropIcon}
                    showColorInput={showColorInput}
                    badgeBgImageUrl={badgeBgImageUrl}
                    isConverting={isConvertingPreview}
                  />
                </div>
                {/* Page 2: Coloring Activity Sheet */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-white/45 text-center tracking-wide">Coloring Activity Sheet</p>
                  <ColoringPreview
                    data={activeData}
                    theme={coloringTheme}
                    displayMode="full-screen"
                    badgeStyle={badgeStyle}
                    isConverting={isConvertingPreview}
                  />
                </div>
                {/* Page 3: Fully Colored Result */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-white/45 text-center tracking-wide">Colored Result</p>
                  <ColoredPreview
                    data={activeData}
                    theme={coloringTheme}
                    badgeStyle={badgeStyle}
                    isConverting={isConvertingPreview}
                    showCodes={showColoredNumbers}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Figma-style bottom toolbar ─────────────────────────────────── */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 rounded-2xl border border-white/10 bg-[#18181c]/92 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.55)] px-2 py-1.5">
            {/* Tool: Hand (Active always) */}
            <div
              title="Hand / Drag (Active)"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]"
            >
              {/* Hand icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-4 0v5"/>
                <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
                <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
                <path d="M6 14a2 2 0 0 0-2 2c0 2.8 1.5 5 4 6h4a5 5 0 0 0 5-5v-3a2 2 0 0 0-4 0v0"/>
              </svg>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-white/10 mx-1.5" />

            {/* Zoom out */}
            <button
              type="button"
              onClick={() => zoomBy(1 / 1.2)}
              title="Zoom out (scroll down)"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>

            {/* Zoom % — click to fit */}
            <button
              type="button"
              onClick={zoomFit}
              title="Reset to fit (Ctrl+0)"
              className="px-2.5 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/8 transition-all text-[11px] font-mono font-bold min-w-[52px]"
            >
              {Math.round(viewState.zoom * 100)}%
            </button>

            {/* Zoom in */}
            <button
              type="button"
              onClick={() => zoomBy(1.2)}
              title="Zoom in (scroll up)"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Settings panel — slides in from right */}
        <div
          className={`shrink-0 flex flex-col border-l border-white/8 bg-[var(--bg-secondary,#0f0f12)] transition-all duration-300 overflow-hidden relative ${
            showSettings ? 'w-[340px] opacity-100' : 'w-0 opacity-0'
          }`}
          style={{ minWidth: showSettings ? 340 : 0 }}
        >
          {/* Conversion loading overlay - blocks all settings interaction */}
          {isConvertingPreview && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-sm pointer-events-auto">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <span className="text-xs font-bold text-white/80">Converting preview…</span>
              <span className="text-[10px] text-white/40 text-center max-w-[180px]">Please wait while the grid is being regenerated</span>
            </div>
          )}

          <div className={`w-[340px] h-full custom-scrollbar p-5 flex flex-col gap-6 pt-16 relative ${isConvertingPreview ? 'overflow-hidden pointer-events-none select-none' : 'overflow-y-auto'}`}>
            {/* Settings Header with Reset Button */}
            <div className="flex items-center justify-between pb-2 border-b border-white/8">
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Book Settings</span>
              <button
                type="button"
                onClick={() => {
                  useBookDesignStore.getState().resetToDefaults()
                  setGlobalTheme('light')
                  setGlobalGridType('standard')
                }}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-white/8 bg-white/5 text-white/50 hover:text-white hover:border-white/20 transition-all active:scale-[0.98]"
              >
                Reset to Defaults
              </button>
            </div>
            
            {/* Palette Configuration Card */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col gap-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--accent)]">1. Palette Page Design</h3>
              
              {/* Badge Label Style */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-white/60">Badge Label Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {badgeStyles.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setBadgeStyle(s.value)}
                      className={`relative flex flex-col items-center gap-1 rounded-xl border py-3 px-2 transition-all duration-200
                        ${badgeStyle === s.value
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'border-white/8 bg-white/[0.01] text-white/50 hover:border-white/20 hover:text-white/80'
                        }`}
                    >
                      {s.value === 'mixed' && (
                        <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-extrabold uppercase tracking-wider scale-95 shadow-md">
                          Recommended
                        </span>
                      )}
                      <span className="text-lg font-black tracking-tight">{s.label}</span>
                      <span className="text-[9px] font-medium opacity-70">{s.value === 'letter' ? 'Letters only' : 'Letter + number'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Swatch Options */}
              <div className="flex flex-col gap-3 border-t border-white/6 pt-4">
                <Toggle checked={showWaterdropIcon} onChange={toggleWaterdropIcon} label="Show Waterdrop Icon 💧" />
                <Toggle checked={showColorInput} onChange={toggleColorInput} label="Show Color Name" />
              </div>

              {/* Badge Background Image */}
              <div className="flex flex-col gap-3 border-t border-white/6 pt-4">
                <label className="text-xs font-bold text-white/60">Badge Background Pattern</label>
                {badgeBgImageUrl ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={badgeBgImageUrl}
                      alt="Badge background"
                      className="w-12 h-12 rounded-lg object-cover border border-white/15 shadow-md"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] text-white/50 truncate">Custom pattern set</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => badgeBgInputRef.current?.click()}
                          className="text-[11px] text-[var(--accent)] hover:underline font-semibold"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={removeBadgeBg}
                          className="text-[11px] text-red-400 hover:underline font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => badgeBgInputRef.current?.click()}
                    className="w-full border border-dashed border-white/12 rounded-xl py-4 flex flex-col items-center justify-center gap-1.5
                      hover:border-[var(--accent)]/40 hover:bg-white/[0.02] active:scale-[0.99] transition-all duration-200 text-white/45 hover:text-white/70"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-[11px] font-semibold">Upload Badge Background</span>
                  </button>
                )}
                <input
                  ref={badgeBgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleBadgeBgChange}
                />
              </div>
            </div>

            {/* Coloring Configuration Card */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col gap-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--accent)]">2. Coloring Page Design</h3>

              {/* Theme */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold text-white/60">Background Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEMES.map((t) => {
                    const isSelected = coloringTheme === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemeChange(t.id)}
                        className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all duration-200
                          ${isSelected
                            ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/40 bg-white/[0.02]'
                            : 'border-white/8 hover:border-white/20'
                          }`}
                      >
                        <span
                          className="shrink-0 w-5 h-5 rounded-md border border-white/15 shadow-inner"
                          style={{ backgroundColor: t.backgroundColor }}
                        />
                        <span className={`text-[11px] font-semibold transition-colors ${isSelected ? 'text-white' : 'text-white/50'}`}>
                          {t.name}
                        </span>
                        {isSelected && (
                          <span className="ml-auto text-[var(--accent)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </span>
                        )}
                      </button>
                    )
                  })}
                  
                  {/* Custom Background Color Picker */}
                  <div className="col-span-2 mt-1">
                    <label className="flex items-center gap-3 rounded-xl border border-white/8 px-2.5 py-2 hover:border-white/20 cursor-pointer bg-white/[0.01] transition-all duration-200">
                      <input
                        type="color"
                        value={coloringTheme.startsWith('#') ? coloringTheme : '#ffffff'}
                        onChange={(e) => handleThemeChange(e.target.value)}
                        className="w-6 h-6 rounded-md border-0 bg-transparent p-0 cursor-pointer"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-white/80">Custom Color</span>
                        <span className="text-[9px] text-white/40 font-sans">
                          {coloringTheme.startsWith('#') ? getHexColorName(coloringTheme) : 'Choose...'}
                        </span>
                      </div>
                      {coloringTheme.startsWith('#') && (
                        <span className="ml-auto text-[var(--accent)] text-xs font-bold">
                          Selected
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Grid pattern */}
              <div className="flex flex-col gap-2.5 border-t border-white/6 pt-4">
                <label className="text-xs font-bold text-white/60">Grid Pattern</label>

                {/* Tab switcher */}
                <div className="flex rounded-xl border border-white/8 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setGridPatternTab('regular')}
                    className={`flex-1 py-1.5 text-[11px] font-bold transition-all duration-150 ${
                      gridPatternTab === 'regular'
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridPatternTab('mark')}
                    className={`flex-1 py-1.5 text-[11px] font-bold transition-all duration-150 border-l border-white/8 ${
                      gridPatternTab === 'mark'
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    Mark Style
                  </button>
                </div>

                {gridPatternTab === 'regular' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {GRID_TYPES_REGULAR.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => handlePatternChange(g.value)}
                        className={`flex items-center justify-center rounded-xl border px-2.5 py-2 transition-all duration-200
                          ${coloringPattern === g.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-white/8 bg-white/[0.01] text-white/50 hover:border-white/20 hover:text-white/80'
                          }`}
                      >
                        <span className="text-[11px] font-semibold">{g.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {GRID_TYPES_MARK.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => handlePatternChange(g.value)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-200
                          ${coloringPattern === g.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'border-white/8 bg-white/[0.01] text-white/50 hover:border-white/20 hover:text-white/80'
                          }`}
                      >
                        <span className="text-[11px] font-bold">{g.label}</span>
                        <span className={`text-[9px] font-mono ${
                          coloringPattern === g.value ? 'text-[var(--accent)]/70' : 'text-white/30'
                        }`}>{g.desc}</span>
                      </button>
                    ))}
                    <p className="text-[9px] text-white/30 leading-tight">
                      Mark grids use tone-based codes (1–5) instead of colors. Requires an imported image for accurate results.
                    </p>
                  </div>
                )}
              </div>

              {/* Show Numbers on Colored Page */}
              <div className="flex flex-col gap-3 border-t border-white/6 pt-4">
                <Toggle checked={showColoredNumbers} onChange={toggleColoredNumbers} label="Show Numbers on Colored Page" />
              </div>

              {/* Cell Size Slider */}
              <div className="flex flex-col gap-2.5 border-t border-white/6 pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-white/60">Cell Size</label>
                    <button
                      type="button"
                      onClick={() => setIsInfoModalOpen(true)}
                      className="text-white/40 hover:text-white transition-colors focus:outline-none p-0.5 rounded-full hover:bg-white/5"
                      title="Show cell size details"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConvertingPreview && (
                      <svg className="animate-spin shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                    )}
                    <span className="text-xs font-mono font-bold text-[var(--accent)]">{globalCellSize}px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="12"
                  max="36"
                  value={globalCellSize}
                  disabled={isConvertingPreview}
                  onChange={(e) => {
                    const size = parseInt(e.target.value, 10)
                    setGlobalCellSize(size)
                  }}
                  className={`w-full h-1 rounded-lg appearance-none focus:outline-none transition-all ${
                    isConvertingPreview
                      ? 'bg-white/5 cursor-not-allowed opacity-40'
                      : 'bg-white/10 cursor-pointer accent-[var(--accent)]'
                  }`}
                />
                <span className="text-[9px] text-white/40 leading-tight">
                  {isConvertingPreview ? 'Re-converting grid, please wait…' : 'Adjusting size will require re-conversion of standard grid items.'}
                </span>
              </div>
            </div>

            {/* Typography Configuration Card */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col gap-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--accent)]">3. Typography Settings</h3>
              <div className="flex flex-col gap-3">
                <label className="text-xs font-bold text-white/60">Custom Book Font</label>
                
                {customFontName ? (
                  <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/8">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate max-w-[150px]">
                        {customFontName}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-[var(--accent)] tracking-wider">
                        Loaded
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomFont(null, null, null)}
                      className="w-full text-center text-[10px] py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 font-semibold transition-all active:scale-[0.98]"
                    >
                      Remove Font
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fontInputRef.current?.click()}
                      className="w-full border border-dashed border-white/12 rounded-xl py-4 flex flex-col items-center justify-center gap-1.5
                        hover:border-[var(--accent)]/40 hover:bg-white/[0.02] active:scale-[0.99] transition-all duration-200 text-white/45 hover:text-white/70"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
                      </svg>
                      <span className="text-[11px] font-semibold">Upload Custom Font (.ttf, .otf, .woff)</span>
                    </button>
                  </div>
                )}
                
                <input
                  ref={fontInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  onChange={handleFontUpload}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isInfoModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] transition-opacity duration-300"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsInfoModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl bg-[#18181b] border border-white/10 rounded-2xl p-6 flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Connecting background grid lines */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(var(--text-primary) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />

            <div className="relative z-10 flex flex-col w-full">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-sm font-black uppercase tracking-widest text-[var(--accent)]">
                  Cell Size & Difficulty Options
                </h2>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors focus:outline-none p-1 rounded-full hover:bg-white/5"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/15 bg-white/[0.02]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-white/50">
                      <th className="p-3 font-semibold">Difficulty</th>
                      <th className="p-3 font-semibold">Cell Size Range</th>
                      <th className="p-3 font-semibold text-center">Recommend</th>
                      <th className="p-3 font-semibold">Description</th>
                      <th className="p-3 font-semibold">Best For</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {[
                      {
                        difficulty: "Easy",
                        range: "28–36 px",
                        recommend: 29,
                        desc: "Large cells, fewer details, quick and relaxing to complete.",
                        bestFor: "Kids, beginners, casual users",
                        colorClass: "text-emerald-400",
                        isRecommended: true,
                      },
                      {
                        difficulty: "Medium",
                        range: "20–28 px",
                        recommend: 24,
                        desc: "Balanced detail and challenge. Most images look great at this level.",
                        bestFor: "Most users",
                        colorClass: "text-sky-400",
                      },
                      {
                        difficulty: "Hard",
                        range: "12–20 px",
                        recommend: 16,
                        desc: "Smaller cells with more detail and complexity.",
                        bestFor: "Experienced users",
                        colorClass: "text-amber-400",
                      },
                    ].map((row) => (
                      <tr
                        key={row.difficulty}
                        onClick={() => {
                          setGlobalCellSize(row.recommend)
                          setIsInfoModalOpen(false)
                        }}
                        className={`transition-colors cursor-pointer ${
                          row.isRecommended
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-3">
                          <span className={`font-black ${row.colorClass}`}>{row.difficulty}</span>
                          {row.isRecommended && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 uppercase tracking-wider">
                              Recommended
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-medium font-mono">{row.range}</td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)] font-bold font-mono">
                            {row.recommend} px
                          </span>
                        </td>
                        <td className="p-3 text-white/70 leading-relaxed min-w-[150px]">{row.desc}</td>
                        <td className="p-3 text-white/60 min-w-[120px]">{row.bestFor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[10px] text-white/40 text-center leading-relaxed">
                💡 Tip: Click any row to automatically apply its recommended cell size to your book configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
