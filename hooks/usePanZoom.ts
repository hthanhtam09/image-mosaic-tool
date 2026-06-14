'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ViewState {
  zoom: number
  x: number
  y: number
}

export interface UsePanZoomOptions {
  /** Initial zoom level (default 0.82) */
  initialZoom?: number
  minZoom?: number
  maxZoom?: number
  /** Called once on mount to compute initial offset (and optionally override zoom) */
  getInitialOffset?: (containerW: number, containerH: number, zoom?: number) => { x: number; y: number; zoom?: number }
  /** Zoom factor per wheel tick (default 1.08) */
  wheelFactor?: number
}

export interface UsePanZoomReturn {
  viewState: ViewState
  isDragging: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  commitView: (v: ViewState) => void
  zoomBy: (factor: number) => void
  zoomFit: () => void
  /** Attach to the container div */
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: () => void
    onPointerLeave: () => void
  }
}

export function usePanZoom(opts: UsePanZoomOptions = {}): UsePanZoomReturn {
  const {
    initialZoom = 0.82,
    minZoom = 0.1,
    maxZoom = 8,
    getInitialOffset,
    wheelFactor = 1.08,
  } = opts

  const [viewState, setViewState] = useState<ViewState>({ zoom: initialZoom, x: 0, y: 0 })
  const vsRef = useRef<ViewState>({ zoom: initialZoom, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const commitView = useCallback((v: ViewState) => {
    vsRef.current = v
    setViewState(v)
  }, [])

  // Initial offset on mount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const offset = getInitialOffset
      ? getInitialOffset(width, height, initialZoom)
      : { x: width * (1 - initialZoom) / 2, y: 0 }
    const zoom = offset.zoom ?? initialZoom
    const v = { zoom, x: offset.x, y: offset.y }
    vsRef.current = v
    setViewState(v)
  // run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Native wheel → zoom toward cursor
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { zoom: z, x, y } = vsRef.current
      const factor = e.deltaY < 0 ? wheelFactor : 1 / wheelFactor
      const newZoom = Math.min(Math.max(z * factor, minZoom), maxZoom)
      commitView({
        zoom: newZoom,
        x: cx - (cx - x) * (newZoom / z),
        y: cy - (cy - y) * (newZoom / z),
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [commitView, minZoom, maxZoom, wheelFactor])

  // Zoom toward container centre
  const zoomBy = useCallback((factor: number) => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const cx = width / 2
    const cy = height / 2
    const { zoom: z, x, y } = vsRef.current
    const newZoom = Math.min(Math.max(z * factor, minZoom), maxZoom)
    commitView({ zoom: newZoom, x: cx - (cx - x) * (newZoom / z), y: cy - (cy - y) * (newZoom / z) })
  }, [commitView, minZoom, maxZoom])

  // Fit content in view (reset to initial zoom & centre)
  const zoomFit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const offset = getInitialOffset
      ? getInitialOffset(width, height, initialZoom)
      : { x: width * (1 - initialZoom) / 2, y: 0 }
    const zoom = offset.zoom ?? initialZoom
    commitView({ zoom, x: offset.x, y: offset.y })
  }, [commitView, initialZoom, getInitialOffset])

  // Pointer drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mx: e.clientX, my: e.clientY, ox: vsRef.current.x, oy: vsRef.current.y }
    setIsDragging(true)
  }, [])

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

  return {
    viewState,
    isDragging,
    containerRef,
    commitView,
    zoomBy,
    zoomFit,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
    },
  }
}
