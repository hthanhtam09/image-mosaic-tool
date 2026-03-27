"use client";

import { generateColorLegend } from "@/lib/paintByNumbers/drawPBN";
import { downloadPNG, downloadPDF } from "@/lib/paintByNumbers/exportImage";

interface ExportControlsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  palette: [number, number, number][];
  fileName: string | null;
}

export default function ExportControls({ canvasRef, palette, fileName }: ExportControlsProps) {
  const baseName = fileName?.replace(/\.[^/.]+$/, "") || "paint-by-numbers";
  const legend = generateColorLegend(palette);

  const handlePNG = () => {
    if (!canvasRef.current) return;
    downloadPNG(canvasRef.current, legend, `${baseName}_pbn.png`);
  };

  const handlePDF = () => {
    if (!canvasRef.current) return;
    downloadPDF(canvasRef.current, legend, `${baseName}_pbn.pdf`);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Export
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handlePNG}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium
            bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
            hover:bg-emerald-500/20 hover:border-emerald-500/40
            transition-all active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PNG
        </button>

        <button
          onClick={handlePDF}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium
            bg-rose-500/10 text-rose-400 border border-rose-500/20
            hover:bg-rose-500/20 hover:border-rose-500/40
            transition-all active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          PDF
        </button>
      </div>
    </div>
  );
}
