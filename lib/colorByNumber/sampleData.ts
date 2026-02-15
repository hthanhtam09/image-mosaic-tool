/**
 * Sample Color by Number data for demo
 */

import type { ColorByNumberData } from "./types";

const SAMPLE_COLORS = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F5",
  "#F5FF33",
  "#33FFF5",
  "#FF8C33",
  "#8C33FF",
  "#33FF8C",
  "#FF3333",
];

const CODES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C"];

const generateSampleCells = (
  width: number,
  height: number,
  numColors: number,
): ColorByNumberData["cells"] => {
  const cells: ColorByNumberData["cells"] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) % numColors;
      cells.push({
        x,
        y,
        code: CODES[idx % CODES.length],
        color: SAMPLE_COLORS[idx % SAMPLE_COLORS.length],
      });
    }
  }
  return cells;
};

export const createSampleData = (
  gridType: ColorByNumberData["gridType"],
  width = 20,
  height = 15,
  cellSize = 30,
): ColorByNumberData => {
  const numColors = Math.min(8, width * height);
  const cells = generateSampleCells(width, height, numColors);
  return {
    gridType,
    width,
    height,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    cells,
  };
};
