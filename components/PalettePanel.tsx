'use client';

/**
 * PalettePanel Component
 *
 * Minimal color palette display with clean swatches.
 */

import { useEditorStore } from '@/store/useEditorStore';
import { rgbToHex, paletteIndexToLabel, isWhite } from '@/lib/utils';
import { getPaletteColorName } from '@/lib/palette';

export default function PalettePanel() {
  const { palette, fixedPaletteIndices, originalImage } = useEditorStore();

  if (!originalImage || palette.length === 0) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Color Palette
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {palette.length} colors (from image)
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {palette.map((color, index) => {
            const hex = rgbToHex(color);
            const label = isWhite(color) ? "" : paletteIndexToLabel(index);
            const name = getPaletteColorName(fixedPaletteIndices[index] ?? index);
            return (
              <div
                key={index}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className="relative">
                  <div
                    className="h-12 w-12 rounded-lg border border-[var(--border-subtle)] transition-transform hover:scale-105"
                    style={{
                      backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                    }}
                    title={name ? `${label ? `${label} ` : ""}${name}: ${hex}` : `${label || "—"}: ${hex}`}
                  />
                  {label ? (
                    <span
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bg-elevated)] px-1.5 text-[10px] font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border-default)]"
                      aria-label={name ? `Color ${label} ${name}` : `Color ${label}`}
                    >
                      {label}
                    </span>
                  ) : null}
                </div>
                <span className="max-w-[4.5rem] truncate text-center text-[10px] text-[var(--text-muted)]" title={name || hex}>
                  {name || hex}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Export the palette and numbered template from the sidebar for
          color-by-number projects.
        </p>
      </div>
    </div>
  );
}
