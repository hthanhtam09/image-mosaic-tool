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
export const PAGE_PADDING = 20;

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
/* ── Palette column constants (at 300 DPI) ── */
export const PALETTE_GAP_TO_GRID = 5; // 5px gap between palette and grid
export const PAL_SWATCH = Math.round(0.28 * EXPORT_DPI); // ~84px swatch
export const PAL_DROPLET_H = Math.round(0.1 * EXPORT_DPI); // ~30px per mini droplet
export const PAL_DROPLET_W = Math.round(0.07 * EXPORT_DPI); // ~21px per mini droplet
export const PAL_DROPLET_COUNT = 5; // 5 droplet icons
export const PAL_DROPLET_GAP = Math.round(0.01 * EXPORT_DPI); // ~3px gap between droplets
export const PAL_ROW_GAP = Math.round(0.06 * EXPORT_DPI); // ~18px gap between rows
export const PAL_SWD_GAP = Math.round(0.02 * EXPORT_DPI); // gap swatch→droplets
export const PAL_TOP_PAD = Math.round(0.35 * EXPORT_DPI);
export const PAL_LABEL_FS = Math.round(0.11 * EXPORT_DPI); // ~33px
export const PAL_SIDE_PAD = Math.round(0.08 * EXPORT_DPI); // ~24px side padding
/** 3 arc circles to the right of each swatch (larger, wider spacing, outline only) */
export const PAL_ARC_CIRCLE_R = Math.round(0.065 * EXPORT_DPI); // ~19.5px radius
export const PAL_ARC_GAP = Math.round(0.02 * EXPORT_DPI); // gap swatch→arc
export const PAL_ARC_RADIUS = Math.round(0.12 * EXPORT_DPI); // arc curve radius (wider spread)
/** Input box below droplets (larger, with inner padding) */
export const PAL_INPUT_GAP = Math.round(0.015 * EXPORT_DPI); // gap droplets→input
export const PAL_INPUT_H = Math.round(0.18 * EXPORT_DPI); // ~54px input height
export const PAL_INPUT_W = Math.round(0.55 * EXPORT_DPI); // ~165px width (wider than droplet row)
export const PAL_INPUT_PAD = Math.round(0.02 * EXPORT_DPI); // ~6px inner padding

/** Total width of 5 droplets in a row */
export const dropletsRowW = () =>
  PAL_DROPLET_COUNT * PAL_DROPLET_W + (PAL_DROPLET_COUNT - 1) * PAL_DROPLET_GAP;

/** Width needed for swatch + 3 arc circles on the right */
const swatchPlusArcW = () =>
  PAL_SWATCH / 2 + PAL_ARC_GAP + PAL_ARC_RADIUS + PAL_ARC_CIRCLE_R * 2;

/** Palette column width: fits swatch+arc, droplet row, or input; plus side padding */
export const getPalColW = () => {
  const contentW = Math.max(
    Math.max(PAL_SWATCH, dropletsRowW()),
    Math.max(swatchPlusArcW() * 2, PAL_INPUT_W),
  );
  return contentW + PAL_SIDE_PAD * 2;
};

/** Height of a single palette row (swatch, droplets, input) */
export const palRowH = () =>
  PAL_SWATCH +
  PAL_SWD_GAP +
  PAL_DROPLET_H +
  PAL_INPUT_GAP +
  PAL_INPUT_H +
  PAL_ROW_GAP;

export const PAL_HORIZONTAL_GAP = Math.round(0.05 * EXPORT_DPI); // Gap between items in a row
export const PAL_VERTICAL_GAP = Math.round(0.05 * EXPORT_DPI); // Gap between rows of items


export interface PaletteLayout {
  palColW: number;
  palRowH: number;
  scale: number;
  codes: string[];
  codeToColor: Map<string, string>;
  codeToCount: Map<string, number>;
  maxCount: number;
  sRH: number;
  sSW: number;
  sGap: number;
  sLbl: number;
  sTop: number;
  sDH: number;
  sDW: number;
  sDGap: number;
  cx: number;
  /** Scaled: arc circles to the right of swatch */
  sArcCircleR: number;
  sArcGap: number;
  sArcRadius: number;
  /** Scaled: input box below droplets */
  sInputGap: number;
  sInputH: number;
  sInputW: number;
  sInputPad: number;
  // New properties for horizontal layout
  itemsPerRow: number;
  rowCount: number;
  totalHeight: number;
  itemWidth: number;
  itemHeight: number;
  horizontalGap: number;
  verticalGap: number;
}



export const calculatePaletteLayout = (
  data: ColorByNumberData,
  availableWidth: number, // Changed from availableHeight to availableWidth for horizontal layout constraint
): PaletteLayout | null => {
  // Build unique palette entries (skip white / empty codes)
  const codeToColor = new Map<string, string>();
  const codeToCount = new Map<string, number>();
  for (const cell of data.cells) {
    if (!cell.code) continue;
    if (!codeToColor.has(cell.code)) {
      codeToColor.set(cell.code, cell.color);
    }
    codeToCount.set(cell.code, (codeToCount.get(cell.code) ?? 0) + 1);
  }
  const codes = [...codeToColor.keys()].sort((a, b) => {
    const aN = parseInt(a, 10),
      bN = parseInt(b, 10);
    if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
    if (!isNaN(aN)) return -1;
    if (!isNaN(bN)) return 1;
    return a.localeCompare(b);
  });
  if (codes.length === 0) return null;

  const maxCount = Math.max(...codes.map((c) => codeToCount.get(c) ?? 0), 1);

  // Layout calculations for horizontal grid
  // We want to fit as many items as possible in availableWidth
  // Item width = getPalColW()
  
  const itemWidth = getPalColW();
  const itemHeight = palRowH();
  
  // Calculate how many items fit per row
  // availableWidth = n * itemWidth + (n-1) * horizontalGap
  // availableWidth + horizontalGap = n * (itemWidth + horizontalGap)
  // n = (availableWidth + horizontalGap) / (itemWidth + horizontalGap)
  
  const hGap = PAL_HORIZONTAL_GAP;
  const vGap = PAL_VERTICAL_GAP;
  
  // User request: "7 màu" -> Fixed 7 items per row
  const itemsPerRow = 7;
  const rowCount = Math.ceil(codes.length / itemsPerRow);
  
  // Check if it fits in width, if not we might need to scale?
  // For now assuming it fits or we just center what we have.
  
  const totalHeight = rowCount * itemHeight + (rowCount - 1) * vGap + PAL_TOP_PAD;


  // We do NOT scale down the palette itself based on height here. 
  // The palette takes what it needs at the bottom. The grid will take the REST of the page.
  // Unless the palette is larger than the page itself? 
  // Let's assume standard scale 1 for palette items.
  const sc = 1;

  const sInputW = PAL_INPUT_W * sc;
  const sInputPad = PAL_INPUT_PAD * sc;

  return {
    palColW: itemWidth,
    palRowH: itemHeight,
    scale: sc,
    codes,
    codeToColor,
    codeToCount,
    maxCount,
    sRH: itemHeight * sc,
    sSW: PAL_SWATCH * sc,
    sGap: PAL_SWD_GAP * sc,
    sLbl: Math.max(12, PAL_LABEL_FS * sc),
    sTop: PAL_TOP_PAD * sc,
    sDH: PAL_DROPLET_H * sc,
    sDW: PAL_DROPLET_W * sc,
    sDGap: PAL_DROPLET_GAP * sc,
    cx: itemWidth / 2, // relative to item start
    sArcCircleR: PAL_ARC_CIRCLE_R * sc,
    sArcGap: PAL_ARC_GAP * sc,
    sArcRadius: PAL_ARC_RADIUS * sc,
    sInputGap: PAL_INPUT_GAP * sc,
    sInputH: PAL_INPUT_H * sc,
    sInputW,
    sInputPad,
    itemsPerRow,
    rowCount,
    totalHeight,
    itemWidth,
    itemHeight,
    horizontalGap: hGap,
    verticalGap: vGap,
  };
};


/** Draw a water-droplet outline; fill from bottom by fillRatio (0..1). */
const drawDropletShape = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  w: number,
  h: number,
  fillRatio: number,
  fillColor: string,
) => {
  const tipY = topY;
  const bottomY = topY + h;
  const halfW = w / 2;
  const bodyTopY = topY + h * 0.35;

  const buildPath = () => {
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.bezierCurveTo(
      cx - halfW * 0.3,
      bodyTopY,
      cx - halfW,
      bodyTopY + (bottomY - bodyTopY) * 0.2,
      cx - halfW,
      bodyTopY + (bottomY - bodyTopY) * 0.55,
    );
    ctx.arc(
      cx,
      bodyTopY + (bottomY - bodyTopY) * 0.55,
      halfW,
      Math.PI,
      0,
      true,
    );
    ctx.bezierCurveTo(
      cx + halfW,
      bodyTopY + (bottomY - bodyTopY) * 0.2,
      cx + halfW * 0.3,
      bodyTopY,
      cx,
      tipY,
    );
    ctx.closePath();
  };

  if (fillRatio > 0) {
    ctx.save();
    buildPath();
    ctx.clip();
    
    // If fillRatio is roughly 0.5, we fill the LEFT half (vertical slice).
    // If fillRatio is 1, full fill.
    // The previous implementation was bottom-up fill, but "half a tear" usually implies left/right split visually or top/bottom?
    // "1 nửa nước mắt" usually means left/right split for progress.
    // Let's support both: if fillRatio is exactly 0.5, do left-half fill.
    // If it's continuous (not 0.5 or 1), keep bottom-up? 
    // The requirement says "min ít nhất của nước mắt là 1 nửa" -> implied discrete steps 0.5, 1, 1.5.
    
    if (Math.abs(fillRatio - 0.5) < 0.01) {
       // Left half fill
       ctx.fillStyle = fillColor;
       ctx.fillRect(cx - halfW - 1, topY - 1, halfW + 1, h + 2);
    } else {
       // Full fill (or bottom up if we wanted that, but we use discrete 1.0 or 0.5 now)
       ctx.fillStyle = fillColor;
       ctx.fillRect(cx - halfW - 1, topY - 1, w + 2, h + 2);
    }
    
    ctx.restore();
  }
  buildPath();
  ctx.strokeStyle = "#555555";
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

/** Draw shape-matched swatch */
const drawPalSwatch = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  shape: "circle" | "diamond" | "square" | "pentagon",
  fillColor: string,
) => {
  const half = size / 2;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2;

  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (shape === "diamond") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (shape === "pentagon") {
    // Pentagon -> Renders as Hexagon to minimize gaps
    // Point up: -90, -30, 30, 90, 150, 210
    const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);
    ctx.beginPath();
    angles.forEach((angle, i) => {
      const px = cx + half * Math.cos(angle);
      const py = cy + half * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // rounded square
    const r = size * 0.12;
    const x = cx - half,
      y = cy - half;
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
    ctx.fill();
    ctx.stroke();
  }
};

/** Render the palette column on the given context (origin at palette top-left). */
const renderPaletteColumnCBN = (
  ctx: CanvasRenderingContext2D,
  data: ColorByNumberData,
  layout: PaletteLayout,
) => {
  const {
    codes,
    codeToColor,
    codeToCount,
    maxCount,
    sRH, // using item height basically
    sSW,
    sGap,
    sLbl,
    sTop,
    sDH,
    sDW,
    sDGap,
    cx: itemCx, // center relative to item
    sArcCircleR,
    sArcGap,
    sArcRadius,
    sInputGap,
    sInputH,
    sInputW,
    sInputPad,
    itemsPerRow,
    itemWidth,
    itemHeight,
    horizontalGap,
    verticalGap,
  } = layout;

  const shape: "circle" | "diamond" | "square" | "pentagon" =
    data.gridType === "honeycomb"
      ? "circle"
      : data.gridType === "diamond"
        ? "diamond"
        : data.gridType === "pentagon"
          ? "pentagon"
          : "square";

  codes.forEach((code, i) => {
    // Calculate row and column index
    const rowIndex = Math.floor(i / itemsPerRow);
    const colIndex = i % itemsPerRow;

    // Calculate position
    const xPos = colIndex * (itemWidth + horizontalGap);
    const yPos = sTop + rowIndex * (itemHeight + verticalGap);

    const cx = xPos + itemCx;
    const color = codeToColor.get(code) ?? "#999";
    const swCY = yPos + sSW / 2;


    // Swatch
    drawPalSwatch(ctx, cx, swCY, sSW, shape, color);

    // Label inside swatch
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${sLbl}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeText(code, cx, swCY);
    ctx.fillText(code, cx, swCY);

    // 5 droplet icons
    const dropTop = yPos + sSW + sGap;
    const count = codeToCount.get(code) ?? 0;

    let displayDroplets = 0;

    if (count > 0) {
      const ratio = count / maxCount;
      displayDroplets = ratio * PAL_DROPLET_COUNT;
      // If colored at all, show at least half a drop
      if (displayDroplets < 0.5) displayDroplets = 0.5;
    }

    const totalDropW =
      PAL_DROPLET_COUNT * sDW + (PAL_DROPLET_COUNT - 1) * sDGap;
    const dropStartX = cx - totalDropW / 2 + sDW / 2;

    for (let d = 0; d < PAL_DROPLET_COUNT; d++) {
      const dx = dropStartX + d * (sDW + sDGap);
      
      let fillType = 0; // 0=none, 0.5=half, 1=full
      if (d + 1 <= displayDroplets) {
        fillType = 1;
      } else if (d + 0.5 <= displayDroplets) {
        fillType = 0.5;
      }
      
      drawDropletShape(ctx, dx, dropTop, sDW, sDH, fillType, color);
    }

    // 3 shapes in arc to the right of swatch (top → bottom), outline only; shape follows pattern. Square uses inscribed size so they don't overlap.
    const arcCenterX = cx + sSW / 2 + sArcGap + sArcRadius;
    const arcCenterY = swCY;
    const arcAngles = [-80, 0, 80].map((deg) => (deg * Math.PI) / 180);
    const r = sArcCircleR;
    const rSquare = r / Math.SQRT2;
    ctx.fillStyle = "transparent";
    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 1.5;
    arcAngles.forEach((angle) => {
      const shapeX = arcCenterX + sArcRadius * Math.cos(angle);
      const shapeY = arcCenterY + sArcRadius * Math.sin(angle);
      ctx.beginPath();
      if (shape === "circle") {
        ctx.arc(shapeX, shapeY, r, 0, Math.PI * 2);
      } else if (shape === "square") {
        const half = rSquare;
        const rx = half * 0.12;
        const x = shapeX - half;
        const y = shapeY - half;
        const size = half * 2;
        ctx.moveTo(x + rx, y);
        ctx.lineTo(x + size - rx, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + rx);
        ctx.lineTo(x + size, y + size - rx);
        ctx.quadraticCurveTo(x + size, y + size, x + size - rx, y + size);
        ctx.lineTo(x + rx, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - rx);
        ctx.lineTo(x, y + rx);
        ctx.quadraticCurveTo(x, y, x + rx, y);
        ctx.closePath();
      } else {
        ctx.moveTo(shapeX, shapeY - r);
        ctx.lineTo(shapeX + r, shapeY);
        ctx.lineTo(shapeX, shapeY + r);
        ctx.lineTo(shapeX - r, shapeY);
        ctx.lineTo(shapeX - r, shapeY);
        ctx.closePath();
      }
      if (shape === "pentagon") {
        // Hexagon angles
        const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);
        ctx.beginPath();
        angles.forEach((a, k) => {
            const px = shapeX + r * Math.cos(a);
            const py = shapeY + r * Math.sin(a);
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    });

    // Input box below droplets: white rounded rect, pencil icon, dotted placeholder
    const inputTop = dropTop + sDH + sInputGap;
    const inputLeft = cx - sInputW / 2;
    const inputRadius = Math.min(sInputH * 0.25, 6);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(inputLeft, inputTop, sInputW, sInputH, inputRadius);
    } else {
      ctx.rect(inputLeft, inputTop, sInputW, sInputH);
    }
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pencil icon (simplified) on the left, inset by padding, larger size
    const penX = inputLeft + sInputPad + sInputH * 0.3;
    const penY = inputTop + sInputH * 0.62;
    const penS = sInputH * 0.32;
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(penX - penS * 0.5, penY + penS);
    ctx.lineTo(penX + penS * 0.8, penY - penS * 0.8);
    ctx.lineTo(penX + penS, penY - penS);
    ctx.moveTo(penX + penS * 0.8, penY - penS * 0.8);
    ctx.lineTo(penX + penS * 0.4, penY + penS * 0.5);
    ctx.stroke();

    // Dotted placeholder line (longer, positioned lower for more space above)
    const dotCount = 13;
    const innerW = sInputW - 2 * sInputPad;
    const dotSpacing = innerW * 0.065;
    const dotTotalW = (dotCount - 1) * dotSpacing;
    const dotStartX = cx - dotTotalW / 2;
    const dotY = inputTop + sInputH * 0.62;
    ctx.fillStyle = "#999999";
    for (let i = 0; i < dotCount; i++) {
      ctx.beginPath();
      ctx.arc(dotStartX + i * dotSpacing, dotY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = "butt";
  });
};

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

  // Page dimensions: strict 8.5x11 @ 300DPI
  const pageW = EXPORT_PAGE_W;
  const pageH = EXPORT_PAGE_H;

  // For uncolored mode (OR colored mode now per request), add palette at the BOTTOM
  // The user said: "cho bảng màu xuống dưới cuối cùng, không nằm bên trái nữa, và thành hàng ngang, nếu dài quá thì xuống hàng"
  // This implies palette is always at the bottom.
  const needsPalette = true; // Always show palette at bottom if requested, or based on options? 
  // "ảnh preview đã tô màu thì thêm bảng màu y hệt như bên chưa tô màu" -> implies it's always there for consistency?
  // Let's assume yes.
  
  // Calculate palette layout first to know its height
  // Palette width available is full page width - padding
  const paletteAvailableW = pageW - PAGE_PADDING * 2;
  let layout: PaletteLayout | null = null;
  
  if (needsPalette) {
      layout = calculatePaletteLayout(data, paletteAvailableW);
  }
  
  const paletteHeight = layout ? layout.totalHeight : 0;
  
  
  // Grid available height = Page Height - Palette Height - Padding
  // We should also add some gap between grid and palette?
  // User request: "bảng màu chỉ cách nơi tô màu khoảng 10px"
  // 10px @ 300 DPI approx 30 units (since 300 dpi / 96 dpi * 10 ~ 31)
  const PALETTE_GAP = 30; // ~10px visual
  const maxGridH = pageH - paletteHeight - PALETTE_GAP - PAGE_PADDING * 2;
  const maxGridW = pageW - PAGE_PADDING * 2;

  // Get grid layout fitted into the remaining space
  const gridLayout = getPageLayout(data, maxGridW, maxGridH);

  // Calculate actual total height of content to center it vertically
  const gridVisualH = gridLayout.gridDims.height * gridLayout.scale;
  const totalContentH = gridVisualH + PALETTE_GAP + paletteHeight;
  
  // Center vertically
  // "cho center nơi tô màu và bảng màu"
  const startY = (pageH - totalContentH) / 2;
  
  const gridVisualTop = startY;
  const paletteVisualTop = startY + gridVisualH + PALETTE_GAP;

  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  // ── Palette column (Bottom) ──
  if (needsPalette && layout) {
    ctx.save();
    // Align with the grid's left edge
    // "màu đầu tiên nằm thằng hàng với cạnh ở trên"
    // "qua bên trái khoảng 20px nữa" -> Shift left by ~20px (approx 60 units at 300 DPI)
    const SHIFT_LEFT = 60;
    const paletteX = PAGE_PADDING + gridLayout.offsetX - SHIFT_LEFT;
    
    ctx.translate(paletteX, paletteVisualTop);
    renderPaletteColumnCBN(ctx, data, layout);
    ctx.restore();
  }

  // ── Grid (Top) ──
  ctx.save();
  // We need to adhere to the gridVisualTop we calculated.
  // getPageLayout returns offsetX/Y relative to the bounds passed to it.
  // But since we want to position the grid explicitly at gridVisualTop,
  // we rely on gridLayout.scale but manage translation ourselves?
  // Actually getPageLayout's offsetY centers it within `maxGridH`.
  // If `maxGridH` is much larger than `gridVisualH`, it has extra space.
  // But we want to tightly pack Grid + Palette, and center the GROUP.
  // So we ignore gridLayout.offsetY (which centers in available space) 
  // and use the offset needed to start at gridVisualTop?
  // 
  // Wait, gridLayout.gridDims is unscaled.
  // We want to scale: gridLayout.scale
  // We want to translate: 
  // X: Centered in page. gridLayout.offsetX returns centering for `maxGridW`.
  //    Since `maxGridW` is centered in `pageW` (via padding), `PAGE_PADDING + gridLayout.offsetX` is correct x.
  // Y: We want it at `gridVisualTop`.
  
  ctx.translate(PAGE_PADDING + gridLayout.offsetX, gridVisualTop);
  ctx.scale(gridLayout.scale, gridLayout.scale);



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
    } else if (data.gridType === "pentagon") {
      // Hexagon angles
      const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);
      ctx.beginPath();
      angles.forEach((a, k) => {
        const px = cl.cx + cl.r * Math.cos(a);
        const py = cl.cy + cl.r * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
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
