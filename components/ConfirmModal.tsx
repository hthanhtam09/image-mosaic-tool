'use client'

import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mb-6 text-sm text-[var(--text-muted)]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md px-4 py-2 text-sm font-semibold bg-[var(--error)] text-white hover:opacity-90 transition-opacity"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
