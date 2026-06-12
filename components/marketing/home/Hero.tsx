import Link from 'next/link'
import type { CSSProperties } from 'react'

const floatTiles: CSSProperties[] = [
  { '--rot': '-8deg', width: 64, height: 64, top: '18%', left: '12%', animationDelay: '0s' } as CSSProperties,
  { '--rot': '12deg', width: 46, height: 46, top: '26%', right: '14%', animationDelay: '-3s' } as CSSProperties,
  { '--rot': '5deg', width: 80, height: 80, bottom: '30%', left: '8%', animationDelay: '-6s' } as CSSProperties,
  { '--rot': '-14deg', width: 54, height: 54, bottom: '24%', right: '10%', animationDelay: '-9s' } as CSSProperties,
]

export default function Hero() {
  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(#ffffff09_1px,transparent_1px)] bg-[length:24px_24px] pb-[60px] pt-20">
      <div className="glow hero-glow-1" />
      <div className="glow hero-glow-2" />
      {floatTiles.map((style, i) => (
        <div key={i} className="float-tile animate-drift" style={style} />
      ))}

      <div className="animate-rise relative z-[2] w-full max-w-[1100px] px-8 text-center">
        <h1 className="mx-auto mb-[18px] mt-[22px] max-w-[880px] text-[clamp(40px,5.5vw,60px)] font-bold leading-[1.08] tracking-[-0.02em]">
          Turn any image into a <br />
          <span className="bg-[linear-gradient(135deg,#c0cde3,#8fa3c8)] bg-clip-text text-transparent">
            Color by number book
          </span>
          <br />
          in seconds.
        </h1>
        <p className="mx-auto text-lg text-text-secondary">
          Upload, pick a mosaic style, export a print-ready PDF. Built for KDP creators.
        </p>
        <div className="mx-auto mb-3 mt-7 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-primary btn-lg" href="/studio/projects">
            Start Creating →
          </Link>
          <button className="btn btn-ghost btn-lg" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>{' '}
            Watch demo
          </button>
        </div>
        <p className="text-[13px] text-text-secondary">No credit card · 5 free exports/month</p>
      </div>

      <div className="animate-rise relative z-[2] mx-auto mt-12 w-full max-w-[980px]" style={{ animationDelay: '.1s' }}>
        <div className="overflow-hidden rounded-2xl border border-border-primary bg-bg-secondary shadow-[var(--shadow),0_0_80px_#c0cde30f]">
          <div className="flex h-[38px] items-center gap-2 border-b border-border-primary bg-[#161616] px-3.5">
            <span className="flex gap-[7px]">
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
            </span>
            <span className="flex h-[22px] flex-1 items-center rounded-md border border-border-primary bg-bg-primary px-2.5 font-mono text-[11px] text-text-secondary">
              mosaci.app/tools
            </span>
          </div>
          <div className="ws-shot grid min-h-[720px] grid-cols-[1fr_240px]">
            <div className="ws-canvas flex items-center justify-center bg-bg-primary p-6">
              <div className="convert-demo" id="convertDemo">
                <canvas className="cd-layer cd-photo block h-full w-full" id="cdPhoto" />
                <canvas className="cd-layer cd-mosaic block h-full w-full" id="cdUncolored" />
                <canvas className="cd-layer cd-mosaic block h-full w-full" id="cdMosaic" />
                <div className="cd-scan" id="cdScan" />
                <span
                  id="cdTagL"
                  className="cd-tag cd-tag-l absolute left-3 top-3 z-[4] whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-accent backdrop-blur-[4px]"
                >
                  SOURCE PHOTO
                </span>
                <span
                  id="cdTagR"
                  className="cd-tag cd-tag-r absolute right-3 top-3 z-[4] whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-white backdrop-blur-[4px] opacity-0"
                >
                  SOURCE PHOTO
                </span>
                <div className="absolute bottom-3 left-3 z-[4] inline-flex items-center gap-2 rounded-full border border-[#c0cde340] bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-[6px]">
                  <span className="cd-pulse" /> <span id="cdStage">Converting</span>{' '}
                  <span className="font-mono text-accent" id="cdPct">
                    55
                  </span>
                  %
                </div>
              </div>
            </div>
            <div className="ws-side flex flex-col border-l border-border-primary bg-bg-secondary p-[22px]">
              <div className="mb-3 text-[11px] uppercase tracking-[0.05em] text-text-secondary">
                Palette · 16 colors
              </div>
              <div id="cdPalette" className="min-h-0 flex-1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
