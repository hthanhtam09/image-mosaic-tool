"use client";

import type { PBNAlgorithm, PBNViewMode } from "@/store/usePaintByNumbersStore";

interface ConfigPanelProps {
  numColors: number;
  algorithm: PBNAlgorithm;
  minRegionSize: number;
  outlineThickness: number;
  fontSize: number;
  viewMode: PBNViewMode;
  maxImageSize: number;
  isProcessing: boolean;
  hasImage: boolean;
  hasResults: boolean;
  onNumColorsChange: (n: number) => void;
  onAlgorithmChange: (a: PBNAlgorithm) => void;
  onMinRegionSizeChange: (n: number) => void;
  onOutlineThicknessChange: (n: number) => void;
  onFontSizeChange: (n: number) => void;
  onViewModeChange: (m: PBNViewMode) => void;
  onMaxImageSizeChange: (n: number) => void;
  onProcess: () => void;
}

export default function ConfigPanel({
  numColors,
  algorithm,
  minRegionSize,
  outlineThickness,
  fontSize,
  viewMode,
  maxImageSize,
  isProcessing,
  hasImage,
  hasResults,
  onNumColorsChange,
  onAlgorithmChange,
  onMinRegionSizeChange,
  onOutlineThicknessChange,
  onFontSizeChange,
  onViewModeChange,
  onMaxImageSizeChange,
  onProcess,
}: ConfigPanelProps) {
  return (
    <div className="space-y-5">


      {/* View Mode Toggle */}
      <div>
        <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
          View Mode
        </label>
        <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
          {(["preview", "print"] as PBNViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`
                py-2.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5
                ${
                  viewMode === mode
                    ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }
              `}
            >
              {mode === "preview" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Color
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={onProcess}
        disabled={!hasImage || isProcessing}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-sm transition-all
          flex items-center justify-center gap-2
          ${
            !hasImage || isProcessing
              ? "bg-white/5 text-[var(--text-muted)] cursor-not-allowed"
              : "bg-gradient-to-r from-[var(--accent)] to-cyan-400 text-[var(--bg-primary)] hover:shadow-lg hover:shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98]"
          }
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : hasResults ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Re-process
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Convert
          </>
        )}
      </button>
    </div>
  );
}
