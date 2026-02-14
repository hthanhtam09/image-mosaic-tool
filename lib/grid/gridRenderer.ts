/**
 * GridRenderer – square, diamond, dot. Used by GridLayer and ZoomPreview only.
 */

import type { GridConfig, GridLayout, Cell, ExportMode } from "./types";
import {
  STROKE_COLOR,
  STROKE_GRID_PX,
  DOT_RADIUS_FRAC,
  PAPER_FILL,
} from "./constants";

const getStrokeWidth = (config: GridConfig): number =>
  config.showBorder ? config.borderWidth ?? STROKE_GRID_PX : 0;

/** Cell center – same as square: (col + 0.5) * cellSize, (row + 0.5) * cellSize */
const getCellCenterXY = (col: number, row: number, cellSize: number): { x: number; y: number } => ({
  x: col * cellSize + cellSize / 2,
  y: row * cellSize + cellSize / 2,
});

const drawSquareGrid = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  mode: ExportMode
): void => {
  const { cols, rows, cellSize } = layout;
  const strokeW = getStrokeWidth(config);
  const half = strokeW / 2;

  if (mode === "colored" && cells.length > 0) {
    for (const cell of cells) {
      const x = cell.col * cellSize;
      const y = cell.row * cellSize;
      if (cell.colorHex) {
        ctx.fillStyle = cell.colorHex;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  if (strokeW > 0) {
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.round(col * cellSize) + half;
        const y = Math.round(row * cellSize) + half;
        ctx.strokeRect(x, y, cellSize - strokeW, cellSize - strokeW);
      }
    }
  }
};

/** Diamond = square rotated 45°. Same layout as square: one cell per (row,col), center like square. */
const drawDiamondGrid = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  mode: ExportMode
): void => {
  const { cols, rows, cellSize } = layout;
  const strokeW = getStrokeWidth(config);
  const halfCell = cellSize / 2;

  if (mode === "colored" && cells.length > 0) {
    for (const cell of cells) {
      const { x: centerX, y: centerY } = getCellCenterXY(cell.col, cell.row, cellSize);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.fillStyle = cell.colorHex ?? PAPER_FILL;
      ctx.fillRect(-halfCell, -halfCell, cellSize, cellSize);
      ctx.restore();
    }
  }

  if (strokeW > 0) {
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { x: centerX, y: centerY } = getCellCenterXY(col, row, cellSize);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - halfCell);
        ctx.lineTo(centerX + halfCell, centerY);
        ctx.lineTo(centerX, centerY + halfCell);
        ctx.lineTo(centerX - halfCell, centerY);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
};

/** Dot = circle per cell. Same layout as square: center at (col + 0.5, row + 0.5) * cellSize. */
const drawDotGrid = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  mode: ExportMode
): void => {
  const { cols, rows, cellSize } = layout;
  const radius = cellSize * DOT_RADIUS_FRAC;
  const strokeW = getStrokeWidth(config);
  const getCx = (col: number) => col * cellSize + cellSize / 2;
  const getCy = (row: number) => row * cellSize + cellSize / 2;

  if (mode === "colored" && cells.length > 0) {
    for (const cell of cells) {
      ctx.beginPath();
      ctx.arc(getCx(cell.col), getCy(cell.row), radius, 0, Math.PI * 2);
      ctx.fillStyle = cell.colorHex ?? PAPER_FILL;
      ctx.fill();
    }
  }

  if (strokeW > 0) {
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = strokeW;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        ctx.arc(getCx(col), getCy(row), radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
};

export const renderGrid = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  mode: ExportMode
): void => {
  switch (config.type) {
    case "square":
      drawSquareGrid(ctx, layout, config, cells, mode);
      break;
    case "diamond":
      drawDiamondGrid(ctx, layout, config, cells, mode);
      break;
    case "dot":
      drawDotGrid(ctx, layout, config, cells, mode);
      break;
    default:
      drawSquareGrid(ctx, layout, config, cells, mode);
  }
};
