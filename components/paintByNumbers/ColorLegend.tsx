"use client";

interface ColorLegendProps {
  palette: [number, number, number][];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function ColorLegend({ palette }: ColorLegendProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Color Legend ({palette.length} colors)
      </h3>

      <div className="grid grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
        {palette.map((color, i) => {
          const hex = rgbToHex(color[0], color[1], color[2]);
          const lum = getLuminance(color[0], color[1], color[2]);
          const textColor = lum > 128 ? "#000000" : "#ffffff";

          return (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
            >
              {/* Color swatch */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm border border-white/10 group-hover:scale-110 transition-transform"
                style={{
                  backgroundColor: hex,
                  color: textColor,
                }}
              >
                {i + 1}
              </div>

              {/* Color info */}
              <div className="min-w-0">
                <span className="text-xs font-mono text-[var(--text-primary)] block truncate">
                  {hex.toUpperCase()}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {color[0]}, {color[1]}, {color[2]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
