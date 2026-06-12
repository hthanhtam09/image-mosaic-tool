'use client'

import type { ToolAccess } from '@/lib/tools/access'
import { useCallback, useState } from 'react'

export type GateNotice = {
  title: string
  message: string
  href: string
  action: string
}

export function useAccessGate(access: ToolAccess) {
  const [gateNotice, setGateNotice] = useState<GateNotice | null>(null)

  const showLoginGate = useCallback(
    (message: string) =>
      setGateNotice({ title: 'Sign in required', message, href: '/login?redirectTo=/tools/projects', action: 'Sign in' }),
    []
  )

  const showProGate = useCallback(
    (message: string) =>
      setGateNotice({ title: 'Upgrade required', message, href: '/pricing', action: 'Upgrade' }),
    []
  )

  const requestPaidAccess = useCallback(
    (message: string) => {
      if (access.isGuest) showLoginGate(message)
      else showProGate(message)
    },
    [access.isGuest, showLoginGate, showProGate]
  )

  return { gateNotice, setGateNotice, requestPaidAccess }
}
