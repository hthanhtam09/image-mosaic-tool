import Link from 'next/link'

export default function FinalCta() {
  return (
    <section className="pb-28 pt-4">
      <div className="mx-auto w-full max-w-[1100px] px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#c0cde328] bg-bg-secondary">
          {/* background glow */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2"
              style={{
                width: 800,
                height: 400,
                background: 'radial-gradient(ellipse at 50% 0%, #c0cde322 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute -bottom-20 left-1/4"
              style={{
                width: 400,
                height: 300,
                background: 'radial-gradient(circle, #8fa3c818 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute -bottom-20 right-1/4"
              style={{
                width: 400,
                height: 300,
                background: 'radial-gradient(circle, #c0cde314 0%, transparent 70%)',
              }}
            />
          </div>

          {/* top border accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#c0cde355_40%,#c0cde355_60%,transparent)]" />

          <div className="relative z-[2] px-10 py-20 text-center">
            {/* eyebrow */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c0cde330] bg-[#c0cde30d] px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-[12px] font-medium tracking-[0.06em] text-accent uppercase">Free to start</span>
            </div>

            {/* heading */}
            <h2 className="mx-auto mb-4 max-w-[680px] text-[clamp(32px,4.5vw,52px)] font-bold leading-[1.08] tracking-[-0.02em]">
              Turn your photos into{' '}
              <span className="bg-[linear-gradient(135deg,#c0cde3,#8fa3c8)] bg-clip-text text-transparent">
                coloring books
              </span>{' '}
              that sell
            </h2>

            <p className="mx-auto mb-10 max-w-[500px] text-[17px] leading-relaxed text-text-secondary">
              No design skills needed. Upload a photo, pick a style, export a print-ready PDF — ready for KDP in
              minutes.
            </p>

            {/* CTAs */}
            <div className="mb-14 flex flex-wrap justify-center gap-3">
              <Link className="btn btn-primary btn-lg" href="/studio/projects">
                Start for free →
              </Link>
              <Link className="btn btn-ghost btn-lg" href="/pricing">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
