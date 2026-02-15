/**
 * Color by Number – types for interactive tô màu theo số
 */

export type ColorByNumberGridType = "honeycomb" | "diamond" | "standard";

export interface ColorByNumberCell {
  x: number;
  y: number;
  code: string;
  color: string;
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
