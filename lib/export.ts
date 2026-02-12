/**
 * Export utilities for palette and numbered template
 */

import type { RGB } from './utils';
import type { MosaicBlock } from './pixelate';
import { rgbToHex, paletteIndexToLabel, LETTER_OUTPUT_WIDTH, LETTER_OUTPUT_HEIGHT } from './utils';
import { renderNumberedTemplateToCanvas } from './pixelate';

const downloadCanvasAsImage = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

/**
 * Export palette as PNG with color swatches and labels
 */
export const exportPalette = (palette: RGB[]): void => {
  const swatchSize = 80;
  const cols = Math.min(5, palette.length);
  const rows = Math.ceil(palette.length / cols);
  const padding = 20;
  const width = cols * swatchSize + (cols + 1) * padding;
  const height = rows * (swatchSize + 40) + (rows + 1) * padding;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';

  palette.forEach((color, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = padding + col * (swatchSize + padding);
    const y = padding + row * (swatchSize + 40 + padding);

    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(x, y, swatchSize, swatchSize);
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(x, y, swatchSize, swatchSize);

    ctx.fillStyle = '#333';
    ctx.fillText(paletteIndexToLabel(index), x + swatchSize / 2, y + swatchSize + 20);
    ctx.fillText(rgbToHex(color), x + swatchSize / 2, y + swatchSize + 38);
  });

  downloadCanvasAsImage(canvas, `palette-${Date.now()}.png`);
};

/**
 * Export numbered template as PNG - 8.5" x 11" at 150 DPI
 */
export const exportNumberedTemplate = (
  contentWidth: number,
  contentHeight: number,
  mosaicBlocks: MosaicBlock[],
  blockSize: number
): void => {
  const canvas = document.createElement('canvas');
  canvas.width = LETTER_OUTPUT_WIDTH;
  canvas.height = LETTER_OUTPUT_HEIGHT;
  renderNumberedTemplateToCanvas(canvas, mosaicBlocks, blockSize, contentWidth, contentHeight);
  downloadCanvasAsImage(canvas, `template-${Date.now()}.png`);
};
