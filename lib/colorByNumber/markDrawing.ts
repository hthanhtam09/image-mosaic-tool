/**
 * Canvas drawing helpers for MARK grids (square-mark, hexagon-mark).
 *
 * Contains cell base rendering, symbol rendering, and the magnifier legend.
 * Do NOT add pattern grid drawing here; use patternDrawing.ts for patterns.
 */

import type { ColorByNumberData } from "./types";
import { getRoundedPolygonPath } from "./patternDrawing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getHexagonPoints = (cx: number, cy: number, r: number) =>
  [-90, -30, 30, 90, 150, 210].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });

const ctxLine = (
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

// ─── Square-mark (dot-code) cell ─────────────────────────────────────────────

export const drawDotCodeCellBase = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  showBackground: boolean = true,
) => {
  const dotR = Math.max(1.1, size * 0.055);
  const smallR = Math.max(0.55, size * 0.025);
  const pad = 0;
  const left = x + pad;
  const right = x + size - pad;
  const top = y + pad;
  const bottom = y + size - pad;

  if (showBackground) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, size, size);
  }

  ctx.fillStyle = "#000000";
  const drawDot = (cx: number, cy: number, r: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawDot(left, top, dotR, 1);
  drawDot(right, top, dotR, 1);
  drawDot(left, bottom, dotR, 1);
  drawDot(right, bottom, dotR, 1);

  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    drawDot(left + (right - left) * t, top, smallR, 0.28);
    drawDot(left + (right - left) * t, bottom, smallR, 0.28);
    drawDot(left, top + (bottom - top) * t, smallR, 0.28);
    drawDot(right, top + (bottom - top) * t, smallR, 0.28);
  }
};

export const drawDotCodeSymbol = (
  ctx: CanvasRenderingContext2D,
  code: string,
  cx: number,
  cy: number,
  size: number,
) => {
  const half = size / 2;
  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineWidth = Math.max(1.4, size * 0.13);
  ctx.lineCap = "round";

  if (code === "5") {
    const bleed = Math.max(0.75, size * 0.035);
    ctx.fillRect(left - bleed, top - bleed, size + bleed * 2, size + bleed * 2);
    ctx.restore();
    return;
  }

  if (code === "1" || code === "3" || code === "4") ctxLine(ctx, left, bottom, right, top);
  if (code === "2" || code === "3" || code === "4") ctxLine(ctx, left, top, right, bottom);
  if (code === "4") {
    ctxLine(ctx, cx, top, cx, bottom);
    ctxLine(ctx, left, cy, right, cy);
  }

  ctx.restore();
};

// ─── Hexagon-mark cell ────────────────────────────────────────────────────────

export const drawHexagonMarkCellBase = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  showBackground = true,
) => {
  const points = getHexagonPoints(cx, cy, r);
  if (showBackground) {
    getRoundedPolygonPath(ctx, points, r * 0.04);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  const dotR = Math.max(1.1, r * 0.085);
  const smallR = Math.max(0.55, r * 0.04);
  const steps = 4;
  ctx.save();

  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const dx = start.x + (end.x - start.x) * t;
      const dy = start.y + (end.y - start.y) * t;
      ctx.beginPath();
      ctx.arc(dx, dy, smallR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const drawHexagonMarkSymbol = (
  ctx: CanvasRenderingContext2D,
  code: string,
  cx: number,
  cy: number,
  size: number,
  markRadius?: number,
) => {
  const r = markRadius ?? size / Math.sqrt(3);
  const points = getHexagonPoints(cx, cy, r);
  const [top, upperRight, lowerRight, bottom, lowerLeft, upperLeft] = points;

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineWidth = Math.max(1.4, size * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (code === ".") {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.4, size * 0.15), 0, Math.PI * 2);
    ctx.fill();
  } else if (code === "1") {
    ctxLine(ctx, top.x, top.y, bottom.x, bottom.y);
  } else if (code === "2") {
    ctxLine(ctx, lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
  } else if (code === "3") {
    ctxLine(ctx, upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  } else if (code === "4") {
    ctxLine(ctx, lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
    ctxLine(ctx, upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  } else if (code === "5") {
    ctxLine(ctx, top.x, top.y, bottom.x, bottom.y);
    ctxLine(ctx, lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
    ctxLine(ctx, upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  }

  ctx.restore();
};

// ─── Magnifier legend (used on square-mark and hexagon-mark exports) ──────────

export const drawDotCodeMagnifier = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  data: ColorByNumberData,
) => {
  const cell = r * 0.25;
  const isHex = data.gridType === "hexagon-mark";
  const markCodes = isHex
    ? [".", "1", "2", "3", "4", "5"]
    : ["1", "2", "3", "4", "5"];
  const cols = 7;
  const rows = isHex ? 9 : 7;
  const hexR = cell / Math.sqrt(3);
  const rowStep = isHex ? 1.5 * hexR : cell;
  const codeAt = (row: number, col: number): string =>
    markCodes[(row * 2 + col * 3 + (row % 2 === 0 ? 1 : 4)) % markCodes.length];

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = r * 0.11;
  ctx.shadowOffsetX = r * 0.035;
  ctx.shadowOffsetY = r * 0.055;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.91, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rowOffset = isHex && row % 2 === 1 ? cell / 2 : 0;
      const midX =
        cx + (col - (cols - 1) / 2) * cell + rowOffset - (isHex ? cell / 4 : 0);
      const midY = cy + (row - (rows - 1) / 2) * rowStep;
      const rowCode = codeAt(row, col);

      if (isHex) {
        drawHexagonMarkCellBase(ctx, midX, midY, hexR, false);
      } else {
        drawDotCodeCellBase(ctx, midX - cell / 2, midY - cell / 2, cell, false);
      }

      if (col < 3) {
        if (isHex && rowCode === ".") {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.34)";
          ctx.beginPath();
          ctx.arc(midX, midY, Math.max(1.4, cell * 0.09), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.34)";
          ctx.font = `700 ${cell * 0.7}px 'Noto Sans', sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(rowCode, midX, midY);
          ctx.restore();
        }
      } else if (isHex) {
        drawHexagonMarkSymbol(ctx, rowCode, midX, midY, cell, hexR);
      } else {
        drawDotCodeSymbol(ctx, rowCode, midX, midY, cell);
      }
    }
  }

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(10, r * 0.08);
  ctx.stroke();
  ctx.restore();
};

