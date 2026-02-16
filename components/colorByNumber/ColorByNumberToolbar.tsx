"use client";

/**
 * Color by Number – toolbar: import image, grid type, cell size, show/hide numbers, export
 */

import { useCallback, useRef, useState } from "react";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import {
  exportToCanvas,
  imageToColorByNumber,
} from "@/lib/colorByNumber";
import type { ColorByNumberGridType } from "@/lib/colorByNumber";

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

export default function ColorByNumberToolbar() {
  const {
    data,
    filled,
    zoom,
    showNumbers,
    cellSize,
    useDithering,
    importedFile,
    setData,
    setZoom,
    setPan,
    resetFill,
    toggleShowNumbers,
    setUseDithering,
    setImportedImage,
    reprocessWithGridType,
    reprocessWithCellSize,
    reprocessWithUseDithering,
  } = useColorByNumberStore();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [importGridType, setImportGridType] =
    useState<ColorByNumberGridType>("standard");
  const [isImporting, setIsImporting] = useState(false);

  /* ── Import Image ── */
  const handleImportClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
        // Store file + data URL for thumbnail and reprocessing
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        setImportedImage(file, dataUrl);

        const result = await imageToColorByNumber(file, {
          gridType: importGridType,
          cellSize,
          useDithering,
        });
        setData(result);
        setPan(0, 0);
        setZoom(1);
        resetFill();
      } catch (err) {
        console.error("Failed to import image:", err);
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    },
    [importGridType, cellSize, useDithering, setData, setPan, setZoom, resetFill, setImportedImage],
  );

  /* ── Grid type change (no re-import) ── */
  const handleGridTypeChange = useCallback(
    async (gridType: ColorByNumberGridType) => {
      setImportGridType(gridType);
      if (importedFile) {
        setIsImporting(true);
        try {
          await reprocessWithGridType(gridType);
          setPan(0, 0);
          setZoom(1);
        } finally {
          setIsImporting(false);
        }
      }
    },
    [importedFile, reprocessWithGridType, setPan, setZoom],
  );

  /* ── Dithering (quality) change ── */
  const handleUseDitheringChange = useCallback(
    async (checked: boolean) => {
      setUseDithering(checked);
      if (importedFile && data) {
        setIsImporting(true);
        try {
          await reprocessWithUseDithering(checked);
        } finally {
          setIsImporting(false);
        }
      }
    },
    [importedFile, data, setUseDithering, reprocessWithUseDithering],
  );

  /* ── Cell size change ── */
  const handleCellSizeChange = useCallback(
    async (newSize: number) => {
      if (!importedFile) return;
      setIsImporting(true);
      try {
        await reprocessWithCellSize(newSize);
      } finally {
        setIsImporting(false);
      }
    },
    [importedFile, reprocessWithCellSize],
  );

  /* ── Export ── */
  const handleExportColored = useCallback(() => {
    if (!data) return;
    const canvas = exportToCanvas(data, filled, {
      showCodes: showNumbers,
      colored: true,
    });
    downloadCanvas(
      canvas,
      `color-by-number-colored-${data.gridType}-${Date.now()}.png`,
    );
  }, [data, filled, showNumbers]);

  const handleExportUncolored = useCallback(() => {
    if (!data) return;
    const canvas = exportToCanvas(data, filled, {
      showCodes: showNumbers,
      colored: false,
    });
    downloadCanvas(
      canvas,
      `color-by-number-uncolored-${data.gridType}-${Date.now()}.png`,
    );
  }, [data, filled, showNumbers]);





  const handleZoomIn = useCallback(() => {
    setZoom(zoom + 0.25);
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(zoom - 0.25);
  }, [zoom, setZoom]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan(0, 0);
  }, [setZoom, setPan]);



  const GRID_TYPES: { value: ColorByNumberGridType; label: string }[] = [
    { value: "standard", label: "Standard" },
    { value: "honeycomb", label: "Honeycomb" },
    { value: "diamond", label: "Diamond" },
    { value: "pentagon", label: "Ngũ giác" },
  ];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] !p-4">
      <div className="flex-1 !space-y-10 overflow-y-auto px-5 py-6">
        {/* ── Import Image ── */}
        <section>
          <h2 className="!mb-6 text-sm font-semibold text-[var(--text-primary)]">
            Import Image
          </h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="Import image"
            >
              {isImporting ? "Processing…" : "📷 Import Image"}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleImageFileChange}
              aria-hidden
            />
          </div>
        </section>

        {/* ── Grid Type ── */}
        <section>
          <h2 className="!mb-6 text-sm font-semibold text-[var(--text-primary)]">
            Grid Type
          </h2>
          <div className="flex gap-1">
            {GRID_TYPES.map((gt) => (
              <button
                key={gt.value}
                type="button"
                onClick={() => handleGridTypeChange(gt.value)}
                disabled={isImporting}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  importGridType === gt.value
                    ? "bg-[var(--accent)] text-[var(--bg-primary)]"
                    : "border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-white/5"
                }`}
                aria-label={`Grid type: ${gt.label}`}
              >
                {gt.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Cell Size ── */}
        <section>
          <h2 className="!mb-6 text-sm font-semibold text-[var(--text-primary)]">
            Cell Size
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={cellSize}
              onChange={(e) => handleCellSizeChange(Number(e.target.value))}
              disabled={!importedFile || isImporting}
              className="flex-1"
              aria-label="Cell size"
            />
            <span className="min-w-[3rem] text-right text-sm text-[var(--text-secondary)]">
              {cellSize}px
            </span>
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Nhỏ hơn = nhiều ô hơn, hình giống ảnh gốc hơn
          </p>
        </section>

        {/* ── Quality (dithering) ── */}
        <section>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={useDithering}
              onChange={(e) => handleUseDitheringChange(e.target.checked)}
              disabled={!importedFile || isImporting}
              className="h-4 w-4 rounded"
              aria-label="Chất lượng tốt hơn (dithering)"
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Chất lượng tốt hơn (gradient mượt, giống ảnh hơn)
            </span>
          </label>
        </section>

        {/* ── Show Numbers ── */}
        <section>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={toggleShowNumbers}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Show Numbers
            </span>
          </label>
        </section>

        {/* ── Zoom ── */}
        <section>
          <h2 className="!mb-6 text-sm font-semibold text-[var(--text-primary)]">
            Zoom
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] transition-colors hover:bg-white/5 disabled:opacity-50"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-[4rem] text-center text-sm text-[var(--text-secondary)]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-transparent text-[var(--text-primary)] transition-colors hover:bg-white/5 disabled:opacity-50"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="rounded-lg border border-[var(--border-default)] px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-white/5"
              aria-label="Reset zoom"
            >
              Reset
            </button>
          </div>
        </section>

        {/* ── Export & Save ── */}
        <section>
          <h2 className="!mb-6 text-sm font-semibold text-[var(--text-primary)]">
            Export
          </h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleExportColored}
              disabled={!data}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="Download colored image"
            >
              🎨 Download Colored
            </button>
            <button
              type="button"
              onClick={handleExportUncolored}
              disabled={!data}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/5 disabled:opacity-50"
              aria-label="Download uncolored image"
            >
              📄 Download Uncolored
            </button>

          </div>
        </section>

      </div>
    </aside>
  );
}
