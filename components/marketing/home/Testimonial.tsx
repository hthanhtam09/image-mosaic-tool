'use client'

import { sectionTitle, Star } from './ui'

interface Review {
  handle: string
  text: string
  initials: string
}

const REVIEWS: Review[] = [
  { handle: '@jordanreyes',   initials: 'JR', text: 'I went from a folder of stock photos to a 120-page coloring book on KDP in an afternoon. Mosaci handles the part I used to dread.' },
  { handle: '@kdp_mia',       initials: 'MK', text: 'The numbered page export is pixel-perfect. My customers love how clean the final PDF looks. Worth every penny.' },
  { handle: '@artbysophie',   initials: 'SO', text: 'Tried 3 other tools before this one. Mosaci is the only one that actually nails the palette — colors feel hand-picked, not random.' },
  { handle: '@colorbook_dan', initials: 'DC', text: 'Published 6 coloring books in 2 months. The batch workflow saves me hours. This is my secret weapon for KDP low-content.' },
  { handle: '@luna_creates',  initials: 'LC', text: 'The honeycomb and diamond patterns are gorgeous. My adult coloring book audience is obsessed with the results.' },
  { handle: '@printpro_alex', initials: 'AW', text: 'Customer support is fast and the tool just keeps getting better. Best investment for my KDP business this year.' },
  { handle: '@sketchy_ruth',  initials: 'RN', text: 'I upload my own illustrations and the color-by-number output is incredibly clean. Saves me so much manual work.' },
  { handle: '@booknerd_tara', initials: 'TF', text: 'The PDF export is print-ready out of the box. No fiddling with bleed settings or margins. Just upload and go.' },
  { handle: '@kdp_marco',     initials: 'MB', text: 'Mosaci turned my travel photography into a whole series of destination coloring books. Concept to published in a weekend.' },
  { handle: '@crafty_jen',    initials: 'JL', text: 'The mosaic styles add so much variety to my catalog. Square, circle, diamond — each looks like a completely different product.' },
  { handle: '@designr_kai',   initials: 'KP', text: 'Clean UI, fast exports, beautiful output. This is what a professional tool should feel like.' },
  { handle: '@niche_nina',    initials: 'NV', text: 'I was skeptical about the auto-palette but it nailed my nature photos perfectly. The colors are so vibrant and accurate.' },
]

// split into 2 rows
const ROW1 = REVIEWS.slice(0, 6)
const ROW2 = REVIEWS.slice(6, 12)

function Card({ review }: { review: Review }) {
  return (
    <div className="w-[320px] shrink-0 rounded-2xl border border-border-primary bg-bg-secondary p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#c0cde34d] bg-[var(--grad)] text-[12px] font-semibold text-[#121212]">
          {review.initials}
        </span>
        <div>
          <div className="text-[13px] font-semibold">{review.handle}</div>
          <div className="flex gap-0.5 text-accent">
            {Array.from({ length: 5 }).map((_, i) => <Star key={i} />)}
          </div>
        </div>
      </div>
      <p className="text-[14px] leading-[1.6] text-text-secondary">{review.text}</p>
    </div>
  )
}

function MarqueeRow({ reviews, reverse }: { reviews: Review[]; reverse?: boolean }) {
  // duplicate for seamless loop
  const items = [...reviews, ...reviews]
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className="flex gap-4"
        style={{
          width: 'max-content',
          animation: `marquee${reverse ? '-reverse' : ''} ${reviews.length * 6}s linear infinite`,
        }}
      >
        {items.map((r, i) => <Card key={`${r.handle}-${i}`} review={r} />)}
      </div>
    </div>
  )
}

export default function Testimonial() {
  return (
    <section className="py-24">
      <style>{`
        @keyframes marquee         { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes marquee-reverse { from { transform: translateX(-50%) } to { transform: translateX(0) } }
      `}</style>

      <div className="mb-12 text-center">
        <h2 className={sectionTitle}>Loved by KDP creators</h2>
        <p className="mt-3 text-[17px] text-text-secondary">
          Join thousands of authors publishing coloring books with Mosaci.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <MarqueeRow reviews={ROW1} />
        <MarqueeRow reviews={ROW2} reverse />
      </div>
    </section>
  )
}
