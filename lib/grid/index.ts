/**
 * Grid system – Page → Paper → GridLayer → UILayer (zoom from grid data only)
 */

export {
  getLayout,
  renderToCanvas,
  renderPreviewToCanvas,
  buildCellsFromGrid,
  mosaicBlocksToCells,
  getSafeArea,
  computeGridLayout,
  computeCellSizeToFit,
  renderGrid,
  renderNumbers,
  getCellCenter,
  renderGridToCanvas,
  renderZoomPreview,
  renderPageBackground,
  renderPaper,
} from "./gridEngine";

export type { GridConfig, GridLayout, Cell, ExportMode, GridType } from "./gridEngine";

export {
  PAGE_WIDTH_PX,
  PAGE_HEIGHT_PX,
  PRINT_DPI,
  SAFE_AREA_WIDTH_PX,
  SAFE_AREA_HEIGHT_PX,
  GRID_PADDING_IN,
  GRID_PADDING_PX,
  PAPER_PADDING_IN,
  PAPER_PADDING_PX,
  STROKE_GRID_PX,
  STROKE_PAPER_PX,
  STROKE_ZOOM_CIRCLE_PX,
} from "./constants";
