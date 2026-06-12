'use client'

import { autoInit, sampleTile } from '@/lib/marketing/mosaic'
import { useEffect } from 'react'
import colored from '../assets/img/colored.png'
import origin from '../assets/img/origin.png'
import uncolored from '../assets/img/uncolored.png'

type RGB = [number, number, number]

const lum = ([r, g, b]: RGB) => r * 0.299 + g * 0.587 + b * 0.114
const toHex = ([r, g, b]: RGB) =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

// Cell legend codes: 1–9, then A, B, C, … (matches the tool's output).
const codeFor = (rank: number) => (rank < 9 ? String(rank + 1) : String.fromCharCode(65 + (rank - 9)))

// Route the (large) source PNGs through Next's image optimizer so the hero only
// downloads a small, compressed version instead of the multi-MB original.
// w must be one of Next's deviceSizes and q must be an allowed quality (75).
const optimized = (src: string, w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Draw an image to fill (cover) a fixed-size canvas.
function drawCover(canvas: HTMLCanvasElement, img: HTMLImageElement, w: number, h: number) {
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const s = Math.max(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

// Minimal k-means over RGB samples.
function kmeans(points: RGB[], k: number, iters: number) {
  const centroids: RGB[] = []
  for (let i = 0; i < k; i++) centroids.push([...points[Math.floor((i / k) * points.length)]] as RGB)
  const labels = new Array(points.length).fill(0)
  for (let it = 0; it < iters; it++) {
    for (let p = 0; p < points.length; p++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < k; c++) {
        const dr = points[p][0] - centroids[c][0]
        const dg = points[p][1] - centroids[c][1]
        const db = points[p][2] - centroids[c][2]
        const d = dr * dr + dg * dg + db * db
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      labels[p] = best
    }
    const sums = centroids.map(() => [0, 0, 0, 0])
    for (let p = 0; p < points.length; p++) {
      const c = labels[p]
      sums[c][0] += points[p][0]
      sums[c][1] += points[p][1]
      sums[c][2] += points[p][2]
      sums[c][3]++
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]]
    }
  }
  return centroids
}

// Extract the dominant colors of an image into a numbered palette legend.
function extractPalette(img: HTMLImageElement, k: number) {
  const cw = 56
  const ch = 72
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, cw, ch)
  const data = ctx.getImageData(0, 0, cw, ch).data
  const points: RGB[] = []
  for (let i = 0; i < cw * ch; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    if (data[i * 4 + 3] < 128) continue // transparent
    if (r > 238 && g > 238 && b > 238) continue // skip the white background
    points.push([r, g, b])
  }
  if (points.length < k) return []
  const centroids = kmeans(points, k, 10)
  return centroids.sort((a, b) => lum(b) - lum(a)).map((rgb, r) => ({ code: codeFor(r), hex: toHex(rgb) }))
}

function renderPalette(el: HTMLElement, palette: { code: string; hex: string }[]) {
  el.style.cssText = 'display:flex;flex-direction:column;justify-content:space-between;height:100%'
  el.innerHTML = palette
    .map(
      ({ code, hex }) =>
        `<div style="display:flex;align-items:center;gap:7px">` +
        `<span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-secondary);width:16px;text-align:center">${code}</span>` +
        `<span style="width:22px;height:22px;border-radius:5px;background:${hex};border:1px solid rgba(255,255,255,.14);flex-shrink:0"></span>` +
        `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-secondary)">${hex.toUpperCase()}</span>` +
        `</div>`
    )
    .join('')
}

/**
 * Runs the client-side mosaic demos on the (server-rendered) home page: the hero
 * source-photo → color-by-number reveal (real images), the style sampler and the
 * before/after slider.
 */
export default function MosaicInit() {
  useEffect(() => {
    // populate every [data-mosaic] block (feature mini-grids, before/after slider)
    autoInit(document)

    // sampler tiles (10 styles)
    const shapes = [
      'square',
      'circle',
      'diamond',
      'hexagon',
      'puzzle',
      'square',
      'fish',
      'trapezoid',
      'square',
      'hexagon',
    ]
    const samp = document.getElementById('sampler')
    if (samp) {
      samp.innerHTML = ''
      shapes.forEach((s, i) => samp.appendChild(sampleTile(s, i * 7 + 2)))
    }

    // hero convert demo — real photo sweeps into the color-by-number page
    let raf = 0
    let cancelled = false
    // Render the canvases well above their on-screen size (~340px) so the
    // mosaic stays crisp on any display.
    const W = 1200
    const H = Math.round((W * 11) / 8.5) // 8.5 : 11
    const photo = document.getElementById('cdPhoto') as HTMLCanvasElement | null
    const uncoloredEl = document.getElementById('cdUncolored') as HTMLCanvasElement | null
    const mosaic = document.getElementById('cdMosaic') as HTMLCanvasElement | null
    const scan = document.getElementById('cdScan')
    const pctEl = document.getElementById('cdPct')
    const stageEl = document.getElementById('cdStage')
    const paletteEl = document.getElementById('cdPalette')
    const tagL = document.getElementById('cdTagL')
    const tagR = document.getElementById('cdTagR')

    if (photo && uncoloredEl && mosaic && scan && pctEl) {
      Promise.all([
        loadImage(optimized(origin.src, 1200)),
        loadImage(optimized(uncolored.src, 1200)),
        loadImage(optimized(colored.src, 1200)),
      ])
        .then(([originImg, uncoloredImg, coloredImg]) => {
          if (cancelled) return
          drawCover(photo, originImg, W, H)
          drawCover(uncoloredEl, uncoloredImg, W, H)
          drawCover(mosaic, coloredImg, W, H)
          if (paletteEl) renderPalette(paletteEl, extractPalette(originImg, 16))

          // p = 1 → fully visible (revealed from the left); p = 0 → hidden.
          const reveal = (el: HTMLElement, p: number) => (el.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`)

          // Two-stage timeline: origin → numbered page → colored page.
          const HOLD0 = 500
          const SWEEP1 = 2600
          const HOLD1 = 700
          const SWEEP2 = 2600
          const HOLD2 = 1700
          const A = HOLD0
          const B = A + SWEEP1
          const C = B + HOLD1
          const D = C + SWEEP2
          const CYCLE = D + HOLD2

          const setTags = (l: string, r: string, rVisible = true) => {
            if (tagL) tagL.textContent = l
            if (tagR) {
              tagR.textContent = r
              tagR.style.opacity = rVisible ? '1' : '0'
            }
          }

          const frame = (e: number) => {
            let scanP = -1
            let stage = 'Source image'
            let pct = 0
            if (e < A) {
              reveal(uncoloredEl, 0)
              reveal(mosaic, 0)
              setTags('SOURCE PHOTO', '', false)
            } else if (e < B) {
              const p = (e - A) / SWEEP1
              reveal(uncoloredEl, p)
              reveal(mosaic, 0)
              scanP = p
              stage = 'Converting'
              pct = Math.round(p * 50)
              setTags('COLOR BY NUMBER', 'SOURCE PHOTO')
            } else if (e < C) {
              reveal(uncoloredEl, 1)
              reveal(mosaic, 0)
              stage = 'Numbered page'
              pct = 50
              setTags('COLOR BY NUMBER', 'SOURCE PHOTO')
            } else if (e < D) {
              const p = (e - C) / SWEEP2
              reveal(uncoloredEl, 1)
              reveal(mosaic, p)
              scanP = p
              stage = 'Coloring'
              pct = Math.round(50 + p * 50)
              setTags('COLORED PAGE', 'NUMBERED PAGE')
            } else {
              reveal(uncoloredEl, 1)
              reveal(mosaic, 1)
              stage = 'Color by number'
              pct = 100
              setTags('COLORED PAGE', 'NUMBERED PAGE')
            }
            if (scanP >= 0) {
              scan.style.left = scanP * 100 + '%'
              scan.style.opacity = scanP > 0.985 || scanP < 0.015 ? '0' : '1'
            } else {
              scan.style.opacity = '0'
            }
            pctEl.textContent = String(pct)
            if (stageEl) stageEl.textContent = stage
          }

          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            frame(C + SWEEP2 * 0.5) // representative still: coloring half-done (tags set inside frame)
          } else {
            let t0: number | null = null
            const loop = (ts: number) => {
              if (t0 === null) t0 = ts
              frame((ts - t0) % CYCLE)
              raf = requestAnimationFrame(loop)
            }
            raf = requestAnimationFrame(loop)
          }
        })
        .catch(() => {})
    }

    // before/after sliders (2 independent instances)
    const cleanups: (() => void)[] = []
    for (const n of ['1', '2']) {
      const slider = document.getElementById(`baSlider${n}`)
      const top = document.getElementById(`baTop${n}`)
      const handle = document.getElementById(`baHandle${n}`)
      if (!slider || !top || !handle) continue
      let dragging = false
      const set = (x: number) => {
        const r = slider.getBoundingClientRect()
        let p = (x - r.left) / r.width
        p = Math.max(0.04, Math.min(0.96, p))
        handle.style.left = p * 100 + '%'
        top.style.clipPath = `inset(0 0 0 ${p * 100}%)`
      }
      const onDown = () => { dragging = true }
      const onUp = () => { dragging = false }
      const onMove = (e: PointerEvent) => { if (dragging) set(e.clientX) }
      const onClick = (e: MouseEvent) => set(e.clientX)
      handle.addEventListener('pointerdown', onDown)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointermove', onMove)
      slider.addEventListener('click', onClick)
      cleanups.push(() => {
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerdown', onDown)
        slider.removeEventListener('click', onClick)
      })
    }

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return null
}
