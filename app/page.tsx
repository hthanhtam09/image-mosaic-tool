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
import AccessModal from "@/components/AccessModal";
import Dashboard from "@/components/colorByNumber/Dashboard";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";

export default function Home() {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const { isPaletteVisible } = useColorByNumberStore();

  useEffect(() => {
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth - 288,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      <AccessModal />
      
      {/* Main Content Area: Dashboard */}
      <section className="relative flex-1 h-full overflow-hidden">
        <Dashboard /> {/* Dashboard handles grid/preview/modal internally */}
      </section>
    </main>
  );
}
