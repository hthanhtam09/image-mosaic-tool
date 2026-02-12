/**
 * Main Application Page
 *
 * Professional dark theme layout:
 * - Left: Control Panel (sidebar)
 * - Right: Canvas Preview + Palette Panel
 */

import ControlPanel from '@/components/ControlPanel';
import CanvasPreview from '@/components/CanvasPreview';
import PalettePanel from '@/components/PalettePanel';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar - Control Panel */}
      <ControlPanel />

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <CanvasPreview />
        </div>
        <PalettePanel />
      </main>
    </div>
  );
}
