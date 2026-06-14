'use client'

import { useRef, useEffect, useState } from 'react'

/**
 * Cache for expensive computations in BookDesignConfigStep
 * Survives component unmount/remount using a Map stored outside React
 */
const designConfigCache = new Map<string, {
  colors: string[]
  timestamp: number
}>()

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export function useDesignConfigCache() {
  const cacheRef = useRef(designConfigCache)

  // Cleanup old cache entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of cacheRef.current.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cacheRef.current.delete(key)
        }
      }
    }, 5 * 60 * 1000) // Check every 5 minutes

    return () => clearInterval(cleanup)
  }, [])

  const getCachedColors = (cacheKey: string) => {
    return cacheRef.current.get(cacheKey)?.colors
  }

  const setCachedColors = (cacheKey: string, colors: string[]) => {
    cacheRef.current.set(cacheKey, {
      colors,
      timestamp: Date.now(),
    })
  }

  const clearCache = (cacheKey?: string) => {
    if (cacheKey) {
      cacheRef.current.delete(cacheKey)
    } else {
      cacheRef.current.clear()
    }
  }

  return {
    getCachedColors,
    setCachedColors,
    clearCache,
  }
}
