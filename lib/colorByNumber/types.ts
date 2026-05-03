/**
 * Color by Number – types for interactive tô màu theo số
 */

export type ColorByNumberGridType =
  | "honeycomb"
  | "diamond"
  | "standard"
  | "pentagon"
  | "puzzle"
  | "islamic"
  | "fish-scale"
  | "trapezoid";

export interface ColorByNumberCell {
  x: number;
  y: number;
  code: string;
  color: string;
  /** Index into FIXED_PALETTE for exact color name lookup */
  fixedPaletteIndex?: number;
}

export interface ColorByNumberData {
  gridType: ColorByNumberGridType;
  width: number;
  height: number;
  cellSize: number;
  rotationDeg?: number;
  /** Gap between cells in px (honeycomb: 1-2px) */
  cellGap?: number;
  cells: ColorByNumberCell[];
}

/** Filled state: map "x,y" -> true when cell is painted */
export type FilledMap = Record<string, boolean>;

export interface PageLayout {
  scale: number;
  offsetX: number;
  offsetY: number;
  gridDims: { width: number; height: number };
  boxW: number;
  boxH: number;
}

export interface DirectImage {
  name: string;
  colorUrl: string;
  uncolorUrl: string;
  paletteUrl?: string;
}

export interface ConversionWorkerMessage {
  imageData: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: "srgb" | "display-p3";
  };
  gridType: ColorByNumberGridType;
  cellSize: number;
  useDithering: boolean;
  maxColors: number;
  cols: number;
  rows: number;
  removeWhiteBackground?: boolean;
}
