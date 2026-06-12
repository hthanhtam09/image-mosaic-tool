'use client'

import { useEffect, useRef } from 'react'
import { cardBase, sectionTitle } from './ui'

// ─── Canvas pattern renderers (matching the tool's export.ts exactly) ────────

type Ctx = CanvasRenderingContext2D

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

function getRoundedPolygonPath(ctx: Ctx, pts: { x: number; y: number }[], r: number) {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length]
    const curr = pts[i]
    const next = pts[(i + 1) % pts.length]
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y)
    const t = Math.min(r / d1, 0.5)
    const t2 = Math.min(r / d2, 0.5)
    const x1 = curr.x + (prev.x - curr.x) * t
    const y1 = curr.y + (prev.y - curr.y) * t
    const x2 = curr.x + (next.x - curr.x) * t2
    const y2 = curr.y + (next.y - curr.y) * t2
    if (i === 0) ctx.moveTo(x1, y1)
    else ctx.lineTo(x1, y1)
    ctx.quadraticCurveTo(curr.x, curr.y, x2, y2)
  }
  ctx.closePath()
}

const FILL   = '#c0cde3'
const STROKE = 'rgba(255,255,255,0.18)'
const BG     = '#111111'

function drawSquare(ctx: Ctx, W: number, H: number) {
  const s = 26
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const cols = Math.ceil(W / s) + 1
  const rows = Math.ceil(H / s) + 1
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const l = (x + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.beginPath(); roundRect(ctx, x * s + 1, y * s + 1, s - 2, s - 2, s * 0.15)
    ctx.fill(); ctx.stroke()
  }
}

function drawCircle(ctx: Ctx, W: number, H: number) {
  const r = 13
  const rowStep = Math.sqrt(3) * r
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const rows = Math.ceil(H / rowStep) + 2
  const cols = Math.ceil(W / (r * 2)) + 2
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const off = y % 2 === 1 ? r : 0
    const cx = x * r * 2 + r + off
    const cy = (y + 0.5) * rowStep
    const l = (x * 3 + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
}

function drawDiamond(ctx: Ctx, W: number, H: number) {
  const s = 26; const r = s / 2
  const rowStep = r
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const rows = Math.ceil(H / rowStep) + 2
  const cols = Math.ceil(W / s) + 2
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const off = y % 2 === 1 ? r : 0
    const cx = x * s + r + off
    const cy = (y + 0.5) * rowStep
    const side = r * Math.sqrt(2) - 2
    const l = (x + y * 2) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4)
    ctx.beginPath(); roundRect(ctx, -side / 2, -side / 2, side, side, side * 0.15)
    ctx.fill(); ctx.stroke(); ctx.restore()
  }
}

function drawHexagon(ctx: Ctx, W: number, H: number) {
  const s = 26; const r = s / Math.sqrt(3)
  const rowStep = 1.5 * r
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const rows = Math.ceil(H / rowStep) + 2
  const cols = Math.ceil(W / s) + 2
  const angles = [-90, -30, 30, 90, 150, 210].map(d => d * Math.PI / 180)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const off = y % 2 === 1 ? s / 2 : 0
    const cx = x * s + s / 2 + off
    const cy = (y + 0.5) * rowStep
    const pts = angles.map(a => ({ x: cx + (r - 1) * Math.cos(a), y: cy + (r - 1) * Math.sin(a) }))
    const l = (x * 2 + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    getRoundedPolygonPath(ctx, pts, r * 0.15); ctx.fill(); ctx.stroke()
  }
}

function drawPuzzle(ctx: Ctx, W: number, H: number) {
  const s = 36
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const cols = Math.ceil(W / s) + 1
  const rows = Math.ceil(H / s) + 1
  const tab = s * 0.18; const tw = s * 0.22
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const x0 = x * s; const y0 = y * s
    const tabTop    = y > 0 ? 1 : 0
    const tabRight  = x < cols - 1 ? 1 : 0
    const tabBottom = y < rows - 1 ? -1 : 0
    const tabLeft   = x > 0 ? -1 : 0
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    // top
    ctx.lineTo(x0 + s / 2 - tw, y0)
    ctx.bezierCurveTo(x0 + s / 2 - tw, y0 - tab * tabTop, x0 + s / 2 + tw, y0 - tab * tabTop, x0 + s / 2 + tw, y0)
    ctx.lineTo(x0 + s, y0)
    // right
    ctx.lineTo(x0 + s, y0 + s / 2 - tw)
    ctx.bezierCurveTo(x0 + s + tab * tabRight, y0 + s / 2 - tw, x0 + s + tab * tabRight, y0 + s / 2 + tw, x0 + s, y0 + s / 2 + tw)
    ctx.lineTo(x0 + s, y0 + s)
    // bottom
    ctx.lineTo(x0 + s / 2 + tw, y0 + s)
    ctx.bezierCurveTo(x0 + s / 2 + tw, y0 + s - tab * tabBottom, x0 + s / 2 - tw, y0 + s - tab * tabBottom, x0 + s / 2 - tw, y0 + s)
    ctx.lineTo(x0, y0 + s)
    // left
    ctx.lineTo(x0, y0 + s / 2 + tw)
    ctx.bezierCurveTo(x0 + tab * tabLeft, y0 + s / 2 + tw, x0 + tab * tabLeft, y0 + s / 2 - tw, x0, y0 + s / 2 - tw)
    ctx.closePath()
    const l = (x + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.fill(); ctx.stroke()
  }
}

function drawIslamic(ctx: Ctx, W: number, H: number) {
  // Exact port of drawIslamicTilePath from export.ts
  const size = 32; const h = size / 2
  const SQ2 = Math.SQRT2
  const R_star  = h * SQ2          // tips
  const v       = h * (SQ2 - 1)    // inner valleys
  const R_cross = h * (2 - SQ2)    // cross pinches

  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const cols = Math.ceil(W / size) + 1
  const rows = Math.ceil(H / size) + 1

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cx = x * size + h
      const cy = y * size + h
      const isStar = (x + y) % 2 === 0

      ctx.fillStyle   = isStar ? FILL : '#8fa3c8'
      ctx.strokeStyle = STROKE
      ctx.lineWidth   = 0.8
      ctx.beginPath()

      if (isStar) {
        ctx.moveTo(cx,          cy - R_star)
        ctx.lineTo(cx + v,      cy - h)
        ctx.lineTo(cx + h,      cy - h)
        ctx.lineTo(cx + h,      cy - v)
        ctx.lineTo(cx + R_star, cy)
        ctx.lineTo(cx + h,      cy + v)
        ctx.lineTo(cx + h,      cy + h)
        ctx.lineTo(cx + v,      cy + h)
        ctx.lineTo(cx,          cy + R_star)
        ctx.lineTo(cx - v,      cy + h)
        ctx.lineTo(cx - h,      cy + h)
        ctx.lineTo(cx - h,      cy + v)
        ctx.lineTo(cx - R_star, cy)
        ctx.lineTo(cx - h,      cy - v)
        ctx.lineTo(cx - h,      cy - h)
        ctx.lineTo(cx - v,      cy - h)
      } else {
        ctx.moveTo(cx - v,       cy - h)
        ctx.lineTo(cx,           cy - R_cross)
        ctx.lineTo(cx + v,       cy - h)
        ctx.lineTo(cx + h,       cy - h)
        ctx.lineTo(cx + h,       cy - v)
        ctx.lineTo(cx + R_cross, cy)
        ctx.lineTo(cx + h,       cy + v)
        ctx.lineTo(cx + h,       cy + h)
        ctx.lineTo(cx + v,       cy + h)
        ctx.lineTo(cx,           cy + R_cross)
        ctx.lineTo(cx - v,       cy + h)
        ctx.lineTo(cx - h,       cy + h)
        ctx.lineTo(cx - h,       cy + v)
        ctx.lineTo(cx - R_cross, cy)
        ctx.lineTo(cx - h,       cy - v)
        ctx.lineTo(cx - h,       cy - h)
      }
      ctx.closePath(); ctx.fill(); ctx.stroke()
    }
  }
}

function drawFishScale(ctx: Ctx, W: number, H: number) {
  const r = 18; const rowStep = r
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const rows = Math.ceil(H / rowStep) + 2
  const cols = Math.ceil(W / (r * 2)) + 2
  for (let y = rows; y >= 0; y--) for (let x = 0; x < cols; x++) {
    const off = y % 2 === 1 ? r : 0
    const cx = x * r * 2 + r + off
    const cy = (y + 0.5) * rowStep
    const l = (x + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
}

function drawTrapezoid(ctx: Ctx, W: number, H: number) {
  const s = 28; const slant = s * 0.25
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const cols = Math.ceil(W / s) + 1
  const rows = Math.ceil(H / s) + 1
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const x0 = x * s; const y0 = y * s
    const dA = x % 2 === 0 ? 0 : slant
    const dB = (x + 1) % 2 === 0 ? 0 : slant
    ctx.beginPath()
    ctx.moveTo(x0, y0 + dA)
    ctx.lineTo(x0 + s, y0 + dB)
    ctx.lineTo(x0 + s, y0 + s + dB)
    ctx.lineTo(x0, y0 + s + dA)
    ctx.closePath()
    const l = (x + y) % 3
    ctx.fillStyle = l === 0 ? FILL : l === 1 ? '#8fa3c8' : '#6e7fa8'
    ctx.strokeStyle = STROKE; ctx.lineWidth = 0.8
    ctx.fill(); ctx.stroke()
  }
}

const DRAW_FNS: Record<string, (ctx: Ctx, W: number, H: number) => void> = {
  standard:   drawSquare,
  honeycomb:  drawCircle,
  diamond:    drawDiamond,
  pentagon:   drawHexagon,
  puzzle:     drawPuzzle,
  islamic:    drawIslamic,
  'fish-scale': drawFishScale,
  trapezoid:  drawTrapezoid,
}

// ─── Pattern canvas component ─────────────────────────────────────────────────

function PatternCanvas({ id }: Readonly<{ id: string }>) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth; const H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    DRAW_FNS[id]?.(ctx, W, H)
  }, [id])
  return <canvas ref={ref} className="h-full w-full" />
}

// ─── Patterns data ────────────────────────────────────────────────────────────

const PATTERNS = [
  { id: 'standard',   label: 'Square',     tag: 'Classic',    desc: 'Clean grid layout — the universal standard for any subject or style.' },
  { id: 'honeycomb',  label: 'Circle',      tag: 'Popular',    desc: 'Staggered circular cells — soft and approachable, great for portraits.' },
  { id: 'diamond',    label: 'Diamond',     tag: 'Dynamic',    desc: 'Rotated squares add geometric energy and visual depth to the page.' },
  { id: 'pentagon',   label: 'Hexagon',     tag: 'Modern',     desc: 'Honeycomb structure — a favourite for nature scenes and macro shots.' },
  { id: 'puzzle',     label: 'Puzzle',      tag: 'Playful',    desc: 'Interlocking jigsaw pieces — turns every page into an activity.' },
  { id: 'islamic',    label: 'Islamic',     tag: 'Ornamental', desc: 'Alternating 8-pointed stars and cross tiles — striking geometric art.' },
  { id: 'fish-scale', label: 'Fish Scale',  tag: 'Textured',   desc: 'Overlapping arcs inspired by traditional Japanese koi scale patterns.' },
  { id: 'trapezoid',  label: 'Trapezoid',   tag: 'Bold',       desc: 'Zigzag columns with herringbone rhythm — architectural and distinctive.' },
]

const TAG_CLS = 'text-text-secondary bg-bg-primary/80 border-border-primary'

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturesBento() {
  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-[1180px] px-8">

        <div className="mb-14 text-center">
          <h2 className={sectionTitle}>8 mosaic patterns, one coloring book</h2>
          <p className="mt-3 text-[17px] text-text-secondary">
            Every pattern tiles perfectly at 8.5 × 11 in — switch styles per page or let Auto cycle through them all.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2">
          {PATTERNS.map((p) => (
            <div
              key={p.id}
              className={`${cardBase} group relative flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c0cde359] hover:shadow-[0_0_32px_#c0cde310]`}
            >
              {/* canvas preview — top 55% */}
              <div className="relative h-[160px] w-full shrink-0 overflow-hidden">
                <PatternCanvas id={p.id} />
                {/* tag badge */}
                <span className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${TAG_CLS}`}>
                  {p.tag}
                </span>
              </div>

              {/* info — bottom */}
              <div className="flex flex-col gap-1.5 p-4 pt-3.5">
                <div className="text-[15px] font-semibold">{p.label}</div>
                <p className="text-[12.5px] leading-[1.6] text-text-secondary">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* auto mode callout */}
        <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-[#c0cde322] bg-[#c0cde308] px-6 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#c0cde340] bg-[#c0cde31a] text-[12px] text-accent">✦</span>
          <p className="text-[14px] text-text-secondary">
            <span className="font-semibold text-white">Auto mode</span> — mix all 8 patterns across pages automatically for varied, magazine-quality coloring books.
          </p>
        </div>

        {/* KDP-safe callout */}
        <div className="mt-4 grid grid-cols-3 gap-3 max-[780px]:grid-cols-1">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              ),
              title: 'Fits inside KDP print area',
              body: 'Every converted image is automatically padded with a white border on all 4 sides, keeping artwork inside the safe zone — no content bleeds into the margin.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              ),
              title: 'Zero KDP content violations',
              body: "Mosaci never embeds trademarks, stock watermarks, or third-party copyrighted elements. What you upload is exactly what gets converted — clean output, every time.",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              ),
              title: 'Print-ready at 8.5 × 11 in',
              body: 'PDF pages are sized at exactly 8.5 × 11 in — the standard KDP interior trim — so you can upload directly without any resizing or reformatting.',
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="flex gap-3 rounded-xl border border-[#c0cde31a] bg-[#c0cde306] px-5 py-4">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#c0cde330] bg-[#c0cde312] text-accent">
                {icon}
              </span>
              <div>
                <p className="mb-1 text-[13.5px] font-semibold text-white">{title}</p>
                <p className="text-[12.5px] leading-[1.6] text-text-secondary">{body}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
