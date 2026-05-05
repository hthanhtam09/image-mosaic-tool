/**
 * Convert an imported image to ColorByNumberData using the mosaic pipeline.
 *
 * Pipeline: File → HTMLImageElement → resizeImage → createMosaicBlocks
 *   → reduceToUsedPalette → ColorByNumberData
 *
 * For honeycomb/diamond grids the image is resized taller so cells fill
 * the 8.5×11 page the same way standard does.
 */

import type { ColorByNumberData, ColorByNumberGridType } from "./types";
import { resizeCanvasToSize, resizeImageFromCanvas } from "@/lib/utils";

/** Load a File as HTMLImageElement */
const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Soft crop: only trims excess if the image is significantly wider or taller
 * than the target portrait ratio. Allows up to 20% tolerance before cropping.
 * This preserves the full image content in most cases.
 * Accepts any CanvasImageSource (HTMLImageElement or HTMLCanvasElement).
 */
const softCropToPortrait = (
  img: HTMLImageElement | HTMLCanvasElement,
  targetRatio: number,
): HTMLCanvasElement => {
  const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
  const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
  const currentRatio = srcW / srcH;

  // Allow up to 20% ratio deviation before cropping — preserves full image for most photos
  const TOLERANCE = 0.20;
  let sx = 0, sy = 0, sw = srcW, sh = srcH;

  if (currentRatio > targetRatio * (1 + TOLERANCE)) {
    // Image is significantly wider than portrait target: trim sides only
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else if (currentRatio < targetRatio * (1 - TOLERANCE)) {
    // Image is significantly taller than portrait target: trim top/bottom only
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }
  // Otherwise: keep the full image as-is

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get crop context");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
};

/**
 * Copy image to a canvas without any cropping.
 * Used to normalize HTMLImageElement → HTMLCanvasElement.
 */
const copyToCanvas = (
  img: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement => {
  const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
  const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
  const canvas = document.createElement("canvas");
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get copy context");
  ctx.drawImage(img, 0, 0);
  return canvas;
};

export interface ImageToColorByNumberOptions {
  /** Grid pattern to use (default: "standard") */
  gridType?: ColorByNumberGridType;
  /** Cell size in pixels (default: 25). Smaller = more detail, more cells. */
  cellSize?: number;
  /** Max image width before processing (default: 1200). Higher = more detail. */
  maxWidth?: number;
  /** Use Floyd–Steinberg dithering for better gradients (default: true). */
  useDithering?: boolean;
  /** Maximum number of colors to use (default: 16). */
  maxColors?: number;
  /** Remove white/near-white backgrounds by flood-fill from edges (default: false). */
  removeWhiteBackground?: boolean;
}

/**
 * Convert an image file into ColorByNumberData.
 *
 * Uses a Web Worker for heavy processing to keep the UI responsive.
 */
export const imageToColorByNumber = async (
  file: File,
  options: ImageToColorByNumberOptions = {},
): Promise<ColorByNumberData> => {
  const {
    gridType = "standard",
    cellSize = 25,
    maxWidth = 1800,
    useDithering = true,
    maxColors = 20,
    removeWhiteBackground = true,
  } = options;

  // 1. Load + Rotate (if landscape) + Soft-Crop to Portrait + Resize
  // We want everything to be Portrait orientation (portrait = height > width).
  // OPTIMIZED: No more toDataURL() / re-decode — pure canvas-to-canvas operations.
  // NOTE: We NO LONGER crop watermarks (causes content loss) or force strict aspect ratio.

  const rawImg = await loadImageFromFile(file);

  // IF the source image is landscape (wider than tall),
  // we ROTATE it 90 degrees to make it portrait — directly on canvas.
  let currentSource: HTMLImageElement | HTMLCanvasElement = rawImg;
  if (rawImg.width > rawImg.height) {
    const rotateCanvas = document.createElement("canvas");
    rotateCanvas.width = rawImg.height;
    rotateCanvas.height = rawImg.width;
    const rotateCtx = rotateCanvas.getContext("2d");
    if (rotateCtx) {
      rotateCtx.translate(rotateCanvas.width / 2, rotateCanvas.height / 2);
      rotateCtx.rotate((90 * Math.PI) / 180);
      rotateCtx.drawImage(rawImg, -rawImg.width / 2, -rawImg.height / 2);
      currentSource = rotateCanvas;
    }
  }

  const TARGET_ASPECT = 7.0 / 10.2;

  // Normalize to canvas (no crop, no watermark removal — preserves full image)
  const sourceCanvas =
    currentSource instanceof HTMLCanvasElement
      ? currentSource
      : copyToCanvas(currentSource);

  // Soft crop: only trims if image is >20% off from portrait ratio
  const croppedCanvas = softCropToPortrait(sourceCanvas, TARGET_ASPECT);

  // Resize using canvas directly (resizeImageFromCanvas avoids toDataURL)
  const baseData = resizeImageFromCanvas(croppedCanvas, maxWidth);

  // 2. Compute base grid dimensions in cells
  const cols = Math.ceil(baseData.width / cellSize);
  let rows = Math.ceil(baseData.height / cellSize);

  // 3. Compensate for shorter row steps in honeycomb/diamond
  if (gridType === "honeycomb") {
    const r = cellSize / 2;
    const rowStep = Math.sqrt(3) * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = 1.0 * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "pentagon") {
    const r = cellSize / Math.sqrt(3);
    const rowStep = 1.5 * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "fish-scale") {
    const rowStep = cellSize / 2;
    rows = Math.ceil(rows * (cellSize / rowStep));
  }

  // 4. Compute target pixel dimensions and resize image to fill
  const targetW = cols * cellSize;
  const targetH = rows * cellSize;
  const imageData =
    gridType === "standard"
      ? baseData
      : resizeCanvasToSize(croppedCanvas, targetW, targetH);

  // 5. Offload heavy computation to Worker
  const result = await new Promise<ColorByNumberData>((resolve, reject) => {
    const worker = new Worker(
      new URL("./conversionWorker.ts", import.meta.url),
    );

    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    // Transfer ownership of buffer to avoid memory copy
    const buffer = imageData.data.buffer;
    worker.postMessage(
      {
        imageData: {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        },
        gridType,
        cellSize,
        useDithering,
        maxColors,
        cols,
        rows,
        removeWhiteBackground,
      },
      [buffer] as Transferable[],
    );
  });
  return result;
};
