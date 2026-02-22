/**
 * Grid constants – no magic numbers
 */

export const PAGE_WIDTH_IN = 8.5;
export const PAGE_HEIGHT_IN = 11;
export const PRINT_DPI = 300;
export const GRID_PADDING_IN = 0.35;
export const PAPER_PADDING_IN = 0.5;

export const PAGE_WIDTH_PX = Math.round(PAGE_WIDTH_IN * PRINT_DPI);
export const PAGE_HEIGHT_PX = Math.round(PAGE_HEIGHT_IN * PRINT_DPI);
export const GRID_PADDING_PX = Math.round(GRID_PADDING_IN * PRINT_DPI);
export const PAPER_PADDING_PX = Math.round(PAPER_PADDING_IN * PRINT_DPI);

export const SAFE_AREA_WIDTH_PX =
  PAGE_WIDTH_PX - 2 * GRID_PADDING_PX;
export const SAFE_AREA_HEIGHT_PX =
  PAGE_HEIGHT_PX - 2 * GRID_PADDING_PX;

export const STROKE_GRID_PX = 1.2;
export const STROKE_PAPER_PX = 2;
export const STROKE_ZOOM_CIRCLE_PX = 4;

export const STROKE_COLOR = "#000000";
export const PAGE_BG_GRAY = "#e8e8e8";
export const PAPER_FILL = "#ffffff";
export const PAPER_ROTATION_DEG = 2;

export const NUMBER_FONT_SIZE_FRAC = 0.7;
export const NUMBER_FONT_SIZE_FRAC_DOT = 0.55;
export const DOT_RADIUS_FRAC = 0.4;
export const MIN_CELL_SIZE_PX = 4;

export const ZOOM_SCALE = 3;
export const ZOOM_CIRCLE_RADIUS_PREVIEW = 56;
