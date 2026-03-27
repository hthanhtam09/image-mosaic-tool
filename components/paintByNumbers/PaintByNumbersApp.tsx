"use client";

import { useCallback, useRef } from "react";
import { usePaintByNumbersStore } from "@/store/usePaintByNumbersStore";
import { quantizeImage } from "@/lib/paintByNumbers/quantizeImage";
import { calculateRegionCenters, detectRegions, mergeSmallRegions, smoothLabels, splitLargeRegions } from "@/lib/paintByNumbers/detectRegions";
import ImageUploader from "./ImageUploader";
import ConfigPanel from "./ConfigPanel";
import CanvasRenderer from "./CanvasRenderer";
import ColorLegend from "./ColorLegend";
import ExportControls from "./ExportControls";

interface PaintByNumbersAppProps {
  onBack: () => void;
}

export default function PaintByNumbersApp({ onBack }: PaintByNumbersAppProps) {
  const store = usePaintByNumbersStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelected = useCallback(
    (dataUrl: string, fileName: string) => {
      store.setOriginalImage(dataUrl, fileName);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleProcess = useCallback(async () => {
    if (!store.originalImage) return;

    store.setProcessing(true, "Loading image...");

    try {
      // Step 1: Load image and get ImageData
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = store.originalImage!;
      });

      // Resize if needed
      let w = img.width;
      let h = img.height;
      const maxSize = store.maxImageSize;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext("2d")!;
      
      // Minor anti-aliasing to ensure beautiful PBN rendering without losing details
      tempCtx.filter = "blur(1px)";
      tempCtx.drawImage(img, 0, 0, w, h);
      
      tempCtx.filter = "none";
      const imageData = tempCtx.getImageData(0, 0, w, h);

      // ** AUTO PARAMETERS OVERRIDE **
      // The user wants clean, optimal results without messiness.
      const autoNumColors = 20; // 20 colors gives rich detail, avoiding blank areas
      const autoMinRegionSize = Math.max(60, Math.floor((w * h) / 5000)); // Prune tiny specks, but retain structure
      const autoMaxRegionArea = Math.max(6000, Math.floor((w * h) / 60)); // Slice large blank areas
      const autoOutlineThickness = 1;
      const autoFontSize = Math.max(10, Math.floor(Math.min(w, h) / 80)); 
      const autoAlgorithm = "neuquant"; 

      // Step 2: Color Quantization
      store.setProcessing(true, "Quantizing colors...");
      const { palette, pixelColorIndex } = await quantizeImage(
        imageData,
        autoNumColors,
        autoAlgorithm
      );

      // Step 2.5: Smooth color indices to create organic, curvy region boundaries
      store.setProcessing(true, "Smoothing boundaries...");
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          smoothLabels(pixelColorIndex, w, h, 2, 4);
          resolve();
        }, 10);
      });

      // Step 3: Region Detection
      store.setProcessing(true, "Detecting regions...");
      const { regionMap, regions } = detectRegions(
        pixelColorIndex,
        w,
        h,
        autoMinRegionSize
      );

      // Step 4: Merge small regions
      store.setProcessing(true, "Merging small regions...");
      mergeSmallRegions(regionMap, w, h);

      // Step 4.5: Auto-split large background regions to add more numbers
      store.setProcessing(true, "Splitting large regions...");
      const finalRegions = splitLargeRegions(regionMap, regions, w, h, autoMaxRegionArea);

      // Step 4.6: Calculate Pole of Inaccessibility for text placement
      store.setProcessing(true, "Optimizing label positions...");
      calculateRegionCenters(regionMap, w, h, finalRegions);

      // Store auto parameters
      store.setNumColors(autoNumColors);
      store.setMinRegionSize(autoMinRegionSize);
      store.setOutlineThickness(autoOutlineThickness);
      store.setFontSize(autoFontSize);
      store.setAlgorithm(autoAlgorithm);

      // Step 5: Set results
      store.setResults({
        palette,
        pixelColorIndex,
        regionMap,
        regions: finalRegions,
        imageWidth: w,
        imageHeight: h,
      });
    } catch (err) {
      console.error("PBN processing error:", err);
      store.setProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    store.originalImage,
    store.numColors,
    store.algorithm,
    store.minRegionSize,
    store.maxImageSize,
  ]);

  const hasResults = store.palette !== null && store.regions !== null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div className="h-6 w-px bg-[var(--border-subtle)]" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Paint by Numbers</h1>
              <p className="text-[11px] text-[var(--text-muted)]">Convert images to coloring book pages</p>
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        {store.isProcessing && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[var(--accent)] font-medium">{store.processingStep}</span>
          </div>
        )}

        {store.originalFileName && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {store.originalFileName}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Config */}
        <div className="w-72 border-r border-[var(--border-subtle)] overflow-y-auto p-5 space-y-6">
          <ConfigPanel
            numColors={store.numColors}
            algorithm={store.algorithm}
            minRegionSize={store.minRegionSize}
            outlineThickness={store.outlineThickness}
            fontSize={store.fontSize}
            viewMode={store.viewMode}
            maxImageSize={store.maxImageSize}
            isProcessing={store.isProcessing}
            hasImage={!!store.originalImage}
            hasResults={hasResults}
            onNumColorsChange={store.setNumColors}
            onAlgorithmChange={store.setAlgorithm}
            onMinRegionSizeChange={store.setMinRegionSize}
            onOutlineThicknessChange={store.setOutlineThickness}
            onFontSizeChange={store.setFontSize}
            onViewModeChange={store.setViewMode}
            onMaxImageSizeChange={store.setMaxImageSize}
            onProcess={handleProcess}
          />

          {/* Export Section */}
          {hasResults && (
            <>
              <div className="h-px bg-[var(--border-subtle)]" />
              <ExportControls
                canvasRef={canvasRef}
                palette={store.palette!}
                fileName={store.originalFileName}
              />
            </>
          )}
        </div>

        {/* Center: Canvas / Upload */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!store.originalImage ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-lg">
                <ImageUploader onImageSelected={handleImageSelected} />
              </div>
            </div>
          ) : !hasResults ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {/* Show original image preview */}
              <div className="relative max-w-md max-h-[60vh] overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.originalImage}
                  alt="Original"
                  className="max-w-full max-h-[60vh] object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/50 backdrop-blur text-xs text-white/80">
                  Original Image
                </div>
              </div>

              {!store.isProcessing && (
                <p className="text-sm text-[var(--text-muted)] text-center">
                  Adjust settings in the sidebar, then click <strong className="text-[var(--accent)]">Convert</strong> to generate your paint-by-numbers output.
                </p>
              )}

              {/* Change image button */}
              <button
                onClick={() => store.clearImage()}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline underline-offset-4"
              >
                Choose a different image
              </button>
            </div>
          ) : (
            <CanvasRenderer
              width={store.imageWidth}
              height={store.imageHeight}
              palette={store.palette!}
              pixelColorIndex={store.pixelColorIndex!}
              regionMap={store.regionMap!}
              regions={store.regions!}
              outlineThickness={store.outlineThickness}
              fontSize={store.fontSize}
              viewMode={store.viewMode}
              canvasRef={canvasRef}
            />
          )}
        </div>

        {/* Right Sidebar: Color Legend */}
        {hasResults && (
          <div className="w-64 border-l border-[var(--border-subtle)] overflow-y-auto p-5">
            <ColorLegend palette={store.palette!} />

            {/* Stats */}
            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Stats
              </h3>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Dimensions</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {store.imageWidth} × {store.imageHeight}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Regions</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {store.regions!.length}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">Colors</span>
                <span className="text-[var(--text-primary)] font-mono">
                  {store.palette!.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
