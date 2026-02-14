"use client";

/**
 * CanvasPreview Component
 *
 * Uses grid engine: Squares / Diamonds / Dots – same layout as square (rows×cols, one cell per slot).
 */

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import {
  LETTER_OUTPUT_WIDTH,
  LETTER_OUTPUT_HEIGHT,
  paletteIndexToLabel,
  rgbToHex,
} from "@/lib/utils";
import {
  renderToCanvas,
  mosaicBlocksToCells,
  STROKE_GRID_PX,
} from "@/lib/grid";

/** Preview scale - same composition as export, smaller for screen */
const PREVIEW_SCALE = 0.4;
const PREVIEW_WIDTH = Math.round(LETTER_OUTPUT_WIDTH * PREVIEW_SCALE);
const PREVIEW_HEIGHT = Math.round(LETTER_OUTPUT_HEIGHT * PREVIEW_SCALE);

const IconImage = () => (
  <svg
    className="h-12 w-12 text-[var(--text-muted)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

export default function CanvasPreview() {
  const templateCanvasRef = useRef<HTMLCanvasElement>(null);
  const mosaicCanvasRef = useRef<HTMLCanvasElement>(null);
  const {
    processedImageData,
    mosaicBlocks,
    blockSize,
    showGrid,
    showNumbers,
    isProcessing,
    originalImage,
    gridType,
  } = useEditorStore();

  useEffect(() => {
    if (
      !processedImageData ||
      mosaicBlocks.length === 0 ||
      !templateCanvasRef.current ||
      !mosaicCanvasRef.current
    ) {
      return;
    }

    const { width, height } = processedImageData;
    const rows = Math.ceil(height / blockSize);
    const cols = Math.ceil(width / blockSize);
    const cells = mosaicBlocksToCells(
      mosaicBlocks,
      blockSize,
      paletteIndexToLabel,
      rgbToHex,
    );
    const gridConfig = {
      type: gridType,
      rows,
      cols,
      showBorder: showGrid,
      borderWidth: STROKE_GRID_PX,
    };
    const safeArea = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };

    const templateCanvas = templateCanvasRef.current;
    templateCanvas.width = PREVIEW_WIDTH;
    templateCanvas.height = PREVIEW_HEIGHT;

    const mosaicCanvas = mosaicCanvasRef.current;
    mosaicCanvas.width = PREVIEW_WIDTH;
    mosaicCanvas.height = PREVIEW_HEIGHT;

    requestAnimationFrame(() => {
      renderToCanvas(templateCanvas, gridConfig, cells, {
        showNumbers,
        exportMode: "lineArt",
        safeAreaOverride: safeArea,
      });
      renderToCanvas(mosaicCanvas, gridConfig, cells, {
        showNumbers,
        exportMode: "colored",
        safeAreaOverride: safeArea,
      });
    });
  }, [processedImageData, mosaicBlocks, blockSize, showGrid, showNumbers, gridType]);

  if (!originalImage) {
    return (
      <div className="grid-pattern flex h-full flex-col items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <IconImage />
          </div>
          <h3 className="text-base font-medium text-[var(--text-primary)]">
            Upload an image to begin
          </h3>
          <p className="mt-2 max-w-xs text-sm text-[var(--text-muted)]">
            Create a color-by-number mosaic from any PNG or JPG image
          </p>
        </div>
      </div>
    );
  }

  const canvasStyle = {
    imageRendering: "auto" as const,
    width: "100%",
    maxWidth: "min(42vw, 560px)",
    height: "auto",
    aspectRatio: `${LETTER_OUTPUT_WIDTH} / ${LETTER_OUTPUT_HEIGHT}`,
  };

  return (
    <div className="grid-pattern relative flex h-full flex-col overflow-hidden p-4">
      {isProcessing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Generating mosaic...
            </p>
          </div>
        </div>
      )}

      <div className="flex shrink-0 justify-center pb-3">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Original
          </span>
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <img
              src={originalImage.src}
              alt="Original image"
              className="block max-h-24 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-6 overflow-auto">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            1. Numbered template
          </span>
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white shadow-xl">
            <canvas
              ref={templateCanvasRef}
              className="block"
              style={canvasStyle}
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            2. Colored with numbers
          </span>
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl">
            <canvas
              ref={mosaicCanvasRef}
              className="block"
              style={canvasStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
