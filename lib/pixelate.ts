/**
 * Pixelate / mosaic block generation and canvas rendering
 */

import type { RGB } from "./utils";
import { paletteIndexToLabel, getLetterSizeFit, isWhite } from "./utils";

/**
 * Near-white check: more lenient than isWhite (>=250).
 * Catches off-whites that quantizers produce (e.g. 240,238,234)
 * which are perceptually white but fail the strict threshold.
 * Used to prevent merging white-ish colors with gray/beige.
 */
export const isNearWhite = (c: RGB): boolean => c.r >= 225 && c.g >= 225 && c.b >= 225;

/**
 * Removes white/near-white background blocks using a flood-fill algorithm from the edges.
 * Only white blocks contiguous with the edge (background) are removed, preserving white blocks inside the object.
 */
export const removeBackgroundBlocks = (
  blocks: MosaicBlock[],
  cols: number,
  rows: number,
  blockSize: number
): MosaicBlock[] => {
  if (blocks.length === 0) return blocks;
  
  // Create a 2D grid of blocks for easy neighbor lookup
  const grid = new Array(rows).fill(null).map(() => new Array(cols).fill(null)) as (MosaicBlock | null)[][];
  blocks.forEach(b => {
    const gy = Math.round(b.y / blockSize);
    const gx = Math.round(b.x / blockSize);
    if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) grid[gy][gx] = b;
  });

  const isBg = new Array(rows).fill(null).map(() => new Array(cols).fill(false));
  const queue: {r: number, c: number}[] = [];
  
  // Initialize queue with white edge blocks
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        const b = grid[r][c];
        if (b && isNearWhite(b.color)) {
          isBg[r][c] = true;
          queue.push({r, c});
        }
      }
    }
  }

  const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
  
  // Flood fill
  while (queue.length > 0) {
    const {r, c} = queue.shift()!;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !isBg[nr][nc]) {
        const b = grid[nr][nc];
        if (b && isNearWhite(b.color)) {
          isBg[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  // Filter out background blocks
  return blocks.filter(b => {
    const gy = Math.round(b.y / blockSize);
    const gx = Math.round(b.x / blockSize);
    if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) {
      return !isBg[gy][gx];
    }
    return true; // Keep if out of bounds
  });
};

export interface MosaicBlock {
  x: number;
  y: number;
  paletteIndex: number;
  color: RGB;
  isTransparent?: boolean;
}

/**
 * Convert sRGB [0-255] to OKLab (Björn Ottosson, 2020).
 * Returns {L, a, b} – keeping uppercase L so all existing callers stay unchanged.
 *
 * Why OKLab instead of CIELab + CIEDE2000?
 * - Perceptually uniform: hue-linear, no blue-to-purple shift
 * - Simple Euclidean distance is sufficient (no 40-line correction formula)
 * - Better hue separation for red/orange, blue/purple, etc.
 */
const _toLinear = (c: number): number => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

export const rgbToLab = (rgb: RGB): { L: number; a: number; b: number } => {
  const r = _toLinear(rgb.r);
  const g = _toLinear(rgb.g);
  const b = _toLinear(rgb.b);
  // sRGB linear → LMS (M1)
  const lmsL = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lmsM = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lmsS = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(lmsL);
  const m_ = Math.cbrt(lmsM);
  const s_ = Math.cbrt(lmsS);
  // LMS → OKLab (M2)
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
};

type Lab = { L: number; a: number; b: number };

/**
 * Perceptual color distance using OKLab Euclidean.
 * Replaces the 40-line CIEDE2000 formula — OKLab Euclidean is more accurate
 * for most use cases and eliminates hue-shift artifacts in CIELab.
 * Scale: 0 = identical, ~1.0 = maximum gamut distance (black vs white).
 */
export const deltaE2000 = (lab1: Lab, lab2: Lab): number => {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
};

/** Find palette index whose color is perceptually closest (OKLab Euclidean). */
const findPaletteIndexFromLab = (lab: Lab, paletteLab: Lab[]): number => {
  let minDist = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < paletteLab.length; i++) {
    const d = deltaE2000(lab, paletteLab[i]);
    if (d < minDist) {
      minDist = d;
      bestIndex = i;
    }
  }
  return bestIndex;
};

/** Find palette index for RGB. Converts to OKLab then finds closest. */
const findPaletteIndex = (
  color: RGB,
  palette: readonly RGB[],
  paletteLab: Lab[],
): number => {
  const colorLab = rgbToLab(color);
  return findPaletteIndexFromLab(colorLab, paletteLab);
};





/**
 * Floyd-Steinberg dithering (reserved for optional mode). Uses paletteLab + CIEDE2000.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for optional dither mode
const ditherToPalette = (
  imageData: ImageData,
  palette: readonly RGB[],
  paletteLab: Lab[],
): ImageData => {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const rF = new Float32Array(width * height);
  const gF = new Float32Array(width * height);
  const bF = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    rF[i] = data[j];
    gF[i] = data[j + 1];
    bF[i] = data[j + 2];
  }

  const addError = (
    x: number,
    y: number,
    er: number,
    eg: number,
    eb: number,
    factor: number,
  ) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    rF[idx] += er * factor;
    gF[idx] += eg * factor;
    bF[idx] += eb * factor;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const r = Math.max(0, Math.min(255, rF[idx]));
      const g = Math.max(0, Math.min(255, gF[idx]));
      const b = Math.max(0, Math.min(255, bF[idx]));
      const pixelColor: RGB = {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
      };
      const palIdx = findPaletteIndex(pixelColor, palette, paletteLab);
      const pal = palette[palIdx];
      const j = (y * width + x) * 4;
      out.data[j] = pal.r;
      out.data[j + 1] = pal.g;
      out.data[j + 2] = pal.b;
      out.data[j + 3] = 255;
      const er = r - pal.r;
      const eg = g - pal.g;
      const eb = b - pal.b;
      addError(x + 1, y, er, eg, eb, 7 / 16);
      addError(x - 1, y + 1, er, eg, eb, 3 / 16);
      addError(x, y + 1, er, eg, eb, 5 / 16);
      addError(x + 1, y + 1, er, eg, eb, 1 / 16);
    }
  }

  return out;
};

/**
 * Collect Lab values of all pixels in a block (for optimal color choice).
 */
const blockPixelLabs = (
  pixelLabs: Lab[],
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  blockSize: number,
): Lab[] => {
  const labs: Lab[] = [];
  for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
    for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
      const i = (blockY + dy) * width + (blockX + dx);
      labs.push(pixelLabs[i]);
    }
  }
  return labs;
};

/** Hue angle in degrees from Lab a,b (-180..180). */
const labHueDeg = (lab: Lab): number =>
  (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

/** Hue distance in degrees, 0..180. */
const hueDistanceDeg = (h1: number, h2: number): number => {
  let d = Math.abs(h1 - h2);
  if (d > 180) d = 360 - d;
  return d;
};

/**
 * Pick palette index closest to the block's saturation-weighted average Lab.
 * OPTIMIZED: Instead of computing deltaE2000 for every pixel x palette color
 * (O(pixels x palette)), we compute the block average Lab once and compare
 * only against palette entries (O(palette)).
 *
 * Improvements:
 * - Saturation weighting: vivid pixels count more than desaturated (gray) pixels.
 *   This prevents gray/off-white noise in a block from washing out a vibrant color.
 * - Hue tie-breaking: when two palette colors have similar distance, prefer
 *   the one whose hue is closer to the block's saturation-weighted hue.
 */
const bestPaletteIndexByMinTotalError = (
  pixelLabs: Lab[],
  paletteLab: Lab[],
): number => {
  const n = pixelLabs.length;
  if (n === 0) return 0;

  // Compute saturation-weighted block average Lab.
  // Chroma C* = sqrt(a^2 + b^2) in CIELAB; higher C* = more saturated.
  // Weight = 1 + 2 * (C_normalized), so vivid pixels get up to 3x more weight.
  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    const { L, a, b } = pixelLabs[i];
    const chroma = Math.sqrt(a * a + b * b); // 0..~180
    const weight = 1 + 2 * Math.min(1, chroma / 50); // 1 (gray) .. 3 (vivid)
    sumL += L * weight;
    sumA += a * weight;
    sumB += b * weight;
    totalWeight += weight;
  }

  const avgLab: Lab = {
    L: sumL / totalWeight,
    a: sumA / totalWeight,
    b: sumB / totalWeight,
  };
  const blockHue = labHueDeg(avgLab);

  // Find closest and second-closest palette color to block average
  let bestIndex = 0;
  let minDist = Infinity;
  let secondIndex = 0;
  let secondDist = Infinity;

  for (let k = 0; k < paletteLab.length; k++) {
    const d = deltaE2000(avgLab, paletteLab[k]);
    if (d < minDist) {
      secondDist = minDist;
      secondIndex = bestIndex;
      minDist = d;
      bestIndex = k;
    } else if (d < secondDist) {
      secondDist = d;
      secondIndex = k;
    }
  }

  // Hue tie-breaking: if second-best is within 5% of best, pick whichever
  // has closer hue to the block's saturation-weighted average hue.
  const tieThreshold = minDist * 1.05;
  if (secondDist <= tieThreshold && secondDist < Infinity) {
    const bestHue = labHueDeg(paletteLab[bestIndex]);
    const secondHue = labHueDeg(paletteLab[secondIndex]);
    if (
      hueDistanceDeg(blockHue, secondHue) < hueDistanceDeg(blockHue, bestHue)
    ) {
      return secondIndex;
    }
  }
  return bestIndex;
};

/**
 * Create mosaic blocks with optimal color matching.
 *
 * When useBlockAverage is true (default): each block gets the palette color
 * closest to the block's perceptual average (average in Lab). This gives
 * the most accurate dominant color per block and stable results (e.g. orange
 * area -> Orange, not Tomato).
 *
 * When useBlockAverage is false: raw image, each pixel -> closest palette
 * (CIEDE2000), block = majority color.
 */
export const createMosaicBlocks = (
  imageData: ImageData,
  palette: readonly RGB[],
  blockSize: number,
  useDithering = true,
  useBlockAverage = false,
): MosaicBlock[] => {
  void useDithering; // reserved for optional dither path
  const { width, height, data } = imageData;
  const paletteLab = palette.map((c) => rgbToLab(c));
  const blocks: MosaicBlock[] = [];
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  // Pre-calculate all pixel labs once
  const pixelLabs: Lab[] = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    pixelLabs[i] = rgbToLab({
      r: data[j],
      g: data[j + 1],
      b: data[j + 2],
    });
  }

  if (useBlockAverage) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const blockX = col * blockSize;
        const blockY = row * blockSize;
        
        let opaqueCount = 0;
        for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
          for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
            const idx = (blockY + dy) * width + (blockX + dx);
            if ((data[idx * 4 + 3] ?? 255) >= 128) opaqueCount++;
          }
        }

        const labs = blockPixelLabs(pixelLabs, width, height, blockX, blockY, blockSize);
        const bestIndex =
          labs.length > 0 && opaqueCount > 0
            ? bestPaletteIndexByMinTotalError(labs, paletteLab)
            : 0;
        blocks.push({
          x: blockX,
          y: blockY,
          paletteIndex: bestIndex,
          color: palette[bestIndex],
          isTransparent: opaqueCount === 0,
        });
      }
    }
    return blocks;
  }


  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const blockX = col * blockSize;
      const blockY = row * blockSize;
      const votes = new Array<number>(palette.length).fill(0);

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const px = blockX + dx;
          const py = blockY + dy;
          const idx = py * width + px;
          const i = idx * 4;
          const alpha = data[i + 3] ?? 255;
          if (alpha < 128) continue;
          
          const index = findPaletteIndexFromLab(pixelLabs[idx], paletteLab);
          votes[index]++;
        }
      }

      let bestIndex = 0;
      let maxVotes = 0;
      let opaqueCount = 0;
      for (let k = 0; k < votes.length; k++) {
        if (votes[k] > maxVotes) {
          maxVotes = votes[k];
          bestIndex = k;
        }
        opaqueCount += votes[k];
      }

      blocks.push({
        x: blockX,
        y: blockY,
        paletteIndex: bestIndex,
        color: palette[bestIndex],
        isTransparent: opaqueCount === 0,
      });
    }
  }

  return blocks;
};

/**
 * Reduce to only palette colors that appear in the blocks, and remap block
 * indices to 0..K-1. Number of colors (K) is thus determined by the image.
 * fixedIndices[i] = original full-palette index for reduced index i (for labels/names).
 */
export const reduceToUsedPalette = (
  blocks: MosaicBlock[],
  fullPalette: readonly RGB[],
): { palette: RGB[]; blocks: MosaicBlock[]; fixedIndices: number[] } => {
  const usedIndices = new Set<number>();
  for (const b of blocks) usedIndices.add(b.paletteIndex);
  const sorted = [...usedIndices].sort((a, b) => a - b);
  const oldToNew = new Map<number, number>();
  const palette: RGB[] = [];
  const fixedIndices: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const oldIdx = sorted[i];
    oldToNew.set(oldIdx, i);
    palette.push({ ...fullPalette[oldIdx] });
    fixedIndices.push(oldIdx);
  }
  const newBlocks = blocks.map((b) => {
    const newIndex = oldToNew.get(b.paletteIndex)!;
    return {
      ...b,
      paletteIndex: newIndex,
      color: palette[newIndex],
    };
  });
  return { palette, blocks: newBlocks, fixedIndices };
};

/**
 * Deduplicate a dynamic palette by merging similar colors using Delta E 2000.
 *
 * Checks every color against every other color. If dist(A, B) < threshold,
 * they are considered the same. We keep the first one and map the second to it.
 *
 * threshold default ~5.0 is a good starting point for "visually almost identical".
 */
export const deduplicatePaletteDynamic = (
  palette: RGB[],
  threshold = 0.06, // OKLab Euclidean scale (was 6.0 in CIEDE2000 scale)
): { palette: RGB[]; indexMap: number[] } => {
  const paletteLab = palette.map((c) => rgbToLab(c));
  const uniqueIndices: number[] = [];
  const indexMap = new Array<number>(palette.length).fill(-1);

  for (let i = 0; i < palette.length; i++) {
    if (indexMap[i] !== -1) continue; // already merged

    // This color is new/unique so far
    const newIdx = uniqueIndices.length;
    uniqueIndices.push(i);
    indexMap[i] = newIdx;

    // Look for other similar colors to merge into this one
    for (let j = i + 1; j < palette.length; j++) {
      if (indexMap[j] !== -1) continue; // already merged
      const d = deltaE2000(paletteLab[i], paletteLab[j]);
      if (d < threshold) {
        // Never merge near-white with non-near-white (prevents white face -> gray background)
        const iIsNW = isNearWhite(palette[i]);
        const jIsNW = isNearWhite(palette[j]);
        if (iIsNW !== jIsNW) continue;
        indexMap[j] = newIdx;
      }
    }
  }

  const newPalette = uniqueIndices.map((i) => palette[i]);
  return { palette: newPalette, indexMap };
};

/**
 * Merge minor colors (used in very few blocks) into the nearest major color.
 * This prevents "speckle" or "dust" colors (e.g. 1-2 pixels) from appearing in the final palette.
 */
export const mergeMinorColors = (
  blocks: MosaicBlock[],
  palette: readonly RGB[],
  minCount: number,
): MosaicBlock[] => {
  if (blocks.length === 0 || palette.length === 0) return blocks;

  // 1. Count usage
  const counts = new Array<number>(palette.length).fill(0);
  for (const b of blocks) {
    counts[b.paletteIndex]++;
  }

  // 2. Identify major vs minor
  const majorIndices: number[] = [];
  const minorIndices: number[] = [];
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] >= minCount) {
      majorIndices.push(i);
    } else if (counts[i] > 0) {
      minorIndices.push(i);
    }
  }

  // Edge case: No major colors (image is too small or distinct), keep as is
  if (majorIndices.length === 0) return blocks;

  // Optim: If no minor colors, nothing to do
  if (minorIndices.length === 0) return blocks;

  // 3. Map minor -> closest major
  const paletteLab = palette.map((c) => rgbToLab(c));
  const remap = new Map<number, number>();

  for (const minorIdx of minorIndices) {
    // Never merge near-white into non-white (keep white as distinct color)
    if (isNearWhite(palette[minorIdx])) continue;

    let bestMajorIdx = majorIndices[0];
    let minDiff = Infinity;
    const minorLab = paletteLab[minorIdx];

    for (const majorIdx of majorIndices) {
      const d = deltaE2000(minorLab, paletteLab[majorIdx]);
      if (d < minDiff) {
        minDiff = d;
        bestMajorIdx = majorIdx;
      }
    }
    remap.set(minorIdx, bestMajorIdx);
  }

  // 4. Update blocks
  return blocks.map((b) => {
    if (remap.has(b.paletteIndex)) {
      const newIndex = remap.get(b.paletteIndex)!;
      return {
        ...b,
        paletteIndex: newIndex,
        color: palette[newIndex],
      };
    }
    return b;
  });
};

/** Border and padding as fraction of min canvas dimension (for numbered template) */
/** Outer border thicker (0.06) to sync with inner cell gap (CELL_GAP_FRAC) */
const NUMBERED_TEMPLATE_BORDER_FRAC = 0.06;
const NUMBERED_TEMPLATE_PADDING_FRAC = 0.028;
/** Outer border same dark tone as grid gaps, drawn as filled frame so it is bold and not cut */
const NUMBERED_TEMPLATE_OUTER_BORDER_COLOR = "#252525";

/** Gap between cells as fraction of block size (creates "border" effect) */
const NUMBERED_TEMPLATE_CELL_GAP_FRAC = 0.06;
/** Corner radius as fraction of cell size (after gap) */
const NUMBERED_TEMPLATE_CELL_RADIUS_FRAC = 0.12;
/** Dark background in content area so gaps between cells are visible */
const NUMBERED_TEMPLATE_GRID_BG = "#252525";

/**
 * Draw a rounded rect on ctx (path only; caller sets fill/stroke)
 */
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  const r2 = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r2, y);
  ctx.lineTo(x + w - r2, y);
  ctx.arcTo(x + w, y, x + w, y + r2, r2);
  ctx.lineTo(x + w, y + h - r2);
  ctx.arcTo(x + w, y + h, x + w - r2, y + h, r2);
  ctx.lineTo(x + r2, y + h);
  ctx.arcTo(x, y + h, x, y + h - r2, r2);
  ctx.lineTo(x, y + r2);
  ctx.arcTo(x, y, x + r2, y, r2);
  ctx.closePath();
};

/** Grid extent from blocks so all cells fit (no bottom/right row cut) */
const getGridExtent = (
  blocks: MosaicBlock[],
  blockSize: number,
  fallbackW: number,
  fallbackH: number,
): { gridWidth: number; gridHeight: number } => {
  if (blocks.length === 0)
    return { gridWidth: fallbackW, gridHeight: fallbackH };
  const maxX = Math.max(...blocks.map((b) => b.x));
  const maxY = Math.max(...blocks.map((b) => b.y));
  return { gridWidth: maxX + blockSize, gridHeight: maxY + blockSize };
};

/**
 * Render numbered template to canvas (cells as spaced rounded squares with numbers)
 * Fits full grid extent so bottom row and right column are never cut.
 */
export const renderNumberedTemplateToCanvas = (
  canvas: HTMLCanvasElement,
  blocks: MosaicBlock[],
  blockSize: number,
  contentWidth: number,
  contentHeight: number,
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight,
  );

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(
    3,
    Math.round(minDim * NUMBERED_TEMPLATE_BORDER_FRAC),
  );
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  /* Outer border: filled frame (same color as grid, bold, never cut) */
  ctx.fillStyle = NUMBERED_TEMPLATE_OUTER_BORDER_COLOR;
  ctx.fillRect(0, 0, width, borderWidth);
  ctx.fillRect(0, height - borderWidth, width, borderWidth);
  ctx.fillRect(0, borderWidth, borderWidth, height - 2 * borderWidth);
  ctx.fillRect(
    width - borderWidth,
    borderWidth,
    borderWidth,
    height - 2 * borderWidth,
  );

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    contentAreaWidth,
    contentAreaHeight,
  );

  const originX = borderWidth + padding + offsetX;
  const originY = borderWidth + padding + offsetY;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  const gap = Math.max(1, blockSize * NUMBERED_TEMPLATE_CELL_GAP_FRAC);
  const cellSize = blockSize - gap;
  const radius = Math.max(0, cellSize * NUMBERED_TEMPLATE_CELL_RADIUS_FRAC);

  ctx.fillStyle = NUMBERED_TEMPLATE_GRID_BG;
  ctx.fillRect(0, 0, gridWidth, gridHeight);

  ctx.fillStyle = "#fafafa";
  for (const block of blocks) {
    const x = block.x + gap / 2;
    const y = block.y + gap / 2;
    roundRect(ctx, x, y, cellSize, cellSize, radius);
    ctx.fill();
  }

  const fontSize = Math.max(12, Math.round(cellSize * 0.75));
  ctx.font = `${fontSize}px 400 "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#5a5a5a";

  for (const block of blocks) {
    if (isWhite(block.color)) continue;
    const cx = block.x + blockSize / 2;
    const cy = block.y + blockSize / 2;
    const label = paletteIndexToLabel(block.paletteIndex);
    ctx.fillText(label, cx, cy);
  }

  ctx.restore();
};

/**
 * Render mosaic with colors and optional numbers + grid
 * Same border/padding as numbered template for consistent preview/export
 */
export const renderMosaicWithNumbersToCanvas = (
  canvas: HTMLCanvasElement,
  blocks: MosaicBlock[],
  blockSize: number,
  showGrid: boolean,
  contentWidth: number,
  contentHeight: number,
  transparentBg: boolean = false
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight,
  );

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(
    3,
    Math.round(minDim * NUMBERED_TEMPLATE_BORDER_FRAC),
  );
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  if (!transparentBg) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    /* Outer border: same filled frame as numbered template (sync with inner edges) */
    ctx.fillStyle = NUMBERED_TEMPLATE_OUTER_BORDER_COLOR;
    ctx.fillRect(0, 0, width, borderWidth);
    ctx.fillRect(0, height - borderWidth, width, borderWidth);
    ctx.fillRect(0, borderWidth, borderWidth, height - 2 * borderWidth);
    ctx.fillRect(
      width - borderWidth,
      borderWidth,
      borderWidth,
      height - 2 * borderWidth,
    );
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    contentAreaWidth,
    contentAreaHeight,
  );

  const originX = borderWidth + padding + offsetX;
  const originY = borderWidth + padding + offsetY;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  const fontSize = Math.max(10, blockSize * 0.8);
  ctx.font = `${fontSize}px 400 "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const block of blocks) {
    const { r, g, b } = block.color;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(block.x, block.y, blockSize, blockSize);

    if (!isWhite(block.color)) {
      const label = paletteIndexToLabel(block.paletteIndex);
      const cx = block.x + blockSize / 2;
      const cy = block.y + blockSize / 2;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      ctx.fillStyle = brightness < 128 ? "#ffffff" : "#333333";
      ctx.fillText(label, cx, cy);
    }
  }

  if (showGrid) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = Math.max(0.5, 1 / scale);
    for (const block of blocks) {
      ctx.strokeRect(block.x, block.y, blockSize, blockSize);
    }
  }

  ctx.restore();
};

/**
 * Render mosaic to canvas (colors only, no numbers) - for export
 * Fits content into canvas dimensions (centered) for consistent preview/export
 */
export const renderMosaicToCanvas = (
  canvas: HTMLCanvasElement,
  blocks: MosaicBlock[],
  blockSize: number,
  showGrid: boolean,
  contentWidth: number,
  contentHeight: number,
  transparentBg: boolean = false
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight,
  );

  const { width, height } = canvas;
  if (!transparentBg) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    width,
    height,
  );

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const block of blocks) {
    const { r, g, b } = block.color;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(block.x, block.y, blockSize, blockSize);
  }

  if (showGrid) {
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = Math.max(0.5, 1 / scale);
    for (const block of blocks) {
      ctx.strokeRect(block.x, block.y, blockSize, blockSize);
    }
  }

  ctx.restore();
};
