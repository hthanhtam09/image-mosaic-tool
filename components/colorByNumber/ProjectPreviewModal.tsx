"use client";

import {
  useColorByNumberStore,
  useActiveProject,
  type Project,
} from "@/store/useColorByNumberStore";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  canvasToDpiPngDataUrl,
  exportDotCodeMagnifierToCanvas,
  exportToCanvas,
} from "@/lib/colorByNumber";
import { getThemeById } from "@/lib/colorByNumber/themes";
import { shouldShowCodes, shouldUseTightCrop } from "@/lib/colorByNumber/objectFocus";

interface ProjectPreviewModalProps {
  projectId: string;
  projects: Project[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvasToDpiPngDataUrl(canvas);
  a.click();
};

interface PreviewSet {
  originUrl: string;
  uncolorUrl: string;
  colorUrl: string;
}

export default function ProjectPreviewModal({
  projectId,
  projects,
  onClose,
  onNavigate,
}: ProjectPreviewModalProps) {
  const { setActiveProject, setZoom, setPan, removeProject, globalShowNumbers, globalCellSize, globalTheme } =
    useColorByNumberStore();

  const navigable = projects
    .filter((p) => p.status === "completed")
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  const idx = navigable.findIndex((p) => p.id === projectId);
  const hasPrev = idx > 0;
  const hasNext = idx < navigable.length - 1;

  const goNext = useCallback(() => { if (hasNext) onNavigate(navigable[idx + 1].id); }, [hasNext, idx, navigable, onNavigate]);
  const goPrev = useCallback(() => { if (hasPrev) onNavigate(navigable[idx - 1].id); }, [hasPrev, idx, navigable, onNavigate]);

  useEffect(() => {
    setActiveProject(projectId);
    setZoom(1);
    setPan(0, 0);
    return () => setActiveProject(null);
  }, [projectId, setActiveProject, setZoom, setPan]);

  const activeProject = useActiveProject();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goNext, goPrev]);

  const [previews, setPreviews] = useState<PreviewSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // zoom: fraction of natural size, null = fit
  const [zoom, setZoomLocal] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setZoomLocal(null);
    setPreviews(null);
  }, [projectId]);

  useEffect(() => {
    if (!activeProject?.data) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      setIsGenerating(true);
      setTimeout(() => {
        if (cancelled) return;
        const theme = getThemeById(globalTheme);
        const showCodes = shouldShowCodes(activeProject.data, activeProject.removeBackground, globalShowNumbers);
        const tightCrop = shouldUseTightCrop(activeProject.data, activeProject.removeBackground);

        const colorCanvas = exportToCanvas(activeProject.data!, activeProject.filled, {
          showCodes,
          colored: true,
          showPalette: false,
          partialColorMode: activeProject.partialColorMode,
          bgColor: theme.backgroundColor,
          transparentBg: activeProject.removeBackground,
          tightCrop,
          removeBgColorCells: true,
          showMagnifier: false,
        });

        const uncolorCanvas = exportToCanvas(activeProject.data!, activeProject.filled, {
          showCodes: globalShowNumbers,
          colored: false,
          showPalette: false,
          bgColor: theme.backgroundColor,
          tightCrop,
          removeBgColorCells: true,
        });

        if (!cancelled) {
          setPreviews({
            originUrl: activeProject.thumbnailDataUrl,
            uncolorUrl: uncolorCanvas.toDataURL("image/png"),
            colorUrl: colorCanvas.toDataURL("image/png"),
          });
          setIsGenerating(false);
        }
      }, 50);
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [
    activeProject?.data,
    activeProject?.filled,
    activeProject?.partialColorMode,
    activeProject?.removeBackground,
    activeProject?.thumbnailDataUrl,
    globalShowNumbers,
    globalTheme,
    globalCellSize,
  ]);

  if (!activeProject || !activeProject.data) return null;

  const handleDownload = () => {
    if (!activeProject.data) return;
    const base = activeProject.name.replace(/\.[^/.]+$/, "");
    const theme = getThemeById(globalTheme);
    const showCodes = shouldShowCodes(activeProject.data, activeProject.removeBackground, globalShowNumbers);
    const tightCrop = shouldUseTightCrop(activeProject.data, activeProject.removeBackground);

    const c1 = exportToCanvas(activeProject.data, activeProject.filled, {
      showCodes, colored: true, showPalette: false,
      partialColorMode: activeProject.partialColorMode,
      bgColor: theme.backgroundColor, transparentBg: activeProject.removeBackground,
      tightCrop, removeBgColorCells: true, showMagnifier: false,
    });
    downloadCanvas(c1, `colored-${base}.png`);

    if (activeProject.removeBackground && (activeProject.data.gridType === "square-mark" || activeProject.data.gridType === "hexagon-mark")) {
      setTimeout(() => {
        const cc = exportDotCodeMagnifierToCanvas(activeProject.data!, { transparentBg: true });
        downloadCanvas(cc, `circle-${base}.png`);
      }, 300);
    }
    if (activeProject.partialColorMode === "none" && !activeProject.removeBackground) {
      setTimeout(() => {
        const c2 = exportToCanvas(activeProject.data!, activeProject.filled, {
          showCodes: globalShowNumbers, colored: false, showPalette: false,
          bgColor: theme.backgroundColor, removeBgColorCells: true,
        });
        downloadCanvas(c2, `uncolored-${base}.png`);
      }, 500);
    }
  };

  const zoomSteps = [0.25, 0.5, 0.75, 1, 1.5, 2];
  const currentZoomStep = zoom ?? 0;
  const zoomIn = () => {
    const next = zoomSteps.find((z) => z > (zoom ?? 0.75));
    if (next) setZoomLocal(next);
  };
  const zoomOut = () => {
    const prev = [...zoomSteps].reverse().find((z) => z < (zoom ?? 0.75));
    if (prev) setZoomLocal(prev);
    else setZoomLocal(null);
  };
  const resetZoom = () => setZoomLocal(null);

  const panels: { label: string; url: string | undefined; key: string }[] = [
    { key: "origin", label: "Original", url: previews?.originUrl },
    { key: "uncolor", label: "Uncolored", url: previews?.uncolorUrl },
    { key: "color", label: "Colored", url: previews?.colorUrl },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={containerRef}
        className="relative flex flex-col bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
        style={{ width: "min(96vw, 1400px)", height: "min(92vh, 900px)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] shrink-0 gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{activeProject.name}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {activeProject.gridType} · {globalCellSize}px
              {navigable.length > 1 && <span className="ml-2">{idx + 1} / {navigable.length}</span>}
            </p>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-[var(--bg-primary)] rounded-lg border border-[var(--border-default)] overflow-hidden shrink-0">
            <button onClick={zoomOut} disabled={zoom === null} className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-30 text-base">−</button>
            <button onClick={resetZoom} className="px-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-w-[52px] text-center">
              {zoom ? `${Math.round(zoom * 100)}%` : "Fit"}
            </button>
            <button onClick={zoomIn} disabled={currentZoomStep >= 2} className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-30 text-base">+</button>
          </div>

          {/* Close */}
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-colors shrink-0" title="Close (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* ── 3-panel preview ── */}
        <div className="flex-1 min-h-0 relative">
          {/* Prev / Next overlays */}
          {hasPrev && (
            <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-all shadow-lg" title="Previous (←)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {hasNext && (
            <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-all shadow-lg" title="Next (→)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          <div className="flex h-full divide-x divide-[var(--border-subtle)]">
            {panels.map(({ key, label, url }) => (
              <div key={key} className="flex-1 flex flex-col min-w-0">
                {/* Panel label */}
                <div className="px-3 py-1.5 text-[11px] font-medium text-[var(--text-muted)] text-center border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] shrink-0 tracking-wide uppercase">
                  {label}
                </div>
                {/* Panel image */}
                <div className="flex-1 overflow-auto bg-neutral-100 flex items-center justify-center p-3">
                  {isGenerating || !url ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] text-neutral-400">Rendering…</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={label}
                      className="object-contain shadow-lg bg-white rounded-sm border border-neutral-200"
                      style={
                        zoom
                          ? { width: `${zoom * 100}%`, minWidth: `${zoom * 100}%` }
                          : { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] shrink-0">
          <button
            onClick={() => { if (confirm("Delete this project?")) { removeProject(projectId); onClose(); } }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete
          </button>

          {navigable.length > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={goPrev} disabled={!hasPrev} className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <span className="text-xs text-[var(--text-muted)] px-2 tabular-nums">{idx + 1} / {navigable.length}</span>
              <button onClick={goNext} disabled={!hasNext} className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNGs
          </button>
        </div>
      </div>
    </div>
  );
}
