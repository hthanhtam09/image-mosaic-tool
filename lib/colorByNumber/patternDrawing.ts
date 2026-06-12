/**
 * Canvas drawing helpers for PATTERN grids (standard, honeycomb, diamond,
 * pentagon, puzzle, islamic, fish-scale, trapezoid).
 *
 * Contains shape path helpers used by the canvas export renderer.
 * Do NOT add mark grid drawing here; use markDrawing.ts for mark grids.
 */

import { TRAPEZOID_SLANT_FACTOR } from "./layoutCalculator";

// ─── Shared polygon helper ────────────────────────────────────────────────────

export const getRoundedPolygonPath = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  radius: number,
): void => {
  if (points.length < 3) return;

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];

    const vcp_x = prev.x - curr.x;
    const vcp_y = prev.y - curr.y;
    const len_cp = Math.sqrt(vcp_x * vcp_x + vcp_y * vcp_y);
    const ucp_x = vcp_x / len_cp;
    const ucp_y = vcp_y / len_cp;

    const vcn_x = next.x - curr.x;
    const vcn_y = next.y - curr.y;
    const len_cn = Math.sqrt(vcn_x * vcn_x + vcn_y * vcn_y);
    const ucn_x = vcn_x / len_cn;
    const ucn_y = vcn_y / len_cn;

    const r = Math.min(radius, len_cp / 2, len_cn / 2);

    const sx = curr.x + ucp_x * r;
    const sy = curr.y + ucp_y * r;

    const ex = curr.x + ucn_x * r;
    const ey = curr.y + ucn_y * r;

    if (i === 0) {
      ctx.moveTo(sx, sy);
    } else {
      ctx.lineTo(sx, sy);
    }

    ctx.quadraticCurveTo(curr.x, curr.y, ex, ey);
  }
  ctx.closePath();
};

// ─── Puzzle ───────────────────────────────────────────────────────────────────

export const drawPuzzlePiecePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
  gridW: number,
  gridH: number,
) => {
  const half = size / 2;
  const tabSize = size * 0.18;
  const tabWidth = size * 0.22;

  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;

  const rightDir = x < gridW - 1 && x % 2 === 0 ? 1 : -1;
  const bottomDir = y < gridH - 1 && y % 2 === 0 ? 1 : -1;
  const leftDir = x > 0 && x % 2 === 0 ? -1 : 1;
  const topDir = y > 0 && y % 2 === 0 ? -1 : 1;

  ctx.beginPath();
  ctx.moveTo(left, top);

  // Top edge (left to right)
  ctx.lineTo(cx - tabWidth, top);
  ctx.bezierCurveTo(
    cx - tabWidth, top + topDir * tabSize * 0.2,
    cx - tabSize * 0.9, top + topDir * tabSize,
    cx, top + topDir * tabSize,
  );
  ctx.bezierCurveTo(
    cx + tabSize * 0.9, top + topDir * tabSize,
    cx + tabWidth, top + topDir * tabSize * 0.2,
    cx + tabWidth, top,
  );
  ctx.lineTo(right, top);

  // Right edge (top to bottom)
  ctx.lineTo(right, cy - tabWidth);
  ctx.bezierCurveTo(
    right + rightDir * tabSize * 0.2, cy - tabWidth,
    right + rightDir * tabSize, cy - tabSize * 0.9,
    right + rightDir * tabSize, cy,
  );
  ctx.bezierCurveTo(
    right + rightDir * tabSize, cy + tabSize * 0.9,
    right + rightDir * tabSize * 0.2, cy + tabWidth,
    right, cy + tabWidth,
  );
  ctx.lineTo(right, bottom);

  // Bottom edge (right to left)
  ctx.lineTo(cx + tabWidth, bottom);
  ctx.bezierCurveTo(
    cx + tabWidth, bottom + bottomDir * tabSize * 0.2,
    cx + tabSize * 0.9, bottom + bottomDir * tabSize,
    cx, bottom + bottomDir * tabSize,
  );
  ctx.bezierCurveTo(
    cx - tabSize * 0.9, bottom + bottomDir * tabSize,
    cx - tabWidth, bottom + bottomDir * tabSize * 0.2,
    cx - tabWidth, bottom,
  );
  ctx.lineTo(left, bottom);

  // Left edge (bottom to top)
  ctx.lineTo(left, cy + tabWidth);
  ctx.bezierCurveTo(
    left + leftDir * tabSize * 0.2, cy + tabWidth,
    left + leftDir * tabSize, cy + tabSize * 0.9,
    left + leftDir * tabSize, cy,
  );
  ctx.bezierCurveTo(
    left + leftDir * tabSize, cy - tabSize * 0.9,
    left + leftDir * tabSize * 0.2, cy - tabWidth,
    left, cy - tabWidth,
  );
  ctx.lineTo(left, top);

  ctx.closePath();
};

// ─── Islamic star-and-cross ───────────────────────────────────────────────────

export const drawIslamicTilePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
) => {
  const h = size / 2;
  const SQRT2 = Math.SQRT2;
  const R_star = h * SQRT2;
  const v = h * (SQRT2 - 1);
  const R_cross = h * (2 - SQRT2);

  const isStar = (x + y) % 2 === 0;

  ctx.beginPath();
  if (isStar) {
    ctx.moveTo(cx, cy - R_star);
    ctx.lineTo(cx + v, cy - h);
    ctx.lineTo(cx + h, cy - h);
    ctx.lineTo(cx + h, cy - v);
    ctx.lineTo(cx + R_star, cy);
    ctx.lineTo(cx + h, cy + v);
    ctx.lineTo(cx + h, cy + h);
    ctx.lineTo(cx + v, cy + h);
    ctx.lineTo(cx, cy + R_star);
    ctx.lineTo(cx - v, cy + h);
    ctx.lineTo(cx - h, cy + h);
    ctx.lineTo(cx - h, cy + v);
    ctx.lineTo(cx - R_star, cy);
    ctx.lineTo(cx - h, cy - v);
    ctx.lineTo(cx - h, cy - h);
    ctx.lineTo(cx - v, cy - h);
  } else {
    ctx.moveTo(cx - v, cy - h);
    ctx.lineTo(cx, cy - R_cross);
    ctx.lineTo(cx + v, cy - h);
    ctx.lineTo(cx + h, cy - h);
    ctx.lineTo(cx + h, cy - v);
    ctx.lineTo(cx + R_cross, cy);
    ctx.lineTo(cx + h, cy + v);
    ctx.lineTo(cx + h, cy + h);
    ctx.lineTo(cx + v, cy + h);
    ctx.lineTo(cx, cy + R_cross);
    ctx.lineTo(cx - v, cy + h);
    ctx.lineTo(cx - h, cy + h);
    ctx.lineTo(cx - h, cy + v);
    ctx.lineTo(cx - R_cross, cy);
    ctx.lineTo(cx - h, cy - v);
    ctx.lineTo(cx - h, cy - h);
  }
  ctx.closePath();
};

// ─── Fish scale ───────────────────────────────────────────────────────────────

export const drawFishScalePath = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) => {
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
};

// ─── Trapezoid ────────────────────────────────────────────────────────────────

export const drawTrapezoidPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  slant: number,
  xIndex: number,
) => {
  const deltaX = xIndex % 2 === 0 ? 0 : slant;
  const deltaX1 = (xIndex + 1) % 2 === 0 ? 0 : slant;

  ctx.beginPath();
  ctx.moveTo(x, y + deltaX);
  ctx.lineTo(x + w, y + deltaX1);
  ctx.lineTo(x + w, y + h + deltaX1);
  ctx.lineTo(x, y + h + deltaX);
  ctx.closePath();
};
