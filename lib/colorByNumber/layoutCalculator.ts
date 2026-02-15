/**
 * Color by Number – layout calculations for honeycomb, diamond, standard
 * Precise position logic for each grid pattern.
 */

import type { ColorByNumberGridType, ColorByNumberData } from "./types";

export interface CellLayout {
  /** Center X in grid coordinates */
  cx: number;
  /** Center Y in grid coordinates */
  cy: number;
  /** Radius for circle (honeycomb), half-edge for diamond/square */
  r: number;
  /** Shape type per cell */
  shape: "circle" | "square" | "diamond";
}

const CELL_GAP_DEFAULT = 2;

/**
 * Standard Grid – square cells, no offset, no rotation.
 * center = (x + 0.5) * cellSize, (y + 0.5) * cellSize
 */
const getStandardCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  _gap: number,
): CellLayout => {
  const cx = x * cellSize + cellSize / 2;
  const cy = y * cellSize + cellSize / 2;
  const r = cellSize / 2;
  return { cx, cy, r, shape: "square" };
};

/**
 * Honeycomb – circular cells, staggered (xo le): odd rows offset by 0.5 cellSize.
 * Vertical step = sqrt(3)*r so circle edges are tangent (honeycomb packing).
 * Gap 1-2px between circles in same row.
 */
const getHoneycombCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  gap: number,
): CellLayout => {
  const r = (cellSize - gap) / 2;
  const rowStep = Math.sqrt(3) * r;
  const rowOffset = y % 2 === 1 ? cellSize * 0.5 : 0;
  const cx = x * cellSize + cellSize / 2 + rowOffset;
  const cy = (y + 0.5) * rowStep;
  return { cx, cy, r, shape: "circle" };
};

/**
 * Diamond Grid – diamond (square 45°) per cell, staggered (xo le), no gaps.
 * Vertical step = 1.5*r so corners of one row touch midpoints of edges of adjacent rows (interlock).
 * Odd rows offset by r = cellSize/2 so centers sit in the "gap" between row above/below.
 */
const DIAMOND_ROW_STEP_FACTOR = 1.5; // rowStep = 1.5 * r => no gaps when staggered

const getDiamondCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  _gap: number,
): CellLayout => {
  const r = cellSize / 2;
  const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
  const rowOffset = y % 2 === 1 ? r : 0;
  const cx = x * cellSize + r + rowOffset;
  const cy = (y + 0.5) * rowStep;
  return { cx, cy, r, shape: "diamond" };
};

export const getCellLayout = (
  x: number,
  y: number,
  data: ColorByNumberData,
): CellLayout => {
  const cellSize = data.cellSize;
  const gap = data.cellGap ?? CELL_GAP_DEFAULT;

  switch (data.gridType) {
    case "honeycomb":
      return getHoneycombCellLayout(x, y, cellSize, gap);
    case "diamond":
      return getDiamondCellLayout(x, y, cellSize, gap);
    case "standard":
    default:
      return getStandardCellLayout(x, y, cellSize, gap);
  }
};

/**
 * Grid dimensions in local coordinates (before rotation).
 */
export const getGridDimensions = (
  data: ColorByNumberData,
): { width: number; height: number } => {
  const { width, height, cellSize, gridType, cellGap } = data;
  const gap = cellGap ?? CELL_GAP_DEFAULT;

  if (gridType === "honeycomb") {
    const r = (cellSize - gap) / 2;
    const rowStep = Math.sqrt(3) * r;
    const gridW = width * cellSize + cellSize * 0.5;
    const gridH = height * rowStep;
    return { width: gridW, height: gridH };
  }

  if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
    const gridW = width * cellSize + (height > 1 ? cellSize * 0.5 : 0);
    const gridH = height * rowStep;
    return { width: gridW, height: gridH };
  }

  const gridW = width * cellSize;
  const gridH = height * cellSize;
  return { width: gridW, height: gridH };
};

/**
 * Hit test: given (px, py) in grid coordinates, return cell (x,y) or null.
 */
export const hitTestCell = (
  px: number,
  py: number,
  data: ColorByNumberData,
): { x: number; y: number } | null => {
  const { width, height, cellSize, gridType, cellGap } = data;
  const gap = cellGap ?? CELL_GAP_DEFAULT;

  if (gridType === "standard") {
    const col = Math.floor(px / cellSize);
    const row = Math.floor(py / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      return { x: col, y: row };
    }
    return null;
  }

  if (gridType === "honeycomb") {
    const r = (cellSize - gap) / 2;
    const rowStep = Math.sqrt(3) * r;
    const row = Math.floor(py / rowStep);
    const rowOffset = row % 2 === 1 ? cellSize * 0.5 : 0;
    const col = Math.floor((px - rowOffset) / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      const layout = getHoneycombCellLayout(col, row, cellSize, gap);
      const dx = px - layout.cx;
      const dy = py - layout.cy;
      if (dx * dx + dy * dy <= layout.r * layout.r) return { x: col, y: row };
    }
    return null;
  }

  if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
    const row = Math.floor(py / rowStep);
    const rowOffset = row % 2 === 1 ? r : 0;
    const col = Math.floor((px - rowOffset) / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      const layout = getDiamondCellLayout(col, row, cellSize, gap);
      const dx = px - layout.cx;
      const dy = py - layout.cy;
      if (Math.abs(dx) + Math.abs(dy) <= layout.r * Math.SQRT2) {
        return { x: col, y: row };
      }
    }
    return null;
  }

  return null;
};
