/**
 * Pixelate / mosaic block generation and canvas rendering
 */

import type { RGB } from './utils';
import { paletteIndexToLabel, getLetterSizeFit } from './utils';

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

/** Delta E 76 – perceptual color distance in Lab (lower = more similar) */
const deltaE76 = (
  lab1: { L: number; a: number; b: number },
  lab2: { L: number; a: number; b: number }
): number => {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  return Math.hypot(dL, da, db);
};

/**
 * Find palette index whose color is perceptually closest to the given color.
 * Uses Lab space + Delta E 76 so matching matches human perception.
 */
const findPaletteIndex = (color: RGB, palette: RGB[]): number => {
  const colorLab = rgbToLab(color);
  let minDeltaE = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < palette.length; i++) {
    const paletteLab = rgbToLab(palette[i]);
    const d = deltaE76(colorLab, paletteLab);
    if (d < minDeltaE) {
      minDeltaE = d;
      bestIndex = i;
    }
  }
  return bestIndex;
};

/**
 * Create mosaic blocks: each block gets the palette color that appears most
 * often when mapping every pixel in the block to its closest palette color.
 * This preserves distinct hues (green, purple, etc.) in rainbow/striped images
 * instead of blending them into an average.
 */
export const createMosaicBlocks = (
  imageData: ImageData,
  palette: RGB[],
  blockSize: number
): MosaicBlock[] => {
  const { width, height, data } = imageData;
  const blocks: MosaicBlock[] = [];
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

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
          const pixelColor: RGB = {
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          };
          const index = findPaletteIndex(pixelColor, palette);
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
  fullPalette: readonly RGB[]
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

/** Border and padding as fraction of min canvas dimension (for numbered template) */
/** Outer border thicker (0.06) to sync with inner cell gap (CELL_GAP_FRAC) */
const NUMBERED_TEMPLATE_BORDER_FRAC = 0.06;
const NUMBERED_TEMPLATE_PADDING_FRAC = 0.028;
/** Outer border same dark tone as grid gaps, drawn as filled frame so it is bold and not cut */
const NUMBERED_TEMPLATE_OUTER_BORDER_COLOR = '#252525';

/** Gap between cells as fraction of block size (creates "border" effect) */
const NUMBERED_TEMPLATE_CELL_GAP_FRAC = 0.06;
/** Corner radius as fraction of cell size (after gap) */
const NUMBERED_TEMPLATE_CELL_RADIUS_FRAC = 0.12;
/** Dark background in content area so gaps between cells are visible */
const NUMBERED_TEMPLATE_GRID_BG = '#252525';

/**
 * Draw a rounded rect on ctx (path only; caller sets fill/stroke)
 */
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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
  fallbackH: number
): { gridWidth: number; gridHeight: number } => {
  if (blocks.length === 0) return { gridWidth: fallbackW, gridHeight: fallbackH };
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
  contentHeight: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight
  );

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(3, Math.round(minDim * NUMBERED_TEMPLATE_BORDER_FRAC));
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  /* Outer border: filled frame (same color as grid, bold, never cut) */
  ctx.fillStyle = NUMBERED_TEMPLATE_OUTER_BORDER_COLOR;
  ctx.fillRect(0, 0, width, borderWidth);
  ctx.fillRect(0, height - borderWidth, width, borderWidth);
  ctx.fillRect(0, borderWidth, borderWidth, height - 2 * borderWidth);
  ctx.fillRect(width - borderWidth, borderWidth, borderWidth, height - 2 * borderWidth);

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    contentAreaWidth,
    contentAreaHeight
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

  ctx.fillStyle = '#fafafa';
  for (const block of blocks) {
    const x = block.x + gap / 2;
    const y = block.y + gap / 2;
    roundRect(ctx, x, y, cellSize, cellSize, radius);
    ctx.fill();
  }

  const fontSize = Math.max(12, Math.round(cellSize * 0.55));
  ctx.font = `${fontSize}px 400 "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a5a5a';

  for (const block of blocks) {
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
  contentHeight: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight
  );

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(3, Math.round(minDim * NUMBERED_TEMPLATE_BORDER_FRAC));
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  /* Outer border: same filled frame as numbered template (sync with inner edges) */
  ctx.fillStyle = NUMBERED_TEMPLATE_OUTER_BORDER_COLOR;
  ctx.fillRect(0, 0, width, borderWidth);
  ctx.fillRect(0, height - borderWidth, width, borderWidth);
  ctx.fillRect(0, borderWidth, borderWidth, height - 2 * borderWidth);
  ctx.fillRect(width - borderWidth, borderWidth, borderWidth, height - 2 * borderWidth);

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    contentAreaWidth,
    contentAreaHeight
  );

  const originX = borderWidth + padding + offsetX;
  const originY = borderWidth + padding + offsetY;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  const fontSize = Math.max(10, blockSize * 0.6);
  ctx.font = `${fontSize}px 400 "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const block of blocks) {
    const { r, g, b } = block.color;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(block.x, block.y, blockSize, blockSize);

    const label = paletteIndexToLabel(block.paletteIndex);
    const cx = block.x + blockSize / 2;
    const cy = block.y + blockSize / 2;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    ctx.fillStyle = brightness < 128 ? '#ffffff' : '#333333';
    ctx.fillText(label, cx, cy);
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
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
  contentHeight: number
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { gridWidth, gridHeight } = getGridExtent(
    blocks,
    blockSize,
    contentWidth,
    contentHeight
  );

  const { width, height } = canvas;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const { scale, offsetX, offsetY } = getLetterSizeFit(
    gridWidth,
    gridHeight,
    width,
    height
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
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(0.5, 1 / scale);
    for (const block of blocks) {
      ctx.strokeRect(block.x, block.y, blockSize, blockSize);
    }
  }

  ctx.restore();
};
