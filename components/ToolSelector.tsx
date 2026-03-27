"use client";

interface ToolSelectorProps {
  onSelectMosaic: () => void;
  onSelectPBN: () => void;
}

export default function ToolSelector({ onSelectMosaic, onSelectPBN }: ToolSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Choose your tool
        </div>
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
          Image Converter Studio
        </h1>
        <p className="text-lg text-[var(--text-muted)] max-w-md mx-auto">
          Transform your images with professional-grade conversion tools
        </p>
      </div>

      {/* Tool Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Mosaic / Color by Number */}
        <button
          onClick={onSelectMosaic}
          className={`group relative bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 text-left
            hover:border-[var(--accent)]/40 hover:shadow-2xl hover:shadow-[var(--accent)]/5
            transition-all duration-500 hover:-translate-y-1`}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20 group-hover:scale-110 group-hover:shadow-cyan-500/40 transition-all duration-300">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
              Color by Number Mosaic
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Convert images into pixelated mosaic patterns with numbered cells. 
              Supports 8 grid types including squares, circles, puzzles & more.
            </p>

            <div className="flex flex-wrap gap-2">
              {["Square", "Circle", "Puzzle", "Diamond"].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                >
                  {tag}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-[var(--text-muted)] border border-white/10">
                +4 more
              </span>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="absolute top-8 right-8 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        {/* Paint by Numbers */}
        <button
          onClick={onSelectPBN}
          className={`group relative bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 text-left
            hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/5
            transition-all duration-500 hover:-translate-y-1`}
        >
          {/* Glow effect on hover */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 group-hover:scale-110 group-hover:shadow-purple-500/40 transition-all duration-300">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-purple-400 transition-colors">
              Paint by Numbers
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              Transform photos into coloring book pages with numbered regions 
              and a color palette legend. Perfect for printable art.
            </p>

            <div className="flex flex-wrap gap-2">
              {["Outlines", "Numbered", "Printable"].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"
                >
                  {tag}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/5 text-[var(--text-muted)] border border-white/10">
                NEW
              </span>
            </div>
          </div>

          {/* Arrow indicator */}
          <div className="absolute top-8 right-8 text-[var(--text-muted)] group-hover:text-purple-400 group-hover:translate-x-1 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>
      </div>

      {/* Footer hint */}
      <p className="relative z-10 mt-10 text-xs text-[var(--text-muted)]/60">
        You can switch between tools at any time
      </p>
    </div>
  );
}
