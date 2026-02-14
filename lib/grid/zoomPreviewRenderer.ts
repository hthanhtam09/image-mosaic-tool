/**
 * ZoomPreviewRenderer – vector re-render only. Reads from grid data (visibleCells).
 * NO screenshot, NO crop of page/paper. Renders only shape, stroke, number.
 */

import type { GridConfig, GridLayout, Cell } from "./types";
import type { ExportMode } from "./types";
import { renderGrid } from "./gridRenderer";
import { renderNumbers } from "./numberRenderer";
import {
  STROKE_COLOR,
  STROKE_ZOOM_CIRCLE_PX,
  ZOOM_SCALE,
  STROKE_GRID_PX,
} from "./constants";

const GRID_TYPE_LABELS: Record<GridConfig["type"], string> = {
  square: "SQUARES",
  diamond: "DIAMONDS",
  dot: "DOTS",
};

/**
 * Compute visible cell range around zoom center (crop logic).
 * startRow = centerRow - floor(zoomRows/2), endRow = startRow + zoomRows - 1, clamped.
 */
const getVisibleRange = (
  centerRow: number,
  centerCol: number,
  zoomRows: number,
  zoomCols: number,
  totalRows: number,
  totalCols: number
): { startRow: number; endRow: number; startCol: number; endCol: number } => {
  const halfR = Math.floor(zoomRows / 2);
  const halfC = Math.floor(zoomCols / 2);
  const startRow = Math.max(0, centerRow - halfR);
  const startCol = Math.max(0, centerCol - halfC);
  const endRow = Math.min(totalRows - 1, startRow + zoomRows - 1);
  const endCol = Math.min(totalCols - 1, startCol + zoomCols - 1);
  return { startRow, endRow, startCol, endCol };
};

/**
 * Render zoom circle: only grid vector (visibleCells) re-rendered at zoomCellSize = cellSize * 3.
 * No page, no paper, no background, no bitmap scale.
 */
export const renderZoomPreview = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  options: {
    exportMode: ExportMode;
    showNumbers: boolean;
  }
): void => {
  const zoomCellSize = layout.cellSize * ZOOM_SCALE;
  const zoomRows = Math.max(1, Math.floor((2 * radius) / zoomCellSize));
  const zoomCols = Math.max(1, Math.floor((2 * radius) / zoomCellSize));

  const centerRow = Math.floor(layout.rows / 2);
  const centerCol = Math.floor(layout.cols / 2);
  const { startRow, endRow, startCol, endCol } = getVisibleRange(
    centerRow,
    centerCol,
    zoomRows,
    zoomCols,
    layout.rows,
    layout.cols
  );

  const visibleCells = cells.filter(
    (c) =>
      c.row >= startRow &&
      c.row <= endRow &&
      c.col >= startCol &&
      c.col <= endCol
  );
  const visibleCellsMapped: Cell[] = visibleCells.map((c) => ({
    ...c,
    row: c.row - startRow,
    col: c.col - startCol,
  }));

  const localRows = endRow - startRow + 1;
  const localCols = endCol - startCol + 1;
  const zoomLayout: GridLayout = {
    ...layout,
    rows: localRows,
    cols: localCols,
    cellSize: zoomCellSize,
    originX: 0,
    originY: 0,
    gridWidth: localCols * zoomCellSize,
    gridHeight: localRows * zoomCellSize,
  };

  const configWithStroke = {
    ...config,
    borderWidth: config.borderWidth ?? STROKE_GRID_PX,
  };

  ctx.save();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  const gridW = localCols * zoomCellSize;
  const gridH = localRows * zoomCellSize;
  const offsetX = centerX - radius + (radius * 2 - gridW) / 2;
  const offsetY = centerY - radius + (radius * 2 - gridH) / 2;

  ctx.translate(offsetX, offsetY);
  renderGrid(ctx, zoomLayout, configWithStroke, visibleCellsMapped, options.exportMode);
  const showNums =
    options.showNumbers && options.exportMode !== "noNumber";
  renderNumbers(ctx, zoomLayout, visibleCellsMapped, {
    showNumbers: showNums,
    gridType: config.type,
  });

  ctx.restore();

  ctx.strokeStyle = STROKE_COLOR;
  ctx.lineWidth = STROKE_ZOOM_CIRCLE_PX;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = STROKE_COLOR;
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(GRID_TYPE_LABELS[config.type], centerX, centerY + radius + 4);
};
