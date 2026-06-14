'use client'

import { ReactNode, useRef, useEffect, useState } from 'react'

/**
 * StepContainer - Wraps a step content and manages visibility
 * Keeps the step mounted (not removed from DOM) but hides it to prevent re-renders when switching steps
 * Uses a div with display:none instead of conditional rendering
 */
export function StepContainer({
  isActive,
  children,
}: {
  isActive: boolean
  children: ReactNode
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Mount the component on first render
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  // Keep component in DOM but hide it when not active
  // This prevents unmounting and preserves internal state
  return (
    <div
      style={{
        display: isActive ? 'flex' : 'none',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
      role={isActive ? undefined : 'presentation'}
      aria-hidden={!isActive}
    >
      {children}
    </div>
  )
}
