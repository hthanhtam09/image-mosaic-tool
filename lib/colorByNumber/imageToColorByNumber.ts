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
import { resizeImage, rgbToHex, paletteIndexToLabel } from "@/lib/utils";
import { createMosaicBlocks, reduceToUsedPalette } from "@/lib/pixelate";
import { FIXED_PALETTE } from "@/lib/palette";

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
 * Resize image to specific pixel dimensions using a canvas.
 */
const resizeImageToSize = (
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
): ImageData => {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
};

export interface ImageToColorByNumberOptions {
  /** Grid pattern to use (default: "standard") */
  gridType?: ColorByNumberGridType;
  /** Cell size in pixels (default: 20) */
  cellSize?: number;
  /** Max image width before processing (default: 800) */
  maxWidth?: number;
}

/**
 * Convert an image file into ColorByNumberData.
 *
 * Uses the existing mosaic pipeline (createMosaicBlocks + reduceToUsedPalette)
 * to quantize the image to the fixed palette, then maps each MosaicBlock to a
 * ColorByNumberCell with a code label (0-9, A-N) and hex color string.
 */
export const imageToColorByNumber = async (
  file: File,
  options: ImageToColorByNumberOptions = {},
): Promise<ColorByNumberData> => {
  const {
    gridType = "standard",
    cellSize = 20,
    maxWidth = 800,
  } = options;

  // 1. Load + initial resize (cap width)
  const img = await loadImageFromFile(file);
  const baseData = resizeImage(img, maxWidth);

  // 2. Compute base grid dimensions in cells
  const cols = Math.ceil(baseData.width / cellSize);
  let rows = Math.ceil(baseData.height / cellSize);

  // 3. Compensate for shorter row steps in honeycomb/diamond so the grid
  //    fills the 8.5×11 page the same way standard does.
  //    We increase rows AND resize the image taller to fill the extra rows
  //    with real image data (stretched) instead of white padding.
  if (gridType === "honeycomb") {
    const gap = 2; // matches cellGap set below
    const r = (cellSize - gap) / 2;
    const rowStep = Math.sqrt(3) * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = 1.5 * r; // DIAMOND_ROW_STEP_FACTOR * r
    rows = Math.ceil(rows * (cellSize / rowStep));
  }

  // 4. Compute target pixel dimensions and resize image to fill
  const targetW = cols * cellSize;
  const targetH = rows * cellSize;
  const imageData =
    gridType === "standard"
      ? baseData
      : resizeImageToSize(img, targetW, targetH);

  // 5. Create mosaic blocks (quantize to fixed palette)
  const rawBlocks = createMosaicBlocks(imageData, FIXED_PALETTE, cellSize);

  // 6. Reduce to only used palette colors (remap indices to 0..K-1)
  const { blocks, fixedIndices } = reduceToUsedPalette(rawBlocks, FIXED_PALETTE);

  // 7. Build sequential code mapping (skip white → no gaps: 1, 2, 3, ...)
  //    First pass: identify which palette indices are non-white
  const indexIsWhite = new Map<number, boolean>();
  for (const block of blocks) {
    if (!indexIsWhite.has(block.paletteIndex)) {
      const w = block.color.r >= 250 && block.color.g >= 250 && block.color.b >= 250;
      indexIsWhite.set(block.paletteIndex, w);
    }
  }
  //    Assign sequential labels only to non-white indices
  let seq = 0;
  const indexToCode = new Map<number, string>();
  const sortedIndices = [...indexIsWhite.keys()].sort((a, b) => a - b);
  for (const idx of sortedIndices) {
    if (indexIsWhite.get(idx)) {
      indexToCode.set(idx, ""); // white → no code
    } else {
      indexToCode.set(idx, paletteIndexToLabel(seq));
      seq++;
    }
  }

  // 8. Convert MosaicBlock[] → ColorByNumberCell[]
  const cells = blocks.map((block) => ({
    x: Math.round(block.x / cellSize),
    y: Math.round(block.y / cellSize),
    code: indexToCode.get(block.paletteIndex) ?? "",
    color: rgbToHex(block.color),
    fixedPaletteIndex: fixedIndices[block.paletteIndex],
  }));

  return {
    gridType,
    width: cols,
    height: rows,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    cells,
  };
};
