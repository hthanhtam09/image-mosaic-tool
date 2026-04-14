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
 * Crop image to exact aspect ratio (center crop).
 * Accepts any CanvasImageSource (HTMLImageElement or HTMLCanvasElement).
 */
const cropToAspectRatio = (
  img: HTMLImageElement | HTMLCanvasElement,
  targetRatio: number,
): HTMLCanvasElement => {
  const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
  const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
  const currentRatio = srcW / srcH;
  let sx = 0,
    sy = 0,
    sw = srcW,
    sh = srcH;

  if (currentRatio > targetRatio) {
    // Too wide: Crop width
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    // Too tall: Crop height
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get crop context");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
};

/**
 * Remove Gemini watermark from the image.
 * The watermark is usually at the bottom right corner.
 * To maintain the image's center, we crop equally from all 4 sides.
 * Accepts any CanvasImageSource (HTMLImageElement or HTMLCanvasElement).
 */
const removeGeminiWatermark = (
  img: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement => {
  const srcW = img instanceof HTMLCanvasElement ? img.width : img.width;
  const srcH = img instanceof HTMLCanvasElement ? img.height : img.height;
  const canvas = document.createElement("canvas");
  // Crop about 6% from each side, which is enough to remove the bottom-right watermark
  const cropX = Math.max(srcW * 0.06, 80);
  const cropY = Math.max(srcH * 0.06, 80);

  canvas.width = srcW - cropX * 2;
  canvas.height = srcH - cropY * 2;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get crop context");

  ctx.drawImage(
    img,
    cropX,
    cropY,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
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
    maxColors = 16,
    removeWhiteBackground = true,
  } = options;

  // 1. Load + Rotate (if landscape) + Crop Watermark + Crop to Aspect Ratio + Resize
  // We want everything to be Portrait (7 x 10.2 inch aspect ratio ≈ 0.686).
  // OPTIMIZED: No more toDataURL() / re-decode — pure canvas-to-canvas operations.

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

  // Remove Gemini watermark — canvas to canvas (no toDataURL!)
  const watermarkRemovedCanvas = removeGeminiWatermark(currentSource);

  // Crop to ensure aspect ratio — canvas to canvas (no toDataURL!)
  const croppedCanvas = cropToAspectRatio(
    watermarkRemovedCanvas,
    TARGET_ASPECT,
  );

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
