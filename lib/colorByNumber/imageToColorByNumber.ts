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
  type RGB,
} from "@/lib/utils";
import { FIXED_PALETTE } from "@/lib/palette";
import {
  createMosaicBlocks,
  reduceToUsedPalette,
  mergeMinorColors,
  rgbToLab,
  deltaE2000,
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

/**
 * Crop image to exact aspect ratio (center crop).
 * Returns a new HTMLImageElement (or ImageData/Canvas) to use for further processing.
 */
const cropToAspectRatio = (
  img: HTMLImageElement,
  targetRatio: number,
): HTMLCanvasElement => {
  const currentRatio = img.width / img.height;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;

  if (currentRatio > targetRatio) {
    // Too wide: Crop width
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    // Too tall: Crop height
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
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
 */
const removeGeminiWatermark = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  // Crop about 6% from each side, which is enough to remove the bottom-right watermark
  const cropX = Math.max(img.width * 0.06, 80);
  const cropY = Math.max(img.height * 0.06, 80);

  canvas.width = img.width - cropX * 2;
  canvas.height = img.height - cropY * 2;

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
 * Agglomerative palette merge using CIEDE2000.
 *
 * Repeatedly finds the two perceptually closest colors and merges them
 * (pixel-weighted average in RGB, then re-convert) until the palette has
 * ≤ maxColors entries.  This is optimal compared to threshold-bumping because
 * it always collapses the single most-similar pair, preserving the most
 * visually distinct colors in the final palette.
 *
 * White (r≥245, g≥245, b≥245) is protected: it is never merged into another color.
 */
const agglomerativeMerge = (colors: RGB[], maxColors: number): RGB[] => {
  // Work on a mutable copy
  let palette = colors.map((c) => ({ ...c }));

  while (palette.length > maxColors) {
    let bestI = 0;
    let bestJ = 1;
    let minDist = Infinity;

    // Find closest pair (O(n²) – fine for n≤~200)
    for (let i = 0; i < palette.length; i++) {
      const labI = rgbToLab(palette[i]);
      const isWhiteI =
        palette[i].r >= 245 && palette[i].g >= 245 && palette[i].b >= 245;

      for (let j = i + 1; j < palette.length; j++) {
        // Never merge white with a non-white color
        const isWhiteJ =
          palette[j].r >= 245 && palette[j].g >= 245 && palette[j].b >= 245;
        if (isWhiteI !== isWhiteJ) continue;

        const labJ = rgbToLab(palette[j]);
        const d = deltaE2000(labI, labJ);
        if (d < minDist) {
          minDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    // Merge bestJ into bestI (simple average in RGB – good enough for color-by-number)
    const ci = palette[bestI];
    const cj = palette[bestJ];
    palette[bestI] = {
      r: Math.round((ci.r + cj.r) / 2),
      g: Math.round((ci.g + cj.g) / 2),
      b: Math.round((ci.b + cj.b) / 2),
    };

    // Remove the merged color
    palette.splice(bestJ, 1);
  }

  return palette;
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
    maxWidth = 1800,
    useDithering = true,
    maxColors = 16,
  } = options;

  // 1. Load + initial resize (cap width)
  // 1. Load + Crop Watermark + Crop to Aspect Ratio + Resize
  // Enforce 7 x 10.2 inch aspect ratio (~0.686)
  const TARGET_ASPECT = 7.0 / 10.2;

  const rawImg = await loadImageFromFile(file);

  // Remove Gemini watermark before applying aspect ratio crop
  const watermarkRemovedCanvas = removeGeminiWatermark(rawImg);
  const watermarkRemovedImg = new Image();
  watermarkRemovedImg.src = watermarkRemovedCanvas.toDataURL();
  await new Promise((r) => (watermarkRemovedImg.onload = r));

  // Crop to ensure aspect ratio
  // We can treat the cropped canvas as an image for resizeImage
  const croppedCanvas = cropToAspectRatio(watermarkRemovedImg, TARGET_ASPECT);

  // Convert canvas to image for existing pipeline
  const croppedImg = new Image();
  croppedImg.src = croppedCanvas.toDataURL();
  await new Promise((r) => (croppedImg.onload = r));

  const baseData = resizeImage(croppedImg, maxWidth);

  // Original `img` usage:
  // - used in resizeImageToSize
  // So we should replace `img` with `croppedImg` for rest of scope.
  const img = croppedImg;

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
    // Pentagon/Hexagon: r = cellSize/sqrt(3), step = 1.5*r
    // We need more rows to cover the same height because rows overlap.
    const r = cellSize / Math.sqrt(3);
    const rowStep = 1.5 * r;
    rows = Math.ceil(rows * (cellSize / rowStep));
  } else if (gridType === "fish-scale") {
    // Fish scale has rowStep = r = cellSize/2 (50% vertical overlap)
    const rowStep = cellSize / 2;
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
  // Extract 3x more colors than needed so the quantizer captures fine details,
  // then we smartly reduce to maxColors using agglomerative merging.
  const overSample = Math.max(maxColors * 3, 48);
  const { palette: initialPalette } = quantizeImage(imageData, overSample);

  // 5a. FORCE-ADD PURE WHITE TO PALETTE
  // Snap near-whites to pure white and ensure white is present.
  let hasWhite = false;
  for (let i = 0; i < initialPalette.length; i++) {
    const c = initialPalette[i];
    if (c.r >= 245 && c.g >= 245 && c.b >= 245) {
      initialPalette[i] = { r: 255, g: 255, b: 255 };
      hasWhite = true;
    }
  }
  if (!hasWhite) {
    initialPalette.push({ r: 255, g: 255, b: 255 });
  }

  // 5b. AGGLOMERATIVE MERGE to exactly maxColors.
  // Repeatedly find and merge the two most perceptually similar colors (CIEDE2000)
  // until palette size ≤ maxColors. This guarantees the final palette preserves
  // the most visually distinct colors from the image.
  const dynamicPalette = agglomerativeMerge(initialPalette, maxColors);

  // 6. Create mosaic blocks using the DYNAMIC palette
  // This ensures "Orange" in image stays "Orange" even if it's not in the 24 basic colors.
  let rawBlocks = createMosaicBlocks(
    imageData,
    dynamicPalette,
    cellSize,
    useDithering, // user option for dithering
    true, // useBlockAverage = true gives better perceptual matches for blocks
  );

  // 6b. FILTER MINOR COLORS
  // Merge colors that appear in fewer than 10 blocks into their nearest neighbor.
  // This removes 1-2 pixel "dust" that is annoying to paint.
  rawBlocks = mergeMinorColors(rawBlocks, dynamicPalette, 10);

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
