/**
 * GridEngine – Page → Paper → GridLayer → UILayer (zoom).
 * Zoom reads only from grid data (vector re-render); no screenshot/crop of page.
 */

import type { GridConfig, GridLayout, Cell, ExportMode } from "./types";
import {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  SAFE_AREA_WIDTH_PX,
  SAFE_AREA_HEIGHT_PX,
  GRID_PADDING_PX,
  PAPER_PADDING_PX,
  PAPER_ROTATION_DEG,
  STROKE_GRID_PX,
} from "./constants";
import { computeGridLayout } from "./layoutCalculator";
import { renderGrid } from "./gridRenderer";
import { renderNumbers } from "./numberRenderer";
import { renderGridToCanvas } from "./gridLayer";
import { renderZoomPreview } from "./zoomPreviewRenderer";
import { renderPageBackground } from "./pageRenderer";
import { renderPaper } from "./paperRenderer";

export type { GridConfig, GridLayout, Cell, ExportMode, GridType } from "./types";
export { getSafeArea, computeGridLayout, computeCellSizeToFit } from "./layoutCalculator";
export { renderGrid } from "./gridRenderer";
export { renderNumbers, getCellCenter } from "./numberRenderer";
export { renderGridToCanvas } from "./gridLayer";
export { renderZoomPreview } from "./zoomPreviewRenderer";
export { renderPageBackground } from "./pageRenderer";
export { renderPaper } from "./paperRenderer";

export const getLayout = (
  config: GridConfig,
  safeAreaOverride?: { width: number; height: number }
): GridLayout => computeGridLayout(config, safeAreaOverride);

/**
 * Export: white paper + grid only. No gray, no shadow.
 */
export const renderToCanvas = (
  canvas: HTMLCanvasElement,
  config: GridConfig,
  cells: Cell[],
  options: {
    showNumbers: boolean;
    exportMode: ExportMode;
    safeAreaOverride?: { width: number; height: number };
  }
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const safeWidth = options.safeAreaOverride?.width ?? SAFE_AREA_WIDTH_PX;
  const safeHeight = options.safeAreaOverride?.height ?? SAFE_AREA_HEIGHT_PX;
  const layout = getLayout(config, options.safeAreaOverride);

  const canvasWidth = options.safeAreaOverride ? safeWidth : PAGE_WIDTH_PX;
  const canvasHeight = options.safeAreaOverride ? safeHeight : PAGE_HEIGHT_PX;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!options.safeAreaOverride) {
    ctx.translate(GRID_PADDING_PX, GRID_PADDING_PX);
  }

  ctx.save();
  ctx.translate(layout.originX, layout.originY);

  const configWithStroke = {
    ...config,
    borderWidth: config.borderWidth ?? STROKE_GRID_PX,
  };
  const showNumbers =
    options.showNumbers && options.exportMode !== "noNumber";
  renderGrid(ctx, layout, configWithStroke, cells, options.exportMode);
  renderNumbers(ctx, layout, cells, {
    showNumbers,
    gridType: config.type,
  });
  ctx.restore();
};

/** Zoom circle radius in preview pixels */
const ZOOM_RADIUS = 56;

/**
 * Preview: Page (gray) → Paper → GridLayer (offscreen canvas drawn on paper) → Zoom (vector re-render from grid data only).
 */
export const renderPreviewToCanvas = (
  canvas: HTMLCanvasElement,
  config: GridConfig,
  cells: Cell[],
  options: {
    showNumbers: boolean;
    exportMode: ExportMode;
    previewScale: number;
  }
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = options.previewScale;
  const pageW = PAGE_WIDTH_PX + 2 * PAPER_PADDING_PX;
  const pageH = PAGE_HEIGHT_PX + 2 * PAPER_PADDING_PX;
  const previewW = pageW * scale;
  const previewH = pageH * scale;

  canvas.width = Math.round(previewW);
  canvas.height = Math.round(previewH);

  const safeW = SAFE_AREA_WIDTH_PX * scale;
  const safeH = SAFE_AREA_HEIGHT_PX * scale;
  const layout = getLayout(config, { width: safeW, height: safeH });

  renderPageBackground(ctx, previewW, previewH);

  const paperX = PAPER_PADDING_PX * scale;
  const paperY = PAPER_PADDING_PX * scale;
  const paperW = PAGE_WIDTH_PX * scale;
  const paperH = PAGE_HEIGHT_PX * scale;

  renderPaper(ctx, paperX, paperY, paperW, paperH, {
    withBorder: true,
    withShadow: true,
    rotationDeg: PAPER_ROTATION_DEG,
  });

  const gridOffsetX = paperX + GRID_PADDING_PX * scale;
  const gridOffsetY = paperY + GRID_PADDING_PX * scale;

  const gridCanvas = renderGridToCanvas(layout, config, cells, {
    exportMode: options.exportMode,
    showNumbers: options.showNumbers,
  });

  ctx.drawImage(
    gridCanvas,
    0,
    0,
    gridCanvas.width,
    gridCanvas.height,
    gridOffsetX + layout.originX,
    gridOffsetY + layout.originY,
    layout.gridWidth,
    layout.gridHeight
  );

  const zoomCenterX = previewW - ZOOM_RADIUS - 16;
  const zoomCenterY = ZOOM_RADIUS + 16;

  renderZoomPreview(
    ctx,
    zoomCenterX,
    zoomCenterY,
    ZOOM_RADIUS,
    layout,
    config,
    cells,
    {
      exportMode: options.exportMode,
      showNumbers: options.showNumbers,
    }
  );
};

export const buildCellsFromGrid = (
  rows: number,
  cols: number,
  startNumber = 1
): Cell[] => {
  const cells: Cell[] = [];
  let n = startNumber;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ row: r, col: c, number: String(n++) });
    }
  }
  return cells;
};

export const mosaicBlocksToCells = (
  blocks: Array<{
    x: number;
    y: number;
    paletteIndex: number;
    color: { r: number; g: number; b: number };
  }>,
  blockSize: number,
  indexToLabel: (index: number) => string,
  colorToHex: (color: { r: number; g: number; b: number }) => string
): Cell[] =>
  blocks.map((b) => ({
    row: Math.floor(b.y / blockSize),
    col: Math.floor(b.x / blockSize),
    number: indexToLabel(b.paletteIndex),
    colorHex: colorToHex(b.color),
  }));
