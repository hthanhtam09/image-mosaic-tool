'use client'

import { useEffect, useState } from 'react'

// Each tile pops up in sequence: top-left → top-right → bottom-left → bottom-right
const TILES = [
  { delay: '0s',     opacity: 1    },
  { delay: '0.2s',   opacity: 0.5  },
  { delay: '0.4s',   opacity: 0.5  },
  { delay: '0.6s',   opacity: 1    },
]

export default function PageLoader() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const dismiss = () => {
      setFading(true)
      setTimeout(() => setVisible(false), 500)
    }
    if (document.readyState === 'complete') {
      dismiss()
    } else {
      window.addEventListener('load', dismiss, { once: true })
      const fallback = setTimeout(dismiss, 3000)
      return () => { clearTimeout(fallback); window.removeEventListener('load', dismiss) }
    }
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes mosaic-pop {
          0%,100% { transform: scale(1); filter: brightness(1); }
          30%      { transform: scale(1.35) translateY(-2px); filter: brightness(1.4); }
          60%      { transform: scale(1); filter: brightness(1); }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
          background: '#121212',
          transition: 'opacity 0.5s ease',
          opacity: fading ? 0 : 1,
          pointerEvents: fading ? 'none' : 'auto',
        }}
      >
        {/* logo tile */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
          gap: 5, width: 44, height: 44,
          borderRadius: 11, border: '1px solid rgba(192,205,227,0.25)',
          background: 'rgba(192,205,227,0.10)', padding: 7,
        }}>
          {TILES.map((t) => (
            <i key={t.delay} style={{
              display: 'block', borderRadius: 3,
              background: '#c0cde3',
              opacity: t.opacity,
              animation: `mosaic-pop 1.6s ease-in-out ${t.delay} infinite`,
            }} />
          ))}
        </div>
      </div>
    </>
  )
}
