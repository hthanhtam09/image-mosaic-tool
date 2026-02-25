/**
 * Color by Number – layout calculations for honeycomb, diamond, standard
 * Precise position logic for each grid pattern.
 */

import type { ColorByNumberGridType, ColorByNumberData } from "./types";

export interface CellLayout {
  /** Center X in grid coordinates */
  cx: number;
  /** Center Y in grid coordinates */
  cy: number;
  /** Radius for circle (honeycomb), half-edge for diamond/square */
  r: number;
  /** Shape type per cell */
  shape: "circle" | "square" | "diamond" | "pentagon";
}

const CELL_GAP_DEFAULT = 2;

/**
 * Standard Grid – square cells, no offset, no rotation.
 * center = (x + 0.5) * cellSize, (y + 0.5) * cellSize
 */
const getStandardCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  _gap: number,
): CellLayout => {
  const cx = x * cellSize + cellSize / 2;
  const cy = y * cellSize + cellSize / 2;
  const r = cellSize / 2;
  return { cx, cy, r, shape: "square" };
};

/**
 * Honeycomb – circular cells, staggered (xo le): odd rows offset by 0.5 cellSize.
 * Vertical step = sqrt(3)*r so circle edges are tangent (honeycomb packing).
 * Gap 1-2px between circles in same row.
 */
const getHoneycombCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  gap: number,
): CellLayout => {
  const r = cellSize / 2;
  const rowStep = Math.sqrt(3) * r;
  const rowOffset = y % 2 === 1 ? r : 0;
  const cx = x * cellSize + r + rowOffset;
  const cy = (y + 0.5) * rowStep;
  return { cx, cy, r, shape: "circle" };
};

/**
 * Diamond Grid – diamond (square 45°) per cell, staggered (xo le), no gaps.
 * Vertical step = 1.5*r so corners of one row touch midpoints of edges of adjacent rows (interlock).
 * Odd rows offset by r = cellSize/2 so centers sit in the "gap" between row above/below.
 */
const DIAMOND_ROW_STEP_FACTOR = 1.0; // rowStep = 1.0 * r => no gaps when staggered

const getDiamondCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  _gap: number,
): CellLayout => {
  const r = cellSize / 2;
  const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
  const rowOffset = y % 2 === 1 ? r : 0;
  const cx = x * cellSize + r + rowOffset;
  const cy = (y + 0.5) * rowStep;
  return { cx, cy, r, shape: "diamond" };
};

/**
 * Pentagon Grid – regular pentagons, staggered.
 * We'll use a similar staggering to honeycomb/diamond.
 * A pentagon fits in a circle of radius r.
 * Orientation: Point up? Or flat top?
 * Let's assume point up (regular pentagon).
 *
 * For tiling: Regular pentagons do NOT tile the plane perfectly without gaps.
 * However, for "color by number", maybe we just want them packed closely?
 * Or is there a specific "Gemstone" style tiling?
 *
 * Re-reading user request: "ngũ giác" -> Pentagon.
 * If strictly regular pentagons, there will be gaps.
 * Staggered rows (like honeycomb) is the best approximation for a dense packing.
 * We will use the same logic as Honeycomb but with pentagon shape.
 *
 * r = (cellSize - gap) / 2
 * Vertical step: needs to be calculated based on pentagon geometry to minimize gaps.
 * Height of pentagon = r * (1 + cos(36°)) ≈ r * 1.809
 * Width = r * 2 * sin(72°) ≈ r * 1.902 (approx 2*r)
 *
 * In honeycomb, rowStep = sqrt(3)*r ≈ 1.732*r
 * Let's use a similar spacing for visual consistency.
 */
const getPentagonCellLayout = (
  x: number,
  y: number,
  cellSize: number,
  _gap: number,
): CellLayout => {
  // Solid tiling (Hexagon specific):
  // We want Width = cellSize for consistent column spacing.
  const r = cellSize / Math.sqrt(3);

  // Vertical step for interlocking hexagons (point-up):
  // To avoid gaps, use 1.5 * r
  const rowStep = 1.5 * r;

  // Horizontal offset for odd rows
  const rowOffset = y % 2 === 1 ? cellSize / 2 : 0;

  const cx = x * cellSize + cellSize / 2 + rowOffset;
  const cy = (y + 0.5) * rowStep;

  // NOTE: shape "pentagon" in renderer draws a Hexagon.
  return { cx, cy, r, shape: "pentagon" };
};

export const getCellLayout = (
  x: number,
  y: number,
  data: ColorByNumberData,
): CellLayout => {
  const cellSize = data.cellSize;
  const gap = data.cellGap ?? CELL_GAP_DEFAULT;

  switch (data.gridType) {
    case "honeycomb":
      return getHoneycombCellLayout(x, y, cellSize, gap);
    case "diamond":
      return getDiamondCellLayout(x, y, cellSize, gap);
    case "pentagon":
      return getPentagonCellLayout(x, y, cellSize, gap);
    case "standard":
    default:
      return getStandardCellLayout(x, y, cellSize, gap);
  }
};

/**
 * Grid dimensions in local coordinates (before rotation).
 */
export const getGridDimensions = (
  data: ColorByNumberData,
): { width: number; height: number } => {
  const { width, height, cellSize, gridType, cellGap } = data;
  const gap = cellGap ?? CELL_GAP_DEFAULT;

  if (gridType === "honeycomb") {
    const r = cellSize / 2;
    const rowStep = Math.sqrt(3) * r;
    const gridW = width * cellSize + (height > 1 ? r : 0);
    const gridH = height * rowStep;
    return { width: gridW, height: gridH };
  }

  if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
    const gridW = width * cellSize + (height > 1 ? cellSize * 0.5 : 0);
    const gridH = height * rowStep;
    return { width: gridW, height: gridH };
  }

  if (gridType === "pentagon") {
    // Matches getPentagonCellLayout logic
    const r = cellSize / Math.sqrt(3);
    const rowStep = 1.5 * r;
    const gridW = width * cellSize + (height > 1 ? cellSize / 2 : 0);
    const gridH = height * rowStep;
    return { width: gridW, height: gridH };
  }

  const gridW = width * cellSize;
  const gridH = height * cellSize;
  return { width: gridW, height: gridH };
};

/**
 * Hit test: given (px, py) in grid coordinates, return cell (x,y) or null.
 */
export const hitTestCell = (
  px: number,
  py: number,
  data: ColorByNumberData,
): { x: number; y: number } | null => {
  const { width, height, cellSize, gridType, cellGap } = data;
  const gap = cellGap ?? CELL_GAP_DEFAULT;

  if (gridType === "standard") {
    const col = Math.floor(px / cellSize);
    const row = Math.floor(py / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      return { x: col, y: row };
    }
    return null;
  }

  if (gridType === "honeycomb") {
    const r = cellSize / 2;
    const rowStep = Math.sqrt(3) * r;
    const row = Math.floor(py / rowStep);
    const rowOffset = row % 2 === 1 ? r : 0;
    const col = Math.floor((px - rowOffset) / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      const layout = getHoneycombCellLayout(col, row, cellSize, gap);
      const dx = px - layout.cx;
      const dy = py - layout.cy;
      if (dx * dx + dy * dy <= layout.r * layout.r) return { x: col, y: row };
    }
    return null;
  }

  if (gridType === "diamond") {
    const r = cellSize / 2;
    const rowStep = DIAMOND_ROW_STEP_FACTOR * r;
    const row = Math.floor(py / rowStep);
    const rowOffset = row % 2 === 1 ? r : 0;
    const col = Math.floor((px - rowOffset) / cellSize);
    if (col >= 0 && col < width && row >= 0 && row < height) {
      const layout = getDiamondCellLayout(col, row, cellSize, gap);
      const dx = px - layout.cx;
      const dy = py - layout.cy;
      if (Math.abs(dx) + Math.abs(dy) <= layout.r * Math.SQRT2) {
        return { x: col, y: row };
      }
    }
    return null;
  }

  if (gridType === "pentagon") {
    const r = cellSize / Math.sqrt(3);
    const rowStep = 1.5 * r;
    
    // Simple hit test similar to diamond/honeycomb
    // Note: This is an approximation since rows overlap in value.
    // Ideally we should check the closest 2 rows.
    // But for "click to fill", checking the primary mapped row is usually sufficient 
    // unless clicking exactly on the jagged edge.
    const row = Math.floor(py / rowStep);
    
    // Check row and row-1 because of overlap? 
    // Let's stick to the basic logic and improve if edge-cases are reported.
    // Actually, due to the overlap (2r vs 1.5r), a point can belong to row K or K-1/K+1.
    // We can iterate candidate rows [row-1, row, row+1].
    
    const candidates = [row - 1, row, row + 1];
    
    for (const rCandidate of candidates) {
        if (rCandidate < 0 || rCandidate >= height) continue;
        
        const rowOffset = rCandidate % 2 === 1 ? cellSize / 2 : 0;
        const colCandidate = Math.floor((px - rowOffset) / cellSize);
        
        // Also check col+1 if near edge? 
        // Let's just check the calculated col.
        if (colCandidate >= 0 && colCandidate < width) {
             const layout = getPentagonCellLayout(colCandidate, rCandidate, cellSize, gap);
             // Hexagon hit test
             // Point in hexagon check.
             // Hexagon is intersection of 3 strips or just check distance in 6 directions?
             // Or simplier: max(|dx|, |dy_rotated|) check?
             // Since it's regular hexagon:
             // distance from center <= inner_radius (sqrt(3)/2 * r)? No that's inscribed circle.
             
             // Simple hexagon distance function:
             // dx = abs(px - cx)
             // dy = abs(py - cy)
             // return dy <= r * sqrt(3)/2 ??? No.
             
             // Point-up hexagon:
             // max( |y|, |x|*sqrt(3) + |y| ) <= sqrt(3) * r ??? 
             // Let's look up standard Hexagon equations.
             // max(|dx|*sin(30) + |dy|*cos(30), |dx|) ??? 
             // For point-TOP hexagon (flat sides left/right?? No, point top means flat sides are angled).
             // Point UP: tips at (0, -r), (0, r). Flat vertical sides? No.
             // Point UP: vertices at 90 deg, etc. Left/Right vertices are at 0 deg??
             // Wait, CellPentagon uses -90 (top), -30, 30, 90 (bottom), 150, 210.
             // So vertices are at Top, Bottom, and 4 corners.
             // Flat sides are LEFT and RIGHT? 
             // cos(-30) = sqrt(3)/2. 
             // Vertices: (0,-r), (w/2, -r/2), (w/2, r/2), (0, r), (-w/2, r/2), (-w/2, -r/2).
             // Yes, flat sides are vertical lines at x = +/- w/2.
             // NO. The vertices are at x= w/2, y = +/- r/2.
             // The side connects (w/2, -r/2) to (w/2, r/2). This is a vertical line.
             // So it is a "Flat-topped" hexagon? NO. It is "Point-topped" if top is a point.
             // Vertices include (0, -r). So top is a point.
             // Layout: 
             // (0, -r) -> Top Point.
             // (w/2, -r/2) -> Top Right.
             // (w/2, r/2) -> Bottom Right.
             // (0, r) -> Bottom Point.
             // (-w/2, r/2) -> Bottom Left.
             // (-w/2, -r/2) -> Top Left.
             // So it is POINT-TOPPED.
             
             // Check: 
             // |dy| <= r 
             // |dx|*sqrt(3) + |dy| <= sqrt(3)*r ?
             //
             // Let's use `isPointInPolygon` logic for robustness or a dedicated check.
             // Since we have the layout center and r, let's use the explicit polygon check.
             
             const polyPoints = [-90, -30, 30, 90, 150, 210].map(deg => {
                 const rad = deg * Math.PI / 180;
                 return {
                     x: layout.cx + layout.r * Math.cos(rad),
                     y: layout.cy + layout.r * Math.sin(rad)
                 };
             });
             
             // Ray casting algorithm for point in polygon
             let inside = false;
             for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
                 const xi = polyPoints[i].x, yi = polyPoints[i].y;
                 const xj = polyPoints[j].x, yj = polyPoints[j].y;
                 const intersect = ((yi > py) !== (yj > py))
                     && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                 if (intersect) inside = !inside;
             }
             
             if (inside) return { x: colCandidate, y: rCandidate };
        }
    }
  }

  return null;
};
