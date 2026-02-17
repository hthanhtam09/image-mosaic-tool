/**
 * Pixelate / mosaic block generation and canvas rendering
 */

import type { RGB } from "./utils";
import { paletteIndexToLabel, getLetterSizeFit, isWhite } from "./utils";

export interface MosaicBlock {
  x: number;
  y: number;
  paletteIndex: number;
  color: RGB;
}

/** sRGB (0–255) channel to linear */
const srgbToLinear = (c: number): number => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

/** RGB (0–255) to CIE Lab (D65) for perceptual comparison */
const rgbToLab = (rgb: RGB): { L: number; a: number; b: number } => {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const xn = 0.95047;
  const yn = 1;
  const zn = 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.pow(t, 1 / 3) : t / 0.128452 + 0.137931;
  const L = 116 * f(y / yn) - 16;
  const a = 500 * (f(x / xn) - f(y / yn));
  const bLab = 200 * (f(y / yn) - f(z / zn));
  return { L, a, b: bLab };
};

type Lab = { L: number; a: number; b: number };

/**
 * Delta E 2000 (CIEDE2000) – better perceptual match than Delta E 76,
 * especially for orange/red and similar hues so palette choice is correct.
 */
const deltaE2000 = (lab1: Lab, lab2: Lab): number => {
  const L1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const G =
    0.5 *
    (1 -
      Math.sqrt(
        Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7)),
      ));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = Math.atan2(b1, a1p);
  const h2p = Math.atan2(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (C1p * C2p !== 0) {
    if (dhp > Math.PI) dhp -= 2 * Math.PI;
    else if (dhp < -Math.PI) dhp += 2 * Math.PI;
  }
  const dHp =
    2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2);

  const Lpbar = (L1 + L2) / 2;
  const Cpbar = (C1p + C2p) / 2;
  let hpbar = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > Math.PI) hpbar += 2 * Math.PI;
    hpbar /= 2;
  }

  const T =
    1 -
    0.17 * Math.cos(hpbar - (30 * Math.PI) / 180) +
    0.24 * Math.cos(2 * hpbar) +
    0.32 * Math.cos(3 * hpbar + (6 * Math.PI) / 180) -
    0.2 * Math.cos(4 * hpbar - (63 * Math.PI) / 180);
  const dtheta = 30 * Math.exp(-Math.pow(hpbar - (275 * Math.PI) / 180, 2));
  const Rc =
    2 *
    Math.sqrt(
      Math.pow(Cpbar, 7) / (Math.pow(Cpbar, 7) + Math.pow(25, 7)),
    );
  const Sl =
    1 +
    (0.015 * Math.pow(Lpbar - 50, 2)) /
      Math.sqrt(20 + Math.pow(Lpbar - 50, 2));
  const Sc = 1 + 0.045 * Cpbar;
  const Sh = 1 + 0.015 * Cpbar * T;
  const Rt = -Math.sin(2 * dtheta * (Math.PI / 180)) * Rc;

  return Math.sqrt(
    Math.pow(dLp / Sl, 2) +
      Math.pow(dCp / Sc, 2) +
      Math.pow(dHp / Sh, 2) +
      Rt * (dCp / Sc) * (dHp / Sh),
  );
};

/**
 * Find palette index whose color is perceptually closest to the given Lab.
 * Uses CIEDE2000; paletteLab is pre-computed to avoid repeated rgbToLab.
 */
const findPaletteIndexFromLab = (
  lab: Lab,
  paletteLab: Lab[],
): number => {
  let minDeltaE = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < paletteLab.length; i++) {
    const d = deltaE2000(lab, paletteLab[i]);
    if (d < minDeltaE) {
      minDeltaE = d;
      bestIndex = i;
    }
  }
  return bestIndex;
};

/**
 * Find palette index for RGB (used by dithering). Converts to Lab then uses paletteLab.
 */
const findPaletteIndex = (
  color: RGB,
  palette: readonly RGB[],
  paletteLab: Lab[],
): number => {
  const colorLab = rgbToLab(color);
  return findPaletteIndexFromLab(colorLab, paletteLab);
};

/**
 * Floyd–Steinberg dithering (reserved for optional mode). Uses paletteLab + CIEDE2000.
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

  const addError = (x: number, y: number, er: number, eg: number, eb: number, factor: number) => {
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
      const pixelColor: RGB = { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
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
  imageData: ImageData,
  blockX: number,
  blockY: number,
  blockSize: number,
): Lab[] => {
  const { width, height, data } = imageData;
  const labs: Lab[] = [];
  for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
    for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
      const i = ((blockY + dy) * width + (blockX + dx)) * 4;
      const alpha = data[i + 3] ?? 255;
      if (alpha < 128) continue; // bỏ qua pixel trong suốt, tránh kéo lệch màu
      labs.push(
        rgbToLab({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
        }),
      );
    }
  }
  return labs;
};

/** Hue angle in degrees from Lab a,b (-180..180). Cùng họ màu khi chênh lệch nhỏ. */
const labHueDeg = (lab: Lab): number =>
  (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

/** Khoảng cách hue (độ), 0..180. */
const hueDistanceDeg = (h1: number, h2: number): number => {
  let d = Math.abs(h1 - h2);
  if (d > 180) d = 360 - d;
  return d;
};

/**
 * Pick palette index that minimizes total perceptual error in the block.
 * Tie-break: khi hai màu có sai số gần nhau (< 5%), ưu tiên màu có hue gần
 * với trung bình block hơn → vùng đỏ không bị lẫn Dark red/Brown.
 */
const bestPaletteIndexByMinTotalError = (
  pixelLabs: Lab[],
  paletteLab: Lab[],
): number => {
  const n = pixelLabs.length;
  if (n === 0) return 0;
  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumL += pixelLabs[i].L;
    sumA += pixelLabs[i].a;
    sumB += pixelLabs[i].b;
  }
  const avgLab: Lab = {
    L: sumL / n,
    a: sumA / n,
    b: sumB / n,
  };
  const blockHue = labHueDeg(avgLab);

  let bestIndex = 0;
  let minTotalError = Infinity;
  let secondIndex = 0;
  let secondError = Infinity;
  const errors: number[] = [];

  for (let k = 0; k < paletteLab.length; k++) {
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += deltaE2000(pixelLabs[i], paletteLab[k]);
    }
    errors[k] = total;
    if (total < minTotalError) {
      secondError = minTotalError;
      secondIndex = bestIndex;
      minTotalError = total;
      bestIndex = k;
    } else if (total < secondError) {
      secondError = total;
      secondIndex = k;
    }
  }

  const tieThreshold = minTotalError * 1.05;
  if (secondError <= tieThreshold && secondError < Infinity) {
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
 * closest to the block’s perceptual average (average in Lab). This gives
 * the most accurate dominant color per block and stable results (e.g. orange
 * area → Orange, not Tomato).
 *
 * When useBlockAverage is false (default): raw image, mỗi pixel → palette gần nhất
 * (CIEDE2000), block = màu đa số. Không smooth — màu đúng ảnh import, tránh lệch.
 */
export const createMosaicBlocks = (
  imageData: ImageData,
  palette: readonly RGB[],
  blockSize: number,
  useDithering = true,
  useBlockAverage = false,
): MosaicBlock[] => {
  void useDithering; // reserved for optional dither path
  const { width, height } = imageData;
  const paletteLab = palette.map((c) => rgbToLab(c));
  const blocks: MosaicBlock[] = [];
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  if (useBlockAverage) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const blockX = col * blockSize;
        const blockY = row * blockSize;
        const pixelLabs = blockPixelLabs(
          imageData,
          blockX,
          blockY,
          blockSize,
        );
        const bestIndex =
          pixelLabs.length > 0
            ? bestPaletteIndexByMinTotalError(pixelLabs, paletteLab)
            : 0;
        blocks.push({
          x: blockX,
          y: blockY,
          paletteIndex: bestIndex,
          color: palette[bestIndex],
        });
      }
    }
    return blocks;
  }

  // Ảnh gốc: mỗi pixel → palette gần nhất (CIEDE2000), block = màu đa số. Không smooth.
  const data = imageData.data;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const blockX = col * blockSize;
      const blockY = row * blockSize;
      const votes = new Array<number>(palette.length).fill(0);

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const px = blockX + dx;
          const py = blockY + dy;
          const i = (py * width + px) * 4;
          const alpha = data[i + 3] ?? 255;
          if (alpha < 128) continue;
          const pixelColor: RGB = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          };
          const index = findPaletteIndex(pixelColor, palette, paletteLab);
          votes[index]++;
        }
      }

      let bestIndex = 0;
      let maxVotes = 0;
      for (let k = 0; k < votes.length; k++) {
        if (votes[k] > maxVotes) {
          maxVotes = votes[k];
          bestIndex = k;
        }
      }

      blocks.push({
        x: blockX,
        y: blockY,
        paletteIndex: bestIndex,
        color: palette[bestIndex],
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
  threshold = 6.0,
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

  const fontSize = Math.max(12, Math.round(cellSize * 0.55));
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

  const fontSize = Math.max(10, blockSize * 0.6);
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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

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
