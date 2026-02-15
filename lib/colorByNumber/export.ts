/**
 * Color by Number – export and save progress
 *
 * All exports use letter size (8.5" × 11") at 300 DPI with white background.
 * The grid is centered on the page with padding.
 */

import type { ColorByNumberData, FilledMap } from "./types";
import { getGridDimensions, getCellLayout } from "./layoutCalculator";
import type { ColorByNumberCell } from "./types";
import { getPaletteColorName } from "@/lib/palette";

/** 300 DPI for crisp print-quality exports */
const EXPORT_DPI = 300;
const EXPORT_PAGE_W = Math.round(8.5 * EXPORT_DPI); // 2550
const EXPORT_PAGE_H = Math.round(11 * EXPORT_DPI); // 3300

const STORAGE_KEY = "color-by-number-progress";

/** Page padding in layout units (applied before fitting to letter) */
const PAGE_PADDING = 20;

export const saveProgressToStorage = (
  dataId: string,
  filled: FilledMap,
): void => {
  try {
    const payload = JSON.stringify({ dataId, filled, savedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Ignore storage errors
  }
};

export const loadProgressFromStorage = (dataId: string): FilledMap | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { dataId: storedId, filled } = JSON.parse(raw) as {
      dataId: string;
      filled: FilledMap;
    };
    if (storedId !== dataId) return null;
    return filled ?? null;
  } catch {
    return null;
  }
};

const getDataId = (data: ColorByNumberData): string =>
  `${data.gridType}-${data.width}x${data.height}-${data.cellSize}`;

export const saveProgress = (
  data: ColorByNumberData,
  filled: FilledMap,
): void => {
  saveProgressToStorage(getDataId(data), filled);
};

export const loadProgress = (data: ColorByNumberData): FilledMap | null =>
  loadProgressFromStorage(getDataId(data));

const isWhiteColor = (hex: string): boolean => {
  const s = hex.replace("#", "");
  if (s.length !== 6) return true;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 250;
};

const getCellFillColor = (cellColor: string, filledCell: boolean): string =>
  filledCell || !isWhiteColor(cellColor) ? cellColor : "#ffffff";

const getBrightness = (hex: string): number => {
  if (hex.length < 7) return 255;
  return (
    (parseInt(hex.slice(1, 3), 16) * 299 +
      parseInt(hex.slice(3, 5), 16) * 587 +
      parseInt(hex.slice(5, 7), 16) * 114) /
    1000
  );
};

/**
 * Compute the transform needed to center the grid on an 8.5×11 page.
 * Returns { scale, offsetX, offsetY } where scale fits grid+padding into the page.
 */
export const getPageLayout = (
  data: ColorByNumberData,
  pageW = EXPORT_PAGE_W,
  pageH = EXPORT_PAGE_H,
) => {
  const dims = getGridDimensions(data);
  const contentW = dims.width + PAGE_PADDING * 2;
  const contentH = dims.height + PAGE_PADDING * 2;
  const scale = Math.min(pageW / contentW, pageH / contentH);
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;
  return {
    scale,
    offsetX: (pageW - scaledW) / 2,
    offsetY: (pageH - scaledH) / 2,
    gridDims: dims,
    pageW,
    pageH,
  };
};

/**
 * Export grid as PNG on 8.5×11 letter page (300 DPI → 2550×3300 px).
 * @param colored – if false, all cells render white (uncolored mode)
 * @param showCodes – whether to show code numbers inside cells
 */
export const exportToCanvas = (
  data: ColorByNumberData,
  filled: FilledMap,
  options: {
    showCodes?: boolean;
    colored?: boolean;
  },
): HTMLCanvasElement => {
  const showCodes = options.showCodes ?? true;
  const colored = options.colored ?? true;
  const layout = getPageLayout(data);
  const { pageW, pageH, scale: fitScale, offsetX, offsetY, gridDims } = layout;

  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  // Translate to center grid on page
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(fitScale, fitScale);
  ctx.translate(PAGE_PADDING, PAGE_PADDING);

  const strokeColor = "#000000";
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  const renderCell = (cell: ColorByNumberCell, filledCell: boolean) => {
    const cl = getCellLayout(cell.x, cell.y, data);
    const fillColor = colored
      ? getCellFillColor(cell.color, filledCell)
      : "#ffffff";

    if (data.gridType === "honeycomb") {
      ctx.beginPath();
      ctx.arc(cl.cx, cl.cy, cl.r, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "diamond") {
      ctx.beginPath();
      ctx.moveTo(cl.cx, cl.cy - cl.r);
      ctx.lineTo(cl.cx + cl.r, cl.cy);
      ctx.lineTo(cl.cx, cl.cy + cl.r);
      ctx.lineTo(cl.cx - cl.r, cl.cy);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else {
      const s = data.cellSize;
      ctx.fillStyle = fillColor;
      ctx.fillRect(cell.x * s, cell.y * s, s, s);
      ctx.strokeRect(cell.x * s, cell.y * s, s, s);
    }

    if (showCodes && cell.code) {
      const brightness = getBrightness(fillColor);
      ctx.fillStyle = brightness < 128 ? "#ffffff" : "#999999";
      ctx.font = `600 ${cl.r * 0.6}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cell.code, cl.cx, cl.cy);
    }
  };

  for (const cell of data.cells) {
    renderCell(cell, !!filled[`${cell.x},${cell.y}`]);
  }

  ctx.restore();
  return canvas;
};

/**
 * Export color palette as a vertical list on 8.5×11 letter page.
 * Each row: color swatch box + code label, black text, white background.
 */
export const exportPaletteToCanvas = (
  data: ColorByNumberData,
): HTMLCanvasElement => {
  const pageW = EXPORT_PAGE_W;
  const pageH = EXPORT_PAGE_H;

  // Build unique palette rows (exclude white and empty codes)
  const codeToColor = new Map<string, string>();
  const codeToPaletteIndex = new Map<string, number>();
  for (const cell of data.cells) {
    if (!cell.code) continue; // skip white cells (no code)
    if (!codeToColor.has(cell.code)) {
      codeToColor.set(cell.code, cell.color);
      if (cell.fixedPaletteIndex != null) {
        codeToPaletteIndex.set(cell.code, cell.fixedPaletteIndex);
      }
    }
  }
  const codes = [...codeToColor.keys()].sort((a, b) => {
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return a.localeCompare(b);
  });

  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  // Layout constants (scaled for 300 DPI)
  const padding = PAGE_PADDING * 6;
  const swatchSize = 64;
  const rowHeight = 84;
  const totalContentH = codes.length * rowHeight;

  // Center vertically
  const startY = Math.max(padding, (pageH - totalContentH) / 2);
  const startX = 360; // leave room for color names on the left

  codes.forEach((code, i) => {
    const color = codeToColor.get(code) ?? "#999";
    const y = startY + i * rowHeight;
    const swatchY = y + (rowHeight - swatchSize) / 2;

    // Get exact color name from PALETTE_NAMES
    const palIdx = codeToPaletteIndex.get(code);
    const colorName = palIdx != null ? getPaletteColorName(palIdx) : code;

    // Color name – left of box, right-aligned text near the swatch
    ctx.fillStyle = "#000000";
    ctx.font = "500 28px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(colorName, startX - 12, y + rowHeight / 2);

    // White box with border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX, swatchY, swatchSize, swatchSize);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, swatchY, swatchSize, swatchSize);

    // Code number inside the box, centered
    ctx.fillStyle = "#000000";
    ctx.font = "600 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(code, startX + swatchSize / 2, y + rowHeight / 2);
  });

  return canvas;
};

export const downloadProgressAsJson = (
  data: ColorByNumberData,
  filled: FilledMap,
): void => {
  const payload = {
    dataId: getDataId(data),
    gridType: data.gridType,
    width: data.width,
    height: data.height,
    cellSize: data.cellSize,
    filled,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `color-by-number-progress-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
