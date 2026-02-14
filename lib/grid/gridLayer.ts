/**
 * GridLayer – render grid ONLY to an offscreen canvas.
 * No page, no paper, no background. Zoom reads from this layer (or from same data).
 */

import type { GridConfig, GridLayout, Cell } from "./types";
import type { ExportMode } from "./types";
import { renderGrid } from "./gridRenderer";
import { renderNumbers } from "./numberRenderer";
import { STROKE_GRID_PX, PAPER_FILL } from "./constants";

/** Layout with origin at 0,0 for drawing on grid-only canvas */
const toGridOnlyLayout = (layout: GridLayout): GridLayout => ({
  ...layout,
  originX: 0,
  originY: 0,
});

/**
 * Render only the grid (shapes, strokes, numbers) to an offscreen canvas.
 * Returns the canvas. Caller draws this onto paper – no crop of full page.
 */
export const renderGridToCanvas = (
  layout: GridLayout,
  config: GridConfig,
  cells: Cell[],
  options: {
    exportMode: ExportMode;
    showNumbers: boolean;
  }
): HTMLCanvasElement => {
  const w = Math.ceil(layout.gridWidth);
  const h = Math.ceil(layout.gridHeight);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, w, h);

  const gridOnlyLayout = toGridOnlyLayout(layout);
  const configWithStroke = {
    ...config,
    borderWidth: config.borderWidth ?? STROKE_GRID_PX,
  };

  renderGrid(ctx, gridOnlyLayout, configWithStroke, cells, options.exportMode);
  const showNums =
    options.showNumbers && options.exportMode !== "noNumber";
  renderNumbers(ctx, gridOnlyLayout, cells, {
    showNumbers: showNums,
    gridType: config.type,
  });

  return canvas;
};
