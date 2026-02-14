/**
 * LayoutCalculator – auto cell size, center grid in safe area
 */

import type { GridConfig, GridLayout } from "./types";
import {
  SAFE_AREA_WIDTH_PX,
  SAFE_AREA_HEIGHT_PX,
  MIN_CELL_SIZE_PX,
} from "./constants";

export const getSafeArea = (): { width: number; height: number } => ({
  width: SAFE_AREA_WIDTH_PX,
  height: SAFE_AREA_HEIGHT_PX,
});

export const computeCellSizeToFit = (
  rows: number,
  cols: number,
  safeWidth: number,
  safeHeight: number
): number => {
  if (rows <= 0 || cols <= 0) return MIN_CELL_SIZE_PX;
  const cellWidth = safeWidth / cols;
  const cellHeight = safeHeight / rows;
  return Math.max(MIN_CELL_SIZE_PX, Math.min(cellWidth, cellHeight));
};

export const computeGridLayout = (
  config: GridConfig,
  safeAreaOverride?: { width: number; height: number }
): GridLayout => {
  const safeWidth = safeAreaOverride?.width ?? SAFE_AREA_WIDTH_PX;
  const safeHeight = safeAreaOverride?.height ?? SAFE_AREA_HEIGHT_PX;
  const { rows, cols } = config;
  const cellSize = computeCellSizeToFit(rows, cols, safeWidth, safeHeight);
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  const originX = (safeWidth - gridWidth) / 2;
  const originY = (safeHeight - gridHeight) / 2;
  return {
    safeAreaWidth: safeWidth,
    safeAreaHeight: safeHeight,
    originX,
    originY,
    scale: 1,
    gridWidth,
    gridHeight,
    rows,
    cols,
    cellSize,
  };
};
