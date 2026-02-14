/**
 * Export utilities for palette and numbered template
 */

import type { RGB } from "./utils";
import type { MosaicBlock } from "./pixelate";
import {
  paletteIndexToLabel,
  LETTER_OUTPUT_WIDTH,
  LETTER_OUTPUT_HEIGHT,
} from "./utils";
import { getPaletteColorName } from "./palette";
import { renderNumberedTemplateToCanvas } from "./pixelate";
import { renderToCanvas, PAGE_WIDTH_PX, PAGE_HEIGHT_PX } from "./grid";
import type { GridConfig, ExportMode } from "./grid";

const downloadCanvasAsImage = (
  canvas: HTMLCanvasElement,
  filename: string,
): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

/** Palette export: row height, padding, square box (text only, no fill) */
const PALETTE_ROW_HEIGHT = 44;
const PALETTE_PADDING = 24;
const PALETTE_BOX_SIZE = 32;
const GAP_NAME_TO_BOX = 10;

/**
 * Export palette as PNG: white background, vertical list.
 * Each row: English color name (right-aligned next to box), then a box with only number/letter (no fill).
 * fixedIndices: for each palette[i], the index in the full fixed palette (for correct names).
 */
export const exportPalette = (
  palette: RGB[],
  fixedIndices?: number[],
): void => {
  const rows = palette.length;
  const width = 280;
  const height = rows * PALETTE_ROW_HEIGHT + 2 * PALETTE_PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "middle";
  const boxX = width - PALETTE_PADDING - PALETTE_BOX_SIZE;
  const nameRightX = boxX - GAP_NAME_TO_BOX;
  const rowCenterY = (i: number) =>
    PALETTE_PADDING + (i + 0.5) * PALETTE_ROW_HEIGHT;

  palette.forEach((color, index) => {
    const yCenter = rowCenterY(index);
    const boxY = yCenter - PALETTE_BOX_SIZE / 2;

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, PALETTE_BOX_SIZE, PALETTE_BOX_SIZE);

    const label = paletteIndexToLabel(index);
    ctx.fillStyle = "#222";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, boxX + PALETTE_BOX_SIZE / 2, yCenter);

    const nameIndex = fixedIndices?.[index] ?? index;
    const colorName =
      getPaletteColorName(nameIndex) || `${color.r}, ${color.g}, ${color.b}`;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(colorName, nameRightX, yCenter);
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
  blockSize: number,
): void => {
  const canvas = document.createElement("canvas");
  canvas.width = LETTER_OUTPUT_WIDTH;
  canvas.height = LETTER_OUTPUT_HEIGHT;
  renderNumberedTemplateToCanvas(
    canvas,
    mosaicBlocks,
    blockSize,
    contentWidth,
    contentHeight,
  );
  downloadCanvasAsImage(canvas, `template-${Date.now()}.png`);
};

/**
 * Export grid template – 8.5" x 11" at 300 DPI. White paper + grid only.
 */
export const exportGridTemplate = (
  gridConfig: GridConfig,
  cells: Array<{ row: number; col: number; number: string; colorHex?: string }>,
  options: { exportMode: ExportMode; showNumbers: boolean },
): void => {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH_PX;
  canvas.height = PAGE_HEIGHT_PX;
  renderToCanvas(canvas, gridConfig, cells, {
    showNumbers: options.showNumbers,
    exportMode: options.exportMode,
  });
  const suffix =
    options.exportMode === "noNumber"
      ? "no-numbers"
      : options.exportMode === "colored"
        ? "colored"
        : "template";
  downloadCanvasAsImage(canvas, `grid-${suffix}-${Date.now()}.png`);
};
