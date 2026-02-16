/**
 * PaletteRenderer – renders a color palette column for export.
 * Swatches match the grid shape (circle / square / diamond).
 * Below each swatch is a droplet icon whose fill level represents
 * the relative frequency of that color in the image.
 */

import type { GridType } from "./types";
import type { RGB } from "../utils";
import { paletteIndexToLabel, isWhite } from "../utils";
import { getPaletteColorName } from "../palette";
import { PRINT_DPI } from "./constants";

/* ── Layout constants (at 300 DPI) ──────────────────────────── */

const PALETTE_COL_WIDTH = Math.round(1.6 * PRINT_DPI);   // ~480px ≈ 1.6″
const SWATCH_SIZE       = Math.round(0.32 * PRINT_DPI);   // ~96px
const DROPLET_HEIGHT    = Math.round(0.22 * PRINT_DPI);   // ~66px
const DROPLET_WIDTH     = Math.round(0.15 * PRINT_DPI);   // ~45px
const ROW_GAP           = Math.round(0.08 * PRINT_DPI);   // ~24px gap between rows
const SWATCH_DROPLET_GAP = Math.round(0.03 * PRINT_DPI);  // gap between swatch and droplet
const TOP_PADDING       = Math.round(0.35 * PRINT_DPI);   // match grid padding
const LABEL_FONT_SIZE   = Math.round(0.11 * PRINT_DPI);   // ~33px
const NAME_FONT_SIZE    = Math.round(0.07 * PRINT_DPI);   // ~21px

/** Height of a single palette row */
const rowHeight = () => SWATCH_SIZE + SWATCH_DROPLET_GAP + DROPLET_HEIGHT + ROW_GAP;

/* ── Shape drawing helpers ──────────────────────────────────── */

const drawCircleSwatch = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  fillColor: string, strokeColor: string,
) => {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const drawSquareSwatch = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  fillColor: string, strokeColor: string,
) => {
  const r = size * 0.12; // rounded corner radius
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + size - r, y);
  ctx.quadraticCurveTo(x + size, y, x + size, y + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x + r, y + size);
  ctx.quadraticCurveTo(x, y + size, x, y + size - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
};

const drawDiamondSwatch = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, halfSize: number,
  fillColor: string, strokeColor: string,
) => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - halfSize);
  ctx.lineTo(cx + halfSize, cy);
  ctx.lineTo(cx, cy + halfSize);
  ctx.lineTo(cx - halfSize, cy);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
};

/* ── Droplet helper ────────────────────────────────────────── */

/**
 * Draw a water-droplet shape. fillRatio 0..1 fills from bottom.
 */
const drawDroplet = (
  ctx: CanvasRenderingContext2D,
  cx: number, topY: number,
  width: number, height: number,
  fillRatio: number,
  fillColor: string,
) => {
  // Droplet shape: pointed top, rounded bottom
  const tipY = topY;
  const bottomY = topY + height;
  const halfW = width / 2;
  const bodyTopY = topY + height * 0.35; // where the body starts

  // Build path
  const buildDropletPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    // Left curve from tip to bottom
    ctx.bezierCurveTo(
      cx - halfW * 0.3, bodyTopY,
      cx - halfW, bodyTopY + (bottomY - bodyTopY) * 0.2,
      cx - halfW, bodyTopY + (bottomY - bodyTopY) * 0.55,
    );
    // Bottom arc
    ctx.arc(cx, bodyTopY + (bottomY - bodyTopY) * 0.55, halfW, Math.PI, 0, false);
    // Right curve from bottom to tip
    ctx.bezierCurveTo(
      cx + halfW, bodyTopY + (bottomY - bodyTopY) * 0.2,
      cx + halfW * 0.3, bodyTopY,
      cx, tipY,
    );
    ctx.closePath();
  };

  // Fill portion (clipped from bottom)
  if (fillRatio > 0) {
    ctx.save();
    buildDropletPath();
    ctx.clip();

    const fillStartY = bottomY - (bottomY - tipY) * fillRatio;
    ctx.fillStyle = fillColor;
    ctx.fillRect(cx - halfW - 2, fillStartY, width + 4, bottomY - fillStartY + 2);
    ctx.restore();
  }

  // Stroke outline
  buildDropletPath();
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

/* ── Public API ─────────────────────────────────────────────── */

export interface PaletteExportInfo {
  palette: RGB[];
  fixedPaletteIndices: number[];
  gridType: GridType;
  /** Number of cells per palette index (frequency). Same length as palette. */
  colorCounts: number[];
}

/**
 * Compute the required palette column width.
 */
export const getPaletteColumnWidth = (): number => PALETTE_COL_WIDTH;

/**
 * Render the palette column onto the given context.
 * The context's origin should be at the top-left of the palette area.
 */
export const renderPaletteColumn = (
  ctx: CanvasRenderingContext2D,
  info: PaletteExportInfo,
  availableHeight: number,
): void => {
  const { palette, fixedPaletteIndices, gridType, colorCounts } = info;

  // Filter out white from the palette display
  const entries = palette
    .map((color, i) => ({ color, index: i }))
    .filter(({ color }) => !isWhite(color));

  if (entries.length === 0) return;

  const maxCount = Math.max(...colorCounts.filter((_, i) => !isWhite(palette[i])), 1);

  // Auto-scale rows to fit available height
  const naturalRowH = rowHeight();
  const totalNatural = entries.length * naturalRowH + TOP_PADDING;
  const scale = totalNatural > availableHeight ? availableHeight / totalNatural : 1;
  const scaledRowH = naturalRowH * scale;
  const scaledSwatchSize = SWATCH_SIZE * scale;
  const scaledDropletH = DROPLET_HEIGHT * scale;
  const scaledDropletW = DROPLET_WIDTH * scale;
  const scaledSwatchDropletGap = SWATCH_DROPLET_GAP * scale;
  const scaledLabelFont = Math.max(12, LABEL_FONT_SIZE * scale);
  const scaledNameFont = Math.max(9, NAME_FONT_SIZE * scale);
  const scaledTopPad = TOP_PADDING * scale;

  const centerX = PALETTE_COL_WIDTH / 2;

  entries.forEach(({ color, index }, row) => {
    const rowTopY = scaledTopPad + row * scaledRowH;
    const hex = `rgb(${color.r}, ${color.g}, ${color.b})`;
    const swatchCenterX = centerX;
    const swatchCenterY = rowTopY + scaledSwatchSize / 2;

    // ── Draw swatch ──
    switch (gridType) {
      case "dot":
        drawCircleSwatch(ctx, swatchCenterX, swatchCenterY, scaledSwatchSize / 2, hex, "#333");
        break;
      case "square":
        drawSquareSwatch(
          ctx,
          swatchCenterX - scaledSwatchSize / 2,
          swatchCenterY - scaledSwatchSize / 2,
          scaledSwatchSize, hex, "#333",
        );
        break;
      case "diamond":
        drawDiamondSwatch(ctx, swatchCenterX, swatchCenterY, scaledSwatchSize / 2, hex, "#333");
        break;
    }

    // ── Label (number/letter) inside/over swatch ──
    const label = paletteIndexToLabel(index);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${scaledLabelFont}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Draw text shadow for readability
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeText(label, swatchCenterX, swatchCenterY);
    ctx.fillText(label, swatchCenterX, swatchCenterY);

    // ── Color name below swatch ──
    const nameY = rowTopY + scaledSwatchSize + scaledSwatchDropletGap * 0.5;
    const nameIndex = fixedPaletteIndices[index] ?? index;
    const colorName = getPaletteColorName(nameIndex) || "";
    if (colorName) {
      ctx.fillStyle = "#333333";
      ctx.font = `${scaledNameFont}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(colorName, centerX, nameY);
    }

    // ── Droplet indicator ──
    const dropletTopY = rowTopY + scaledSwatchSize + scaledSwatchDropletGap;
    const fillRatio = Math.min(1, (colorCounts[index] ?? 0) / maxCount);
    drawDroplet(
      ctx,
      swatchCenterX,
      dropletTopY,
      scaledDropletW,
      scaledDropletH,
      fillRatio,
      hex,
    );
  });
};
