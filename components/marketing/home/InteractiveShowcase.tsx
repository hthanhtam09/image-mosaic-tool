'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sectionTitle } from './ui'
import originImg from '@/app/assets/img/origin.png'
import uncoloredImg from '@/app/assets/img/uncolored.png'
import coloredImg from '@/app/assets/img/colored.png'

const opt = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=1200&q=75`
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

const SWEEP_MS  = 4000
const HOLD_MS   = 1500
const RESUME_MS = 3000

interface SliderProps {
  readonly id: string
  readonly leftLabel: string
  readonly rightLabel: string
  readonly leftSrc: string
  readonly rightSrc: string
  readonly active: boolean
  readonly onSweepDone: () => void
}

function Slider({ id, leftLabel, rightLabel, leftSrc, rightSrc, active, onSweepDone }: SliderProps) {
  const sliderRef   = useRef<HTMLDivElement>(null)
  const topRef      = useRef<HTMLDivElement>(null)
  const handleRef   = useRef<HTMLDivElement>(null)
  const posRef      = useRef(0)
  const rafRef      = useRef(0)
  const t0Ref       = useRef<number | null>(null)
  const pausedRef   = useRef(false)
  const doneRef     = useRef(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDoneRef   = useRef(onSweepDone)
  useEffect(() => {
    onDoneRef.current = onSweepDone
  }, [onSweepDone])

  const applyPos = useCallback((p: number) => {
    posRef.current = p
    if (handleRef.current) handleRef.current.style.left = p * 100 + '%'
    if (topRef.current)    topRef.current.style.clipPath = `inset(0 0 0 ${p * 100}%)`
  }, [])

  // auto-play: start fresh whenever this slider becomes active
  useEffect(() => {
    if (!active) return
    applyPos(0)
    doneRef.current  = false
    pausedRef.current = false
    t0Ref.current    = null

    const tick = (ts: number) => {
      if (pausedRef.current || doneRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      if (t0Ref.current === null) t0Ref.current = ts
      const raw = Math.min((ts - t0Ref.current) / SWEEP_MS, 1)
      applyPos(ease(raw))
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        doneRef.current = true
        doneTimer.current = setTimeout(() => onDoneRef.current(), HOLD_MS)
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (doneTimer.current)   clearTimeout(doneTimer.current)
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [active, applyPos])

  // drag + click — always attached
  useEffect(() => {
    const slider = sliderRef.current
    const handle = handleRef.current
    if (!slider || !handle) return
    let dragging = false

    const setFromX = (x: number) => {
      const r = slider.getBoundingClientRect()
      applyPos(Math.max(0, Math.min(1, (x - r.left) / r.width)))
    }
    const onDown = (e: PointerEvent) => {
      dragging = true
      pausedRef.current = true
      doneRef.current   = false
      if (doneTimer.current)   clearTimeout(doneTimer.current)
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
      slider.setPointerCapture(e.pointerId)
      setFromX(e.clientX)
    }
    const onUp = () => {
      if (!dragging) return
      dragging = false
      resumeTimer.current = setTimeout(() => {
        const elapsed = posRef.current * SWEEP_MS
        t0Ref.current = performance.now() - elapsed
        pausedRef.current = false
      }, RESUME_MS)
    }
    const onMove = (e: PointerEvent) => { if (dragging) setFromX(e.clientX) }

    slider.addEventListener('pointerdown', onDown)
    slider.addEventListener('pointermove', onMove)
    slider.addEventListener('pointerup', onUp)
    slider.addEventListener('pointercancel', onUp)
    return () => {
      slider.removeEventListener('pointerdown', onDown)
      slider.removeEventListener('pointermove', onMove)
      slider.removeEventListener('pointerup', onUp)
      slider.removeEventListener('pointercancel', onUp)
    }
  }, [applyPos])

  const tagCls =
    'absolute top-4 z-2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 font-mono text-[11px] tracking[0.04em] backdrop-blur-xs'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={
          'h-2 w-2 rounded-full transition-colors duration-500 ' +
          (active ? 'bg-accent' : 'bg-border-primary')
        } />
        <span className="text-[13px] font-medium text-text-secondary">
          {leftLabel} <span className="text-accent">→</span> {rightLabel}
        </span>
      </div>

      <div
        ref={sliderRef}
        id={id}
        className="relative w-full overflow-hidden rounded-2xl border border-border-primary bg-bg-secondary shadow-[0_0_60px_#c0cde30a]"
        style={{ aspectRatio: '8.5 / 11', userSelect: 'none', touchAction: 'none' }}
      >
        <img src={opt(leftSrc)}  alt={leftLabel}  className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div ref={topRef} className="absolute inset-0" style={{ clipPath: 'inset(0 0 0 0%)' }}>
          <img src={opt(rightSrc)} alt={rightLabel} className="h-full w-full object-cover" draggable={false} />
        </div>
        <div
          ref={handleRef}
          className="absolute top-0 bottom-0 z-3 cursor-ew-resize"
          style={{ left: '0%', width: 2, background: 'var(--accent)', boxShadow: '0 0 18px 3px #c0cde38c' }}
        >
          {/* invisible hit-area — 44px wide, centered on the line */}
          <div className="absolute inset-y-0 -left-[21px] w-11" />
          <div
            className="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-base font-bold"
            style={{ background: 'var(--accent)', color: '#121212', boxShadow: '0 0 24px 4px #c0cde359' }}
          >
            ⇆
          </div>
        </div>
        <span className={`${tagCls} left-4 text-accent`}>{leftLabel}</span>
        <span className={`${tagCls} right-4 text-white`}>{rightLabel}</span>
      </div>
    </div>
  )
}

export default function InteractiveShowcase() {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-[1100px] px-8">
        <div className="mb-12 text-center">
          <h2 className={sectionTitle}>From photo to color by number</h2>
          <p className="mt-3 text-[17px] text-text-secondary">
            Watch the conversion — or drag to explore each stage.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <Slider
            id="baSlider1"
            leftLabel="SOURCE PHOTO"
            rightLabel="NUMBERED PAGE"
            leftSrc={originImg.src}
            rightSrc={uncoloredImg.src}
            active={activeIdx === 0}
            onSweepDone={() => setActiveIdx(1)}
          />
          <Slider
            id="baSlider2"
            leftLabel="COLORED PAGE"
            rightLabel="NUMBERED PAGE"
            leftSrc={coloredImg.src}
            rightSrc={uncoloredImg.src}
            active={activeIdx === 1}
            onSweepDone={() => setActiveIdx(0)}
          />
        </div>
      </div>
    </section>
  )
}
