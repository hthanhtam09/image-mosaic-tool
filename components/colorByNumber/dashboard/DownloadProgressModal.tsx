"use client";

import React from "react";

interface ProgressState {
  current: number;
  total: number;
}

interface DownloadProgressModalProps {
  isOpen: boolean;
  type: "pdf" | "zip" | "before-after-zip" | null;
  progress: ProgressState;
}

export default function DownloadProgressModal({
  isOpen,
  type,
  progress,
}: DownloadProgressModalProps) {
  if (!isOpen || !type) return null;

  const percent = progress.total
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;

  let title = "Exporting...";
  let subtitle = "Please wait while we process your request.";
  let statusText = "";

  if (type === "pdf") {
    title = percent === 100 ? "Finalizing PDF..." : "Generating Book PDF...";
    subtitle =
      percent === 100
        ? "Compressing and saving file structure. This might take a few seconds."
        : "Processing high-quality vectors. Please keep this window open.";
    statusText = `Page ${progress.current} of ${progress.total}`;
  } else if (type === "zip") {
    title = percent === 100 ? "Compressing ZIP..." : "Packaging ZIP Archive...";
    subtitle =
      percent === 100
        ? "Generating ZIP download file. This may take a moment."
        : "Assembling converted coloring sheets and solution images.";
    statusText = `Image ${progress.current} of ${progress.total}`;
  } else if (type === "before-after-zip") {
    title = percent === 100 ? "Compressing ZIP..." : "Preparing Before/After Images...";
    subtitle =
      percent === 100
        ? "Generating ZIP download file. This may take a moment."
        : "Auto-generating split comparison layouts for your folder.";
    statusText = `Processing ${progress.current} of ${progress.total}`;
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-[100] transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-2xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Connecting background grid lines for visual premium feel */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--text-primary) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Progress Circular Animation */}
          <div className="relative w-24 h-24 mb-6">
            <svg className="w-full h-full text-white/5" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
            </svg>
            <svg
              className="w-full h-full absolute inset-0 text-[var(--accent)] drop-shadow-md origin-center -rotate-90 transition-all duration-300"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * percent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-white">
              {percent}%
            </div>
          </div>

          <h2 className="text-lg font-bold text-white mb-2 text-center tracking-tight">
            {title}
          </h2>
          <p className="text-white/60 text-center text-xs leading-relaxed mb-6 max-w-[280px]">
            {subtitle}
          </p>

          {progress.total > 0 && (
            <div className="w-full max-w-[280px] flex justify-between text-[11px] text-white/40 mb-1 font-mono font-semibold">
              <span>Progress</span>
              <span>{statusText}</span>
            </div>
          )}

          {/* Styled Horizontal Loading Track */}
          <div className="w-full max-w-[280px] h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
