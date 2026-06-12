'use client'

import { Toaster as SonnerToaster } from 'sonner'

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          fontSize: '0.875rem',
        },
      }}
    />
  )
}
