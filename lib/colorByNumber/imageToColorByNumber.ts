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
import {
  resizeImage,
  rgbToHex,
  paletteIndexToLabel,
  isWhite,
  BASIC_COLORS_EN,
  type RGB,
} from "@/lib/utils";
import { FIXED_PALETTE } from "@/lib/palette";
import {
  createMosaicBlocks,
  reduceToUsedPalette,
  deduplicatePaletteDynamic,
} from "@/lib/pixelate";
import { quantizeImage } from "@/lib/quantize";

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
 * Uses high-quality smoothing for sharper result.
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
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
}

/**
 * Find closest index in FIXED_PALETTE for a given RGB color.
 * Used to assign a name (Red, Blue) to a dynamic color.
 */
const findClosestFixedColorIndex = (color: RGB): number => {
  let minDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < FIXED_PALETTE.length; i++) {
    const fc = FIXED_PALETTE[i];
    const dr = color.r - fc.r;
    const dg = color.g - fc.g;
    const db = color.b - fc.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
};

/**
 * Convert an image file into ColorByNumberData.
 *
 * Uses dynamic palette extraction (image-q) to get accurate colors,
 * rather than forcing the image into the limited FIXED_PALETTE.
 */
export const imageToColorByNumber = async (
  file: File,
  options: ImageToColorByNumberOptions = {},
): Promise<ColorByNumberData> => {
  const {
    gridType = "standard",
    cellSize = 25,
    maxWidth = 1200,
    useDithering = true,
  } = options;

  // 1. Load + initial resize (cap width)
  const img = await loadImageFromFile(file);
  const baseData = resizeImage(img, maxWidth);

  // 2. Compute base grid dimensions in cells
  const cols = Math.ceil(baseData.width / cellSize);
  let rows = Math.ceil(baseData.height / cellSize);

  // 3. Compensate for shorter row steps in honeycomb/diamond
  if (gridType === "honeycomb") {
    const gap = 2;
    const r = (cellSize - gap) / 2;
    const rowStep = Math.sqrt(3) * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = 1.5 * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "pentagon") {
    // Pentagon/Hexagon: r = cellSize/2, step = 1.5*r = 0.75*cellSize
    // We need more rows to cover the same height because rows overlap.
    const r = cellSize / 2;
    const rowStep = 1.5 * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  }

  // 4. Compute target pixel dimensions and resize image to fill
  const targetW = cols * cellSize;
  const targetH = rows * cellSize;
  const imageData =
    gridType === "standard"
      ? baseData
      : resizeImageToSize(img, targetW, targetH);

  // 5. EXTRACT DYNAMIC PALETTE
  // Instead of FIXED_PALETTE, we generate a palette from the image itself.
  // 32 colors is a good balance: enough for detail, small enough for labeling.
  const { palette: initialPalette } = quantizeImage(imageData, 32);

  // 5b. DEDUPLICATE Dynamic Palette
  // Merge colors that are perceptually very close (e.g. 2 shades of orange).
  // Threshold 8.0 is generous enough to merge subtle variations.
  const { palette: dynamicPalette } = deduplicatePaletteDynamic(
    initialPalette,
    8.0,
  );

  // 6. Create mosaic blocks using the DYNAMIC palette
  // This ensures "Orange" in image stays "Orange" even if it's not in the 24 basic colors.
  const rawBlocks = createMosaicBlocks(
    imageData,
    dynamicPalette,
    cellSize,
    false, // dithering off for block creation usually looks cleaner for paint-by-number
    true, // useBlockAverage = true gives better perceptual matches for blocks
  );

  // 7. Reduce to only used palette colors (remap indices to 0..K-1)
  const { blocks, palette: usedPalette } = reduceToUsedPalette(
    rawBlocks,
    dynamicPalette,
  );

  // 8. Map each used dynamic color to the closest FIXED_PALETTE color
  // This is so we can still give it a name like "Orange" or "Blue" in the UI
  // even though the actual rendered color is the dynamic one.
  const dynamicToFixedIndex = usedPalette.map((c) =>
    findClosestFixedColorIndex(c),
  );

  // 9. Build sequential code mapping (1, 2, 3...)
  // Identify white-ish colors to skip numbering
  const indexIsWhite = new Map<number, boolean>();
  for (let i = 0; i < usedPalette.length; i++) {
    indexIsWhite.set(i, isWhite(usedPalette[i]));
  }

  let seq = 0;
  const indexToCode = new Map<number, string>();
  // Sort indices makes sure code order 1,2,3 allows roughly consistent ordering if needed,
  // typically we just walk 0..N of the used palette.
  for (let i = 0; i < usedPalette.length; i++) {
    if (indexIsWhite.get(i)) {
      indexToCode.set(i, "");
    } else {
      indexToCode.set(i, paletteIndexToLabel(seq));
      seq++;
    }
  }

  // 10. Convert to cells
  const cells = blocks.map((block) => ({
    x: Math.round(block.x / cellSize),
    y: Math.round(block.y / cellSize),
    code: indexToCode.get(block.paletteIndex) ?? "",
    color: rgbToHex(block.color),
    // Map the dynamic color's index to the closest Fixed Palette index
    fixedPaletteIndex: dynamicToFixedIndex[block.paletteIndex],
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
