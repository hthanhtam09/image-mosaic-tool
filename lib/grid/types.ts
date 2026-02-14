/**
 * Grid system types
 */

export type GridType = "square" | "diamond" | "dot";

export interface GridConfig {
  type: GridType;
  rows: number;
  cols: number;
  cellSize?: number;
  showBorder: boolean;
  borderWidth: number;
}

export interface Cell {
  row: number;
  col: number;
  number: string;
  colorHex?: string;
}

export interface GridLayout {
  safeAreaWidth: number;
  safeAreaHeight: number;
  originX: number;
  originY: number;
  scale: number;
  gridWidth: number;
  gridHeight: number;
  rows: number;
  cols: number;
  cellSize: number;
}

export type ExportMode = "lineArt" | "colored" | "noNumber";
