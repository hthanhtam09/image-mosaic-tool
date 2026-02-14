/**
 * NumberRenderer – center text per cell (square/diamond/dot)
 */

import type { GridLayout, Cell, GridType } from "./types";
import {
  NUMBER_FONT_SIZE_FRAC,
  NUMBER_FONT_SIZE_FRAC_DOT,
  STROKE_COLOR,
} from "./constants";

const NUMBER_FONT_FAMILY = "sans-serif";
const NUMBER_FONT_WEIGHT = "600";

/** Same as square layout: center at (col + 0.5, row + 0.5) * cellSize for all grid types. */
export const getCellCenter = (
  layout: GridLayout,
  row: number,
  col: number,
  _gridType?: GridType
): { x: number; y: number } => {
  const { cellSize } = layout;
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
};

const getFontSizeFrac = (gridType: GridType): number =>
  gridType === "dot" ? NUMBER_FONT_SIZE_FRAC_DOT : NUMBER_FONT_SIZE_FRAC;

export const renderNumbers = (
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  cells: Cell[],
  options: { showNumbers: boolean; gridType: GridType }
): void => {
  if (!options.showNumbers || cells.length === 0) return;
  const frac = getFontSizeFrac(options.gridType);
  const fontSize = Math.max(6, layout.cellSize * frac);
  ctx.font = `${NUMBER_FONT_WEIGHT} ${fontSize}px ${NUMBER_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = STROKE_COLOR;
  for (const cell of cells) {
    const { x, y } = getCellCenter(layout, cell.row, cell.col, options.gridType);
    ctx.fillText(cell.number, x, y);
  }
};
