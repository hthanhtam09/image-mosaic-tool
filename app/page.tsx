/**
 * Color by Number – Tô màu theo số
 *
 * Interactive coloring app with three grid patterns:
 * - Honeycomb (circles, staggered rows)
 * - Diamond (45° rotated)
 * - Standard (square grid)
 */

"use client";

import { useEffect, useState } from "react";
import ColorByNumberToolbar from "@/components/colorByNumber/ColorByNumberToolbar";
import ColorByNumberGrid from "@/components/colorByNumber/ColorByNumberGrid";
import ColorByNumberPalette from "@/components/colorByNumber/ColorByNumberPalette";

export default function Home() {
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (typeof window === "undefined") return;
      const main = document.querySelector("main.color-by-number-main");
      if (main) {
        const rect = main.getBoundingClientRect();
        setViewportSize({
          width: Math.max(100, rect.width),
          height: Math.max(100, rect.height),
        });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    const main = document.querySelector("main.color-by-number-main");
    if (main) ro.observe(main);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <ColorByNumberToolbar />

      <main className="color-by-number-main flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <ColorByNumberGrid
            viewportWidth={viewportSize.width}
            viewportHeight={viewportSize.height}
          />
        </div>
        <ColorByNumberPalette />
      </main>
    </div>
  );
}
