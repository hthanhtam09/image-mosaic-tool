/**
 * Color by Number – export and save progress
 *
 * All exports use letter size (8.5" × 11") at 300 DPI with white background.
 * The grid is centered on the page with padding.
 */

import type { ColorByNumberData, FilledMap, ColorByNumberCell } from "./types";
import {
  getGridDimensions,
  getCellLayout,
  TRAPEZOID_SLANT_FACTOR,
} from "./layoutCalculator";

/** Partial color split mode type */
export type PartialColorMode =
  | "none"
  | "diagonal-bl-tr"
  | "diagonal-tl-br"
  | "horizontal-middle"
  | "horizontal-sides";
import { getPaletteColorName } from "@/lib/palette";

/** 300 DPI for crisp print-quality exports */
const EXPORT_DPI = 300;
const EXPORT_PAGE_W = Math.round(8.5 * EXPORT_DPI); // 2550
const EXPORT_PAGE_H = Math.round(11 * EXPORT_DPI); // 3300

const STORAGE_KEY = "color-by-number-progress";

/** Page padding in layout units (applied before fitting to letter) */
export const PAGE_PADDING_X = 90; // 0.3 inch * 300 DPI = 90px
export const PAGE_PADDING_Y = 120; // 0.4 inch * 300 DPI = 120px

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

const getRoundedPolygonPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  radius: number,
): void => {
  if (points.length < 3) return;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];

    const vcp_x = prev.x - curr.x;
    const vcp_y = prev.y - curr.y;
    const len_cp = Math.sqrt(vcp_x * vcp_x + vcp_y * vcp_y);
    const ucp_x = vcp_x / len_cp;
    const ucp_y = vcp_y / len_cp;

    const vcn_x = next.x - curr.x;
    const vcn_y = next.y - curr.y;
    const len_cn = Math.sqrt(vcn_x * vcn_x + vcn_y * vcn_y);
    const ucn_x = vcn_x / len_cn;
    const ucn_y = vcn_y / len_cn;

    const r = Math.min(radius, len_cp / 2, len_cn / 2);

    const sx = curr.x + ucp_x * r;
    const sy = curr.y + ucp_y * r;

    const ex = curr.x + ucn_x * r;
    const ey = curr.y + ucn_y * r;

    if (i === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }

    ctx.quadraticCurveTo(curr.x, curr.y, ex, ey);
  }
  ctx.closePath();
};

/**
 * Compute the transform needed to fit the grid into the given box (center aligned).
 */
export const getPageLayout = (
  data: ColorByNumberData,
  boxW: number,
  boxH: number,
) => {
  const dims = getGridDimensions(data);
  const scale = Math.min(boxW / dims.width, boxH / dims.height);
  const scaledW = dims.width * scale;
  const scaledH = dims.height * scale;
  return {
    scale,
    // Offsets to center the grid in the box
    offsetX: (boxW - scaledW) / 2,
    offsetY: (boxH - scaledH) / 2,
    gridDims: dims,
    boxW,
    boxH,
  };
};

/**
 * Export grid as PNG on 8.5×11 letter page (300 DPI → 2550×3300 px).
 * @param colored – if false, all cells render white (uncolored mode)
 * @param showCodes – whether to show code numbers inside cells
 */
/* ── Palette column constants (at 300 DPI) ── */
export const PALETTE_GAP_TO_GRID = 5; // 5px gap between palette and grid
export const PAL_SWATCH = Math.round(0.267 * EXPORT_DPI); // ~80px swatch (was 0.28 / 84px)
export const PAL_DROPLET_H = Math.round(0.1 * EXPORT_DPI); // ~30px per mini droplet
export const PAL_DROPLET_W = Math.round(0.07 * EXPORT_DPI); // ~21px per mini droplet
export const PAL_DROPLET_COUNT = 5; // 5 droplet icons
export const PAL_DROPLET_GAP = Math.round(0.025 * EXPORT_DPI); // ~7.5px gap between droplets
export const PAL_ROW_GAP = Math.round(0.06 * EXPORT_DPI); // ~18px gap between rows
export const PAL_SWD_GAP = Math.round(0.08 * EXPORT_DPI); // gap swatch→droplets (~11px)
export const PAL_TOP_PAD = Math.round(0.35 * EXPORT_DPI);
export const PAL_LABEL_FS = Math.round(0.165 * EXPORT_DPI); // ~50px
export const PAL_SIDE_PAD = Math.round(0.05 * EXPORT_DPI); // ~15px side padding (was 0.08 / 24px)
/** 3 arc circles to the right of each swatch (larger, wider spacing, outline only) */
export const PAL_ARC_CIRCLE_R = Math.round(0.065 * EXPORT_DPI); // ~19.5px radius
export const PAL_ARC_GAP = Math.round(0.02 * EXPORT_DPI); // gap swatch→arc
export const PAL_ARC_RADIUS = Math.round(0.12 * EXPORT_DPI); // arc curve radius (wider spread)
/** Input box below droplets (larger, with inner padding) */
export const PAL_INPUT_GAP = Math.round(0.08 * EXPORT_DPI); // gap droplets→input (~9px)
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
  availableWidth: number,
  options?: { vertical?: boolean },
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

  // Layout calculations
  const itemWidth = getPalColW();
  const itemHeight = palRowH();

  const hGap = PAL_HORIZONTAL_GAP;
  const vGap = PAL_VERTICAL_GAP;

  let itemsPerRow = 7;
  let scale = 1;

  if (options?.vertical) {
    // Logic for vertical column on the left
    itemsPerRow = 1;
    scale = 0.8; // Scale up for left column visibility (was 0.6)
  } else {
    // Logic for horizontal bottom (optional/legacy now?)
    itemsPerRow = 7;
  }

  const sc = scale;

  const sItemWidth = itemWidth * sc;
  const sItemHeight = itemHeight * sc;
  const sHGap = hGap * sc;
  const sVGap = vGap * sc;

  const rowCount = Math.ceil(codes.length / itemsPerRow);

  const totalHeight =
    rowCount * sItemHeight + (rowCount - 1) * sVGap + PAL_TOP_PAD * sc;

  // We do NOT scale down the palette itself based on height here.
  // The palette takes what it needs.

  const sInputW = PAL_INPUT_W * sc;
  const sInputPad = PAL_INPUT_PAD * sc;

  return {
    palColW: sItemWidth,
    palRowH: sItemHeight,
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
    itemWidth: sItemWidth,
    itemHeight: sItemHeight,
    horizontalGap: sHGap,
    verticalGap: sVGap,
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

  buildPath();

  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fill();

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

/**
 * Draw a puzzle piece path on canvas context.
 * Every edge has a tab or blank. Adjacent cells interlock.
 * Boundary edges always have blanks (indentations).
 */
const drawPuzzlePiecePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
  gridW: number,
  gridH: number,
) => {
  const half = size / 2;
  const tabSize = size * 0.18;
  const tabWidth = size * 0.22;

  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;

  const rightDir = x < gridW - 1 && x % 2 === 0 ? 1 : -1;
  const bottomDir = y < gridH - 1 && y % 2 === 0 ? 1 : -1;
  const leftDir = x > 0 && x % 2 === 0 ? -1 : 1;
  const topDir = y > 0 && y % 2 === 0 ? -1 : 1;

  ctx.beginPath();
  ctx.moveTo(left, top);

  // Top edge (left to right)
  ctx.lineTo(cx - tabWidth, top);
  ctx.bezierCurveTo(
    cx - tabWidth,
    top + topDir * tabSize * 0.2,
    cx - tabSize * 0.9,
    top + topDir * tabSize,
    cx,
    top + topDir * tabSize,
  );
  ctx.bezierCurveTo(
    cx + tabSize * 0.9,
    top + topDir * tabSize,
    cx + tabWidth,
    top + topDir * tabSize * 0.2,
    cx + tabWidth,
    top,
  );
  ctx.lineTo(right, top);

  // Right edge (top to bottom)
  ctx.lineTo(right, cy - tabWidth);
  ctx.bezierCurveTo(
    right + rightDir * tabSize * 0.2,
    cy - tabWidth,
    right + rightDir * tabSize,
    cy - tabSize * 0.9,
    right + rightDir * tabSize,
    cy,
  );
  ctx.bezierCurveTo(
    right + rightDir * tabSize,
    cy + tabSize * 0.9,
    right + rightDir * tabSize * 0.2,
    cy + tabWidth,
    right,
    cy + tabWidth,
  );
  ctx.lineTo(right, bottom);

  // Bottom edge (right to left)
  ctx.lineTo(cx + tabWidth, bottom);
  ctx.bezierCurveTo(
    cx + tabWidth,
    bottom + bottomDir * tabSize * 0.2,
    cx + tabSize * 0.9,
    bottom + bottomDir * tabSize,
    cx,
    bottom + bottomDir * tabSize,
  );
  ctx.bezierCurveTo(
    cx - tabSize * 0.9,
    bottom + bottomDir * tabSize,
    cx - tabWidth,
    bottom + bottomDir * tabSize * 0.2,
    cx - tabWidth,
    bottom,
  );
  ctx.lineTo(left, bottom);

  // Left edge (bottom to top)
  ctx.lineTo(left, cy + tabWidth);
  ctx.bezierCurveTo(
    left + leftDir * tabSize * 0.2,
    cy + tabWidth,
    left + leftDir * tabSize,
    cy + tabSize * 0.9,
    left + leftDir * tabSize,
    cy,
  );
  ctx.bezierCurveTo(
    left + leftDir * tabSize,
    cy - tabSize * 0.9,
    left + leftDir * tabSize * 0.2,
    cy - tabWidth,
    left,
    cy - tabWidth,
  );
  ctx.lineTo(left, top);

  ctx.closePath();
};

/**
 * Draw Islamic star-and-cross tile path on canvas.
 * Stars at (x+y) even, crosses at (x+y) odd.
 * The geometry is a mathematically perfect zero-gap tessellation.
 */
const drawIslamicTilePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
) => {
  const h = size / 2;
  const SQRT2 = Math.SQRT2;
  const R_star = h * SQRT2; // Distance to star tips
  const v = h * (SQRT2 - 1); // Distance to star inner valleys
  const R_cross = h * (2 - SQRT2); // Distance to cross inner pinches (2h - R_star)

  const isStar = (x + y) % 2 === 0;

  ctx.beginPath();
  if (isStar) {
    ctx.moveTo(cx, cy - R_star);
    ctx.lineTo(cx + v, cy - h);
    ctx.lineTo(cx + h, cy - h);
    ctx.lineTo(cx + h, cy - v);
    ctx.lineTo(cx + R_star, cy);
    ctx.lineTo(cx + h, cy + v);
    ctx.lineTo(cx + h, cy + h);
    ctx.lineTo(cx + v, cy + h);
    ctx.lineTo(cx, cy + R_star);
    ctx.lineTo(cx - v, cy + h);
    ctx.lineTo(cx - h, cy + h);
    ctx.lineTo(cx - h, cy + v);
    ctx.lineTo(cx - R_star, cy);
    ctx.lineTo(cx - h, cy - v);
    ctx.lineTo(cx - h, cy - h);
    ctx.lineTo(cx - v, cy - h);
  } else {
    ctx.moveTo(cx - v, cy - h);
    ctx.lineTo(cx, cy - R_cross);
    ctx.lineTo(cx + v, cy - h);
    ctx.lineTo(cx + h, cy - h);
    ctx.lineTo(cx + h, cy - v);
    ctx.lineTo(cx + R_cross, cy);
    ctx.lineTo(cx + h, cy + v);
    ctx.lineTo(cx + h, cy + h);
    ctx.lineTo(cx + v, cy + h);
    ctx.lineTo(cx, cy + R_cross);
    ctx.lineTo(cx - v, cy + h);
    ctx.lineTo(cx - h, cy + h);
    ctx.lineTo(cx - h, cy + v);
    ctx.lineTo(cx - R_cross, cy);
    ctx.lineTo(cx - h, cy - v);
    ctx.lineTo(cx - h, cy - h);
  }
  ctx.closePath();
};

const drawFishScalePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) => {
  const r = size / 2;
  ctx.beginPath();
  // Draw the full circle; overlap handles the visual "scallop" in grid mode
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
};

const drawTrapezoidPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  slant: number,
  xIndex: number,
) => {
  const deltaX = xIndex % 2 === 0 ? 0 : slant;
  const deltaX1 = (xIndex + 1) % 2 === 0 ? 0 : slant;

  ctx.beginPath();
  ctx.moveTo(x, y + deltaX);
  ctx.lineTo(x + w, y + deltaX1);
  ctx.lineTo(x + w, y + h + deltaX1);
  ctx.lineTo(x, y + h + deltaX);
  ctx.closePath();
};

/** Draw shape-matched swatch */
const drawPalSwatch = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  shape:
    | "circle"
    | "diamond"
    | "square"
    | "pentagon"
    | "puzzle"
    | "islamic"
    | "fish-scale"
    | "trapezoid",
  fillColor: string,
) => {
  let s = size;
  if (shape === "circle") s = size * 1.35;
  else if (shape === "diamond") s = size * 1.5;
  else if (shape === "square") s = size * 1.25;
  else if (shape === "pentagon") s = size * 1.35;
  else if (shape === "islamic") s = size * 1.7;
  else if (shape === "fish-scale") s = size * 1.35;
  else if (shape === "trapezoid") s = size * 1.25;

  const half = s / 2;

  const performFillAndStroke = () => {
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333333";
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.stroke();
  };

  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, half, 0, Math.PI * 2);
    performFillAndStroke();
  } else if (shape === "diamond") {
    const side = s * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((45 * Math.PI) / 180);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(-side / 2, -side / 2, side, side, side * 0.15);
    } else {
      ctx.rect(-side / 2, -side / 2, side, side);
    }
    performFillAndStroke();
    ctx.restore();
  } else if (shape === "pentagon") {
    // Pentagon -> Renders as Hexagon to minimize gaps
    // Point up: -90, -30, 30, 90, 150, 210
    const angles = [-90, -30, 30, 90, 150, 210].map(
      (deg) => (deg * Math.PI) / 180,
    );
    const points = angles.map((angle) => ({
      x: cx + half * Math.cos(angle),
      y: cy + half * Math.sin(angle),
    }));
    getRoundedPolygonPath(ctx, points, half * 0.15);
    performFillAndStroke();
  } else if (shape === "puzzle") {
    drawPuzzlePiecePath(ctx, cx, cy, s, 0, 2, 3, 3);
    performFillAndStroke();
  } else if (shape === "fish-scale") {
    drawFishScalePath(ctx, cx, cy, s);
    performFillAndStroke();
  } else if (shape === "trapezoid") {
    const slant = s * TRAPEZOID_SLANT_FACTOR;
    // For palette, we show a standard trapezoid (representative) centered vertically and shifted up
    drawTrapezoidPath(
      ctx,
      cx - half,
      cy - (s + slant) / 2,
      s,
      s,
      slant,
      0,
    );
    performFillAndStroke();
  } else if (shape === "islamic") {
    drawIslamicTilePath(ctx, cx, cy, s * 0.7, 0, 0);
    performFillAndStroke();
  } else {
    // rounded square
    const r = s * 0.12;
    const x = cx - half,
      y = cy - half;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + s - r, y);
    ctx.quadraticCurveTo(x + s, y, x + s, y + r);
    ctx.lineTo(x + s, y + s - r);
    ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
    ctx.lineTo(x + r, y + s);
    ctx.quadraticCurveTo(x, y + s, x, y + s - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    performFillAndStroke();
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

  const shape:
    | "circle"
    | "diamond"
    | "square"
    | "pentagon"
    | "puzzle"
    | "islamic"
    | "fish-scale"
    | "trapezoid" =
    data.gridType === "honeycomb"
      ? "circle"
      : data.gridType === "diamond"
        ? "diamond"
        : data.gridType === "pentagon"
          ? "pentagon"
          : data.gridType === "puzzle"
            ? "puzzle"
            : data.gridType === "islamic"
              ? "islamic"
              : data.gridType === "fish-scale"
                ? "fish-scale"
                : data.gridType === "trapezoid"
                  ? "trapezoid"
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
    ctx.font = `400 ${sLbl}px 'Noto Sans', sans-serif`;
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
    // We reuse the arcAngles array from earlier if possible, but let's redefine it to be safe
    const localArcAngles = [-80, 0, 80].map((deg) => (deg * Math.PI) / 180);
    const r = sArcCircleR;
    const rSquare = r / Math.SQRT2;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#555555";
    ctx.lineWidth = 1.5;

    localArcAngles.forEach((angle, i) => {
      const shapeX = arcCenterX + sArcRadius * Math.cos(angle);
      let shapeY = arcCenterY + sArcRadius * Math.sin(angle);
      if (shape === "circle") {
        ctx.beginPath();
        ctx.arc(shapeX, shapeY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape === "square") {
        const half = rSquare;
        const rx = half * 0.12;
        const x = shapeX - half;
        const y = shapeY - half;
        const size = half * 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, size, size, rx);
        } else {
          ctx.rect(x, y, size, size);
        }
        ctx.fill();
        ctx.stroke();
      } else if (shape === "diamond") {
        const side = r * 2 * 0.707 * 0.9;
        ctx.save();
        ctx.translate(shapeX, shapeY);
        ctx.rotate((45 * Math.PI) / 180);
        ctx.fillRect(-side / 2, -side / 2, side, side);
        ctx.strokeRect(-side / 2, -side / 2, side, side);
        ctx.restore();
      } else if (shape === "puzzle") {
        drawPuzzlePiecePath(ctx, shapeX, shapeY, r * 1.4, 0, 2, 3, 3);
        ctx.fill();
        ctx.stroke();
      } else if (shape === "islamic") {
        drawIslamicTilePath(ctx, shapeX, shapeY, r * 1.4, 0, 0);
        ctx.fill();
        ctx.stroke();
      } else if (shape === "fish-scale") {
        drawFishScalePath(ctx, shapeX, shapeY, r * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shape === "trapezoid") {
        if (i === 1) shapeY += r * 0.2; // Shift middle shape down
        const rSquare = r / Math.SQRT2;
        const size = rSquare * 2;
        const slant = size * TRAPEZOID_SLANT_FACTOR;
        drawTrapezoidPath(
          ctx,
          shapeX - rSquare,
          shapeY - (size + slant) / 2,
          size,
          size,
          slant,
          0,
        );
        ctx.fill();
        ctx.stroke();
      } else {
        // Pentagon
        const pAngles = [-90, -30, 30, 90, 150, 210].map(
          (deg) => (deg * Math.PI) / 180,
        );
        const points = pAngles.map((a) => ({
          x: shapeX + r * Math.cos(a),
          y: shapeY + r * Math.sin(a),
        }));
        getRoundedPolygonPath(ctx, points, r * 0.15);
        ctx.fill();
        ctx.stroke();
      }
    });
    ctx.restore();

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

    // Pencil icon (removed)

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
    showPalette?: boolean;
    /** Split color mode for partial coloring */
    partialColorMode?: PartialColorMode;
    /** Background color for the page (default: '#ffffff') */
    bgColor?: string;
  },
): HTMLCanvasElement => {
  const showCodes = options.showCodes ?? true;
  const colored = options.colored ?? true;
  const showPalette = options.showPalette ?? true;
  const partialColorMode = options.partialColorMode ?? "none";
  const bgColor = options.bgColor ?? "#ffffff";

  // Page dimensions: strict 8.5x11 @ 300DPI
  const pageW = EXPORT_PAGE_W;
  const pageH = EXPORT_PAGE_H;

  // For uncolored mode (OR colored mode now per request), add palette on the LEFT if enabled
  const needsPalette = showPalette;

  // 1. Determine "Safe Area" based on fixed margins
  const padX = showPalette ? PAGE_PADDING_X : 0;
  const padY = PAGE_PADDING_Y;

  const safeW = pageW - padX * 2;
  const safeH = pageH - padY * 2;

  // 2. Calculate palette layout (vertical)
  let layout: PaletteLayout | null = null;
  if (needsPalette) {
    layout = calculatePaletteLayout(data, safeW, { vertical: true });
  }

  const PALETTE_GAP = 30; // ~10px visual
  const paletteWidth = layout ? layout.palColW : 0;

  // 3. Grid available width = SafeW - PaletteW - Gap
  // Gain 50px from palette shift!
  const PALETTE_X_OFFSET = showPalette ? -40 : 0; // Shift palette left into margin (was -50)
  const gridAvailableW = Math.max(
    0,
    safeW -
      paletteWidth -
      (paletteWidth > 0 ? PALETTE_GAP : 0) -
      PALETTE_X_OFFSET,
  );
  const gridAvailableH = safeH;

  // 4. Fit grid into gridAvailableH/W
  const gridLayout = getPageLayout(data, gridAvailableW, gridAvailableH);

  // 5. Calculate vertical centering

  // Anchor to TOP padding (0.4 inch) instead of centering vertically
  // Vertical positioning: align palette swatches with grid rows
  const firstCell = getCellLayout(0, 0, data);
  const gridVisualTop = padY;
  const gridFirstRowCenterY = gridVisualTop + firstCell.cy * gridLayout.scale;

  // Swatch center in palette coordinate space is sTop + sSW/2
  const paletteFirstSwatchCenterY = layout ? layout.sTop + layout.sSW / 2 : 0;
  const paletteY = gridFirstRowCenterY - paletteFirstSwatchCenterY;

  // Grid Top is just gridY
  // Grid visual top remains padY (it was gridY which was padY)
  const gridVisualTopPos = gridVisualTop;

  const canvas = document.createElement("canvas");
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Page background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, pageW, pageH);

  // ── Palette column (Left) ──
  if (needsPalette && layout) {
    ctx.save();
    // Palette is positioned at Left Padding - 50px offset per user request
    const paletteX = padX + PALETTE_X_OFFSET;

    ctx.translate(paletteX, paletteY);
    renderPaletteColumnCBN(ctx, data, layout);
    ctx.restore();
  }

  // ── Grid (Right) ──
  ctx.save();
  // Grid starts after Palette + Gap
  const gridStartX =
    padX +
    PALETTE_X_OFFSET +
    paletteWidth +
    (paletteWidth > 0 ? PALETTE_GAP : 0) +
    gridLayout.offsetX;

  ctx.translate(gridStartX, gridVisualTopPos);
  ctx.scale(gridLayout.scale, gridLayout.scale);

  const strokeColor = "#000000";
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";

  // Diagonal cutoff for partial coloring (bottom-right corner uncolored)
  const gridDims = getGridDimensions(data);

  const renderCell = (cell: ColorByNumberCell, filledCell: boolean) => {
    const cl = getCellLayout(cell.x, cell.y, data);
    // When partialColorMode is active, determine which cells are colored
    let isCellColored = colored;
    if (colored && partialColorMode !== "none") {
      const nx = cl.cx / gridDims.width; // 0..1 horizontal
      const ny = cl.cy / gridDims.height; // 0..1 vertical

      if (partialColorMode === "diagonal-bl-tr") {
        // Diagonal from bottom-left to top-right: colored above the line
        // Line: y = 1 - x (in normalized coords)
        isCellColored = ny <= 1 - nx;
      } else if (partialColorMode === "diagonal-tl-br") {
        // Diagonal from top-left to bottom-right: colored above the line
        // Line: y = x
        isCellColored = ny <= nx;
      } else if (partialColorMode === "horizontal-middle") {
        // Horizontal cut: top half colored, bottom half uncolored
        isCellColored = ny <= 0.5;
      } else if (partialColorMode === "horizontal-sides") {
        // Horizontal cut inverted: bottom half colored, top half uncolored
        isCellColored = ny > 0.5;
      }
    }
    const fillColor = isCellColored
      ? getCellFillColor(cell.color, filledCell)
      : "#ffffff";

    if (data.gridType === "honeycomb") {
      ctx.beginPath();
      ctx.arc(cl.cx, cl.cy, cl.r, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "diamond") {
      const side = cl.r * Math.sqrt(2);
      ctx.save();
      ctx.translate(cl.cx, cl.cy);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(-side / 2, -side / 2, side, side, side * 0.15);
      } else {
        ctx.rect(-side / 2, -side / 2, side, side);
      }
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (data.gridType === "pentagon") {
      // Hexagon angles
      const angles = [-90, -30, 30, 90, 150, 210].map(
        (deg) => (deg * Math.PI) / 180,
      );
      const points = angles.map((a) => ({
        x: cl.cx + cl.r * Math.cos(a),
        y: cl.cy + cl.r * Math.sin(a),
      }));
      getRoundedPolygonPath(ctx, points, cl.r * 0.15);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "puzzle") {
      // Puzzle piece
      drawPuzzlePiecePath(
        ctx,
        cl.cx,
        cl.cy,
        data.cellSize,
        cell.x,
        cell.y,
        data.width,
        data.height,
      );
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "islamic") {
      drawIslamicTilePath(ctx, cl.cx, cl.cy, data.cellSize, cell.x, cell.y);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "fish-scale") {
      drawFishScalePath(ctx, cl.cx, cl.cy, data.cellSize);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else if (data.gridType === "trapezoid") {
      const slant = data.cellSize * TRAPEZOID_SLANT_FACTOR;
      drawTrapezoidPath(
        ctx,
        cell.x * data.cellSize,
        cell.y * data.cellSize,
        data.cellSize,
        data.cellSize,
        slant,
        cell.x,
      );
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    } else {
      const s = data.cellSize;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cell.x * s, cell.y * s, s, s, s * 0.15);
      } else {
        ctx.rect(cell.x * s, cell.y * s, s, s);
      }
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.stroke();
    }

    if (showCodes && cell.code) {
      ctx.save();
      const brightness = getBrightness(fillColor);
      const textFill = brightness < 128 ? "#ffffff" : "#999999";
      ctx.font = `400 ${cl.r * 1.4}px 'Noto Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Add stroke outline in colored mode so numbers are always readable
      if (isCellColored) {
        ctx.strokeStyle =
          brightness < 128 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)";
        ctx.lineWidth = cl.r * 0.15;
        ctx.lineJoin = "round";
        ctx.strokeText(cell.code, cl.cx, cl.cy);
      }

      ctx.fillStyle = textFill;
      ctx.fillText(cell.code, cl.cx, cl.cy);
      ctx.restore();
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
  options?: { bgColor?: string },
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

  // Page background
  ctx.fillStyle = options?.bgColor ?? "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  // Layout constants (scaled for 300 DPI)
  const padding = PAGE_PADDING_Y; // Use new vertical padding
  const swatchSize = 64;
  const rowHeight = 84;
  const totalContentH = codes.length * rowHeight;

  // Center vertically
  const startY = Math.max(padding, (pageH - totalContentH) / 2);
  const startX = 360; // leave room for color names on the left

  codes.forEach((code, i) => {
    const y = startY + i * rowHeight;
    const swatchY = y + (rowHeight - swatchSize) / 2;

    // Get exact color name from PALETTE_NAMES
    const palIdx = codeToPaletteIndex.get(code);
    const colorName = palIdx != null ? getPaletteColorName(palIdx) : code;

    // Color name – left of box, right-aligned text near the swatch
    ctx.fillStyle = "#000000";
    ctx.font = "400 42px 'Noto Sans', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      colorName,
      startX - 12,
      data.gridType === "trapezoid"
        ? y + rowHeight / 2 - 10
        : y + rowHeight / 2,
    );

    // White box with border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(startX, swatchY, swatchSize, swatchSize);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, swatchY, swatchSize, swatchSize);

    // Code number inside the box, centered
    ctx.fillStyle = "#000000";
    ctx.font = "400 39px 'Noto Sans', sans-serif";
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
