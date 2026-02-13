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

/**
 * Find closest palette index for a color
 */
const findPaletteIndex = (color: RGB, palette: RGB[]): number => {
  let minDist = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = color.r - p.r;
    const dg = color.g - p.g;
    const db = color.b - p.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      bestIndex = i;
    }
  }
  return bestIndex;
};

/**
 * Create mosaic blocks from quantized image data
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

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const px = blockX + dx;
          const py = blockY + dy;
          const i = (py * width + px) * 4;
          sumR += data[i];
          sumG += data[i + 1];
          sumB += data[i + 2];
          count++;
        }
      }

      if (count === 0) continue;

      const avgR = Math.round(sumR / count);
      const avgG = Math.round(sumG / count);
      const avgB = Math.round(sumB / count);
      const avgColor: RGB = { r: avgR, g: avgG, b: avgB };
      const paletteIndex = findPaletteIndex(avgColor, palette);
      const color = palette[paletteIndex];

      blocks.push({
        x: blockX,
        y: blockY,
        paletteIndex,
        color,
      });
    }
  }

  return blocks;
};

/** Border and padding as fraction of min canvas dimension (for numbered template) */
const NUMBERED_TEMPLATE_BORDER_FRAC = 0.04;
const NUMBERED_TEMPLATE_PADDING_FRAC = 0.028;

/**
 * Render numbered template to canvas (outline only, with numbers)
 * Fits content into canvas with thick outer border and padding for preview/export
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

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(2, minDim * NUMBERED_TEMPLATE_BORDER_FRAC);
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    contentWidth,
    contentHeight,
    contentAreaWidth,
    contentAreaHeight
  );

  const originX = borderWidth + padding + offsetX;
  const originY = borderWidth + padding + offsetY;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);

  const fontSize = Math.max(12, Math.round(blockSize * 0.6));
  ctx.font = `${fontSize}px 400 "JetBrains Mono", "SF Mono", Monaco, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8a8a8a';
  ctx.strokeStyle = '#9a9a9a';
  ctx.lineWidth = Math.max(0.5, 1 / scale);

  for (const block of blocks) {
    const cx = block.x + blockSize / 2;
    const cy = block.y + blockSize / 2;
    const label = paletteIndexToLabel(block.paletteIndex);
    ctx.fillText(label, cx, cy);
    ctx.strokeRect(block.x, block.y, blockSize, blockSize);
  }

  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width - borderWidth,
    height - borderWidth
  );
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

  const { width, height } = canvas;
  const minDim = Math.min(width, height);
  const borderWidth = Math.max(2, minDim * NUMBERED_TEMPLATE_BORDER_FRAC);
  const padding = Math.max(4, minDim * NUMBERED_TEMPLATE_PADDING_FRAC);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const contentAreaWidth = width - 2 * borderWidth - 2 * padding;
  const contentAreaHeight = height - 2 * borderWidth - 2 * padding;
  const { scale, offsetX, offsetY } = getLetterSizeFit(
    contentWidth,
    contentHeight,
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

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(
    borderWidth / 2,
    borderWidth / 2,
    width - borderWidth,
    height - borderWidth
  );
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

  const { width, height } = canvas;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const { scale, offsetX, offsetY } = getLetterSizeFit(contentWidth, contentHeight, width, height);

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
