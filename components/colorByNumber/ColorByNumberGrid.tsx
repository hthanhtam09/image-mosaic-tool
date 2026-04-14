"use client";

/**
 * Color by Number – SVG grid renderer (WYSIWYG preview)
 *
 * Shows the same 8.5×11" letter layout as the export:
 *   - White page background, grid centered with padding
 *   - Colored page (left) + Uncolored page (right)
 *   - Imported image thumbnail in top-right corner
 */

import { useRef, useState, useMemo, useEffect } from "react";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import {
  getCellLayout,
  hitTestCell,
  getGridDimensions,
  getVisualGridBounds,
  TRAPEZOID_SLANT_FACTOR,
} from "@/lib/colorByNumber/layoutCalculator";
import {
  getPageLayout,
  calculatePaletteLayout,
  type PaletteLayout,
  type PartialColorMode,
  PAL_DROPLET_COUNT,
  PAGE_PADDING_X,
  PAGE_PADDING_Y,
} from "@/lib/colorByNumber/export";
import { getThemeById } from "@/lib/colorByNumber/themes";
import type { ColorByNumberData, ColorByNumberCell, PageLayout } from "@/lib/colorByNumber";

import { LETTER_OUTPUT_WIDTH, LETTER_OUTPUT_HEIGHT } from "@/lib/utils";

const STROKE_COLOR = "#000000";
const DEFAULT_FILL_LIGHT = "#ffffff";
const TEXT_COLOR_ON_DARK = "#ffffff";
// const PAGE_PADDING = 20; // Removed in favor of imports
const PAGE_GAP = 30; // gap between the two pages in the viewport

const WHITE_THRESHOLD = 250;

const isWhiteColor = (hex: string): boolean => {
  const s = hex.replace("#", "");
  if (s.length !== 6) return true;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= WHITE_THRESHOLD;
};

const getCellFillColor = (cellColor: string, filled: boolean): string => {
  if (filled || !isWhiteColor(cellColor)) return cellColor;
  return DEFAULT_FILL_LIGHT;
};

const getTextColor = (fillColor: string): string => {
  const hex = fillColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? TEXT_COLOR_ON_DARK : "#999999";
};


const getRoundedPolygonPath = (
  points: { x: number; y: number }[],
  radius: number,
): string => {
  if (points.length < 3) return "";

  let d = "";
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];

    // Vector from curr to prev
    const vcp_x = prev.x - curr.x;
    const vcp_y = prev.y - curr.y;
    const len_cp = Math.sqrt(vcp_x * vcp_x + vcp_y * vcp_y);
    const ucp_x = vcp_x / len_cp;
    const ucp_y = vcp_y / len_cp;

    // Vector from curr to next
    const vcn_x = next.x - curr.x;
    const vcn_y = next.y - curr.y;
    const len_cn = Math.sqrt(vcn_x * vcn_x + vcn_y * vcn_y);
    const ucn_x = vcn_x / len_cn;
    const ucn_y = vcn_y / len_cn;

    // Actual radius can't be larger than half the segment
    const r = Math.min(radius, len_cp / 2, len_cn / 2);

    // Start point of the curve (on the curr-prev edge)
    const sx = curr.x + ucp_x * r;
    const sy = curr.y + ucp_y * r;

    // End point of the curve (on the curr-next edge)
    const ex = curr.x + ucn_x * r;
    const ey = curr.y + ucn_y * r;

    if (i === 0) {
      d += `M ${sx},${sy}`;
    } else {
      d += ` L ${sx},${sy}`;
    }

    // Quadratic bezier curve to ex,ey with control point curr
    d += ` Q ${curr.x},${curr.y} ${ex},${ey}`;
  }
  d += " Z";
  return d;
};

/* ── Palette SVG Renderer ── */

const PaletteColumnSVG = ({
  data,
  layout,
}: {
  data: ColorByNumberData;
  layout: PaletteLayout;
}) => {
  const {
    codes,
    codeToColor,
    codeToCount,
    maxCount,
    sSW,
    sGap,
    sLbl,
    sTop,
    sDH,
    sDW,
    sDGap,
    cx: itemCx,
    sArcCircleR,
    sArcGap,
    sArcRadius,
    sInputGap,
    sInputH,
    sInputW,
    sInputPad,
    itemsPerRow,
    itemWidth,
    itemHeight,
    horizontalGap,
    verticalGap,
  } = layout;

  const shape =
    data.gridType === "honeycomb"
      ? "circle"
      : data.gridType === "diamond"
        ? "diamond"
        : data.gridType === "pentagon"
          ? "pentagon"
          : data.gridType === "puzzle"
            ? "puzzle"
            : data.gridType === "islamic"
              ? "islamic"
              : data.gridType === "fish-scale"
                ? "fish-scale"
                : data.gridType === "trapezoid"
                  ? "trapezoid"
                  : "square";

  return (
    <g>
      {codes.map((code, i) => {
        // Calculate row and column index
        const rowIndex = Math.floor(i / itemsPerRow);
        const colIndex = i % itemsPerRow;

        // Calculate position
        const xPos = colIndex * (itemWidth + horizontalGap);
        const yPos = sTop + rowIndex * (itemHeight + verticalGap);

        const cx = xPos + itemCx;
        const color = codeToColor.get(code) ?? "#999";
        const swCY = yPos + sSW / 2;

        let s = sSW;
        if (shape === "circle") s = sSW * 1.35;
        else if (shape === "diamond") s = sSW * 1.5;
        else if (shape === "square") s = sSW * 1.25;
        else if (shape === "pentagon") s = sSW * 1.35;
        else if (shape === "islamic") s = sSW * 1.7;
        else if (shape === "fish-scale") s = sSW * 1.35;
        else if (shape === "trapezoid") s = sSW * 1.25;

        // Droplet calculations
        const dropTop = yPos + sSW + sGap;
        const totalDropW =
          PAL_DROPLET_COUNT * sDW + (PAL_DROPLET_COUNT - 1) * sDGap;
        const dropStartX = cx - totalDropW / 2 + sDW / 2;

        return (
          <g key={code}>
            {/* Swatch Shape */}
            {shape === "circle" && (
              <g>
                <circle cx={cx} cy={swCY} r={s / 2} fill="none" stroke="#ffffff" strokeWidth={4} />
                <circle cx={cx} cy={swCY} r={s / 2} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}
            {shape === "square" && (
              <g>
                <rect x={cx - s / 2} y={swCY - s / 2} width={s} height={s} rx={s * 0.15} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                <rect x={cx - s / 2} y={swCY - s / 2} width={s} height={s} rx={s * 0.15} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}
            {shape === "diamond" && (
              <g transform={`rotate(45, ${cx}, ${swCY})`}>
                <rect x={cx - (s * 0.6) / 2} y={swCY - (s * 0.6) / 2} width={s * 0.6} height={s * 0.6} rx={(s * 0.6) * 0.15} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                <rect x={cx - (s * 0.6) / 2} y={swCY - (s * 0.6) / 2} width={s * 0.6} height={s * 0.6} rx={(s * 0.6) * 0.15} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}
            {shape === "pentagon" && (() => {
              const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);
              const r = s / 2;
              const points = angles.map((angle) => ({ x: cx + r * Math.cos(angle), y: swCY + r * Math.sin(angle) }));
              const d = getRoundedPolygonPath(points, r * 0.15);
              return (
                <g>
                  <path d={d} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                  <path d={d} fill={color} stroke="#333" strokeWidth={2} />
                </g>
              );
            })()}
            {shape === "trapezoid" && (() => {
              const slant = s * TRAPEZOID_SLANT_FACTOR;
              const startY = swCY - (s + slant) / 2;
              const half = s / 2;
              const pts = [
                `${cx - half},${startY}`,
                `${cx + half},${startY + slant}`,
                `${cx + half},${startY + s + slant}`,
                `${cx - half},${startY + s}`,
              ].join(" ");
              return (
                <g>
                  <polygon points={pts} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                  <polygon points={pts} fill={color} stroke="#333" strokeWidth={2} />
                </g>
              );
            })()}
            {shape === "puzzle" && (
              <g>
                <path d={getPuzzlePiecePath(cx, swCY, s, 0, 2, 3, 3)} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                <path d={getPuzzlePiecePath(cx, swCY, s, 0, 2, 3, 3)} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}
            {shape === "islamic" && (
              <g>
                <path d={getIslamicTilePath(cx, swCY, s * 0.7, 0, 0)} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" />
                <path d={getIslamicTilePath(cx, swCY, s * 0.7, 0, 0)} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}
            {shape === "fish-scale" && (
              <g>
                <circle cx={cx} cy={swCY} r={s / 2} fill="none" stroke="#ffffff" strokeWidth={4} />
                <circle cx={cx} cy={swCY} r={s / 2} fill={color} stroke="#333" strokeWidth={2} />
              </g>
            )}

            <text
              x={cx}
              y={swCY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={sLbl}
              fontWeight="bold"
              fontFamily="sans-serif"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={3}
              paintOrder="stroke"
              fill="#ffffff"
            >
              {code}
            </text>

            {/* Droplets */}
            {Array.from({ length: PAL_DROPLET_COUNT }).map((_, d) => {
              const dx = dropStartX + d * (sDW + sDGap);
              const count = codeToCount.get(code) ?? 0;
              let displayDroplets = 0;

              if (count > 0) {
                const ratio = count / maxCount;
                displayDroplets = ratio * PAL_DROPLET_COUNT;
                // If colored at all, show at least half a drop
                if (displayDroplets < 0.5) displayDroplets = 0.5;
              }

              const isFull = d + 1 <= displayDroplets;
              const isHalf = !isFull && d + 0.5 <= displayDroplets;

              const w = sDW;
              const h = sDH;

              const tipY = dropTop;
              const bottomY = dropTop + h;
              const halfW = w / 2;
              const bodyTopY = dropTop + h * 0.35;

              // Path: standard tear drop centered at dx
              const pathData = `
                M ${dx} ${tipY}
                C ${dx - halfW * 0.3} ${bodyTopY},
                  ${dx - halfW} ${bodyTopY + (bottomY - bodyTopY) * 0.2},
                  ${dx - halfW} ${bodyTopY + (bottomY - bodyTopY) * 0.55}
                A ${halfW} ${halfW} 0 1 0 ${dx + halfW} ${bodyTopY + (bottomY - bodyTopY) * 0.55}
                C ${dx + halfW} ${bodyTopY + (bottomY - bodyTopY) * 0.2},
                ${dx + halfW * 0.3} ${bodyTopY},
                ${dx} ${tipY}
                Z
              `;

              const clipId = `clip-half-${code}-${d}`;

              return (
                <g key={d}>
                  {isHalf && (
                    <defs>
                      <clipPath id={clipId}>
                        <rect x={dx - halfW} y={tipY} width={halfW} height={h} />
                      </clipPath>
                    </defs>
                  )}

                  {/* Outer base white border */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Base white background so uncolored portion is white */}
                  <path d={pathData} fill="#ffffff" />

                  {/* Fill */}
                  {isFull && <path d={pathData} fill={color} />}
                  {isHalf && (
                    <path d={pathData} fill={color} clipPath={`url(#${clipId})`} />
                  )}

                  {/* Outline */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#555"
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* 3 shapes in arc to the right of swatch (top → bottom), outline only; shape follows pattern (circle/square/diamond). Square uses inscribed size so they don't overlap. */}
            {(() => {
              const arcCenterX = cx + sSW / 2 + sArcGap + sArcRadius;
              const arcCenterY = swCY;
              const arcAngles = [-80, 0, 80].map(
                (deg) => (deg * Math.PI) / 180,
              );
              const r = sArcCircleR;
              const rSquare = r / Math.SQRT2; // half-size for square only, so squares don't overlap

              return arcAngles.map((angle, i) => {
                const shapeX = arcCenterX + sArcRadius * Math.cos(angle);
                let shapeY = arcCenterY + sArcRadius * Math.sin(angle);

                if (shape === "circle") {
                  return (
                    <circle
                      key={i}
                      cx={shapeX}
                      cy={shapeY}
                      r={r}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else if (shape === "square") {
                  return (
                    <rect
                      key={i}
                      x={shapeX - rSquare}
                      y={shapeY - rSquare}
                      width={rSquare * 2}
                      height={rSquare * 2}
                      rx={rSquare * 2 * 0.15}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else if (shape === "diamond") {
                  // Approximating diamond with rotated rect
                  const side = r * 2 * 0.707 * 0.9;
                  return (
                    <g key={i} transform={`rotate(45, ${shapeX}, ${shapeY})`}>
                      <rect
                        x={shapeX - side / 2}
                        y={shapeY - side / 2}
                        width={side}
                        height={side}
                        rx={side * 0.15}
                        fill="#ffffff"
                        stroke="#555"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                } else if (shape === "puzzle") {
                  return (
                    <path
                      key={i}
                      d={getPuzzlePiecePath(shapeX, shapeY, r * 1.4, 0, 2, 3, 3)}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else if (shape === "islamic") {
                  return (
                    <path
                      key={i}
                      d={getIslamicTilePath(shapeX, shapeY, r * 1.4, 0, 0)}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else if (shape === "fish-scale") {
                  return (
                    <path
                      key={i}
                      d={getFishScalePath(shapeX, shapeY, r * 2)}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else if (shape === "trapezoid") {
                  if (i === 1) shapeY += r * 0.2; // Shift middle shape down
                  const size = rSquare * 2;
                  const slant = size * TRAPEZOID_SLANT_FACTOR;
                  const startY = shapeY - (size + slant) / 2;
                  return (
                    <polygon
                      key={i}
                      points={[
                        `${shapeX - rSquare},${startY}`,
                        `${shapeX + rSquare},${startY + slant}`,
                        `${shapeX + rSquare},${startY + size + slant}`,
                        `${shapeX - rSquare},${startY + size}`,
                      ].join(" ")}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                } else {
                  // Pentagon (Visual: Hexagon) - rounded
                  const pAngles = [-90, -30, 30, 90, 150, 210].map(
                    (deg) => (deg * Math.PI) / 180,
                  );
                  const points = pAngles.map((a) => ({
                    x: shapeX + r * Math.cos(a),
                    y: shapeY + r * Math.sin(a),
                  }));
                  return (
                    <path
                      key={i}
                      d={getRoundedPolygonPath(points, r * 0.15)}
                      fill="#ffffff"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                }
              });
            })()}

            {/* Input box below droplets: white, rounded, pencil icon + dotted placeholder */}
            <foreignObject
              x={cx - sInputW / 2}
              y={dropTop + sDH + sInputGap}
              width={sInputW}
              height={sInputH}
              className="overflow-visible"
            >
              <div
                className="flex h-full w-full items-end gap-2 rounded-lg bg-white shadow-sm"
                style={{
                  boxSizing: "border-box",
                  paddingTop: sInputPad * 2,
                  paddingBottom: sInputPad,
                  paddingLeft: sInputPad * 1.5,
                  paddingRight: sInputPad * 1.5,
                }}
              >
                <input
                  type="text"
                  className="min-w-0 flex-1 border-0 bg-transparent pb-0.5 text-center text-xs text-[#333] outline-none placeholder:text-[#999]"
                  style={{ boxSizing: "border-box" }}
                  placeholder="· · · · · · · · · · ·"
                  aria-label={`Input for color ${code}`}
                  defaultValue=""
                />
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
};

/* ── Cell renderers ── */

/**
 * Generate SVG path for a puzzle piece.
 * cx, cy = center of cell; size = cell size (width = height)
 * x, y = grid position; gridW, gridH = grid dimensions
 *
 * Every edge has either a tab (protrudes outward) or blank (indents inward).
 * Adjacent cells interlock: if cell A has a tab on its right, cell A+1 has a blank on its left.
 * Boundary edges always have blanks (indentations).
 */
const getPuzzlePiecePath = (
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
  gridW: number,
  gridH: number,
): string => {
  const half = size / 2;
  const tabSize = size * 0.18; // how far tab/blank extends
  const tabWidth = size * 0.22; // width of the tab neck

  // Corners
  const left = cx - half;
  const right = cx + half;
  const top = cy - half;
  const bottom = cy + half;

  // Direction for each edge:
  //   Right: +1 = tab (protrudes right), -1 = blank (indents left)
  //   Bottom: +1 = tab (protrudes down), -1 = blank (indents up)
  //   Left: -1 = tab (protrudes left), +1 = blank (indents right)
  //   Top: -1 = tab (protrudes up), +1 = blank (indents down)
  //
  // Boundary edges always get blank. Internal edges alternate tab/blank
  // such that adjacent cells have complementary edges.
  const rightDir = (x < gridW - 1 && x % 2 === 0) ? 1 : -1;
  const bottomDir = (y < gridH - 1 && y % 2 === 0) ? 1 : -1;
  const leftDir = (x > 0 && x % 2 === 0) ? -1 : 1;
  const topDir = (y > 0 && y % 2 === 0) ? -1 : 1;

  let d = "";

  // Start from top-left corner
  d += `M ${left} ${top}`;

  // ── Top edge (left to right) ──
  d += ` L ${cx - tabWidth} ${top}`;
  d += ` C ${cx - tabWidth} ${top + topDir * tabSize * 0.2}, ${cx - tabSize * 0.9} ${top + topDir * tabSize}, ${cx} ${top + topDir * tabSize}`;
  d += ` C ${cx + tabSize * 0.9} ${top + topDir * tabSize}, ${cx + tabWidth} ${top + topDir * tabSize * 0.2}, ${cx + tabWidth} ${top}`;
  d += ` L ${right} ${top}`;

  // ── Right edge (top to bottom) ──
  d += ` L ${right} ${cy - tabWidth}`;
  d += ` C ${right + rightDir * tabSize * 0.2} ${cy - tabWidth}, ${right + rightDir * tabSize} ${cy - tabSize * 0.9}, ${right + rightDir * tabSize} ${cy}`;
  d += ` C ${right + rightDir * tabSize} ${cy + tabSize * 0.9}, ${right + rightDir * tabSize * 0.2} ${cy + tabWidth}, ${right} ${cy + tabWidth}`;
  d += ` L ${right} ${bottom}`;

  // ── Bottom edge (right to left) ──
  d += ` L ${cx + tabWidth} ${bottom}`;
  d += ` C ${cx + tabWidth} ${bottom + bottomDir * tabSize * 0.2}, ${cx + tabSize * 0.9} ${bottom + bottomDir * tabSize}, ${cx} ${bottom + bottomDir * tabSize}`;
  d += ` C ${cx - tabSize * 0.9} ${bottom + bottomDir * tabSize}, ${cx - tabWidth} ${bottom + bottomDir * tabSize * 0.2}, ${cx - tabWidth} ${bottom}`;
  d += ` L ${left} ${bottom}`;

  // ── Left edge (bottom to top) ──
  d += ` L ${left} ${cy + tabWidth}`;
  d += ` C ${left + leftDir * tabSize * 0.2} ${cy + tabWidth}, ${left + leftDir * tabSize} ${cy + tabSize * 0.9}, ${left + leftDir * tabSize} ${cy}`;
  d += ` C ${left + leftDir * tabSize} ${cy - tabSize * 0.9}, ${left + leftDir * tabSize * 0.2} ${cy - tabWidth}, ${left} ${cy - tabWidth}`;
  d += ` L ${left} ${top}`;

  d += " Z";
  return d;
};

/**
 * Generate SVG path for an Islamic star-and-cross tile.
 * Stars at (x+y) even, crosses at (x+y) odd.
 * The geometry is a mathematically perfect zero-gap tessellation.
 */
const getIslamicTilePath = (
  cx: number,
  cy: number,
  size: number,
  x: number,
  y: number,
): string => {
  const h = size / 2;
  const SQRT2 = Math.SQRT2;
  const R_star = h * SQRT2;          // Distance to star tips
  const v = h * (SQRT2 - 1);         // Distance to star inner valleys
  const R_cross = h * (2 - SQRT2);   // Distance to cross inner pinches (2h - R_star)

  const isStar = (x + y) % 2 === 0;

  if (isStar) {
    // 8-pointed star: 16 vertices
    // Cardinal points stick out into neighbor cells.
    return [
      `M ${cx} ${cy - R_star}`,              // N tip
      `L ${cx + v} ${cy - h}`,               // N-NE valley
      `L ${cx + h} ${cy - h}`,               // NE corner
      `L ${cx + h} ${cy - v}`,               // E-NE valley
      `L ${cx + R_star} ${cy}`,              // E tip
      `L ${cx + h} ${cy + v}`,               // E-SE valley
      `L ${cx + h} ${cy + h}`,               // SE corner
      `L ${cx + v} ${cy + h}`,               // S-SE valley
      `L ${cx} ${cy + R_star}`,              // S tip
      `L ${cx - v} ${cy + h}`,               // S-SW valley
      `L ${cx - h} ${cy + h}`,               // SW corner
      `L ${cx - h} ${cy + v}`,               // W-SW valley
      `L ${cx - R_star} ${cy}`,              // W tip
      `L ${cx - h} ${cy - v}`,               // W-NW valley
      `L ${cx - h} ${cy - h}`,               // NW corner
      `L ${cx - v} ${cy - h}`,               // N-NW valley
      `Z`,
    ].join(" ");
  } else {
    // Cross/X shape: 16 vertices
    // Contours perfectly around the 4 adjacent stars.
    return [
      `M ${cx - v} ${cy - h}`,               // Top edge, left of center
      `L ${cx} ${cy - R_cross}`,             // N inward valley
      `L ${cx + v} ${cy - h}`,               // Top edge, right of center
      `L ${cx + h} ${cy - h}`,               // TR corner
      `L ${cx + h} ${cy - v}`,               // Right edge, top of center
      `L ${cx + R_cross} ${cy}`,             // E inward valley
      `L ${cx + h} ${cy + v}`,               // Right edge, bottom of center
      `L ${cx + h} ${cy + h}`,               // BR corner
      `L ${cx + v} ${cy + h}`,               // Bottom edge, right of center
      `L ${cx} ${cy + R_cross}`,             // S inward valley
      `L ${cx - v} ${cy + h}`,               // Bottom edge, left of center
      `L ${cx - h} ${cy + h}`,               // BL corner
      `L ${cx - h} ${cy + v}`,               // Left edge, bottom of center
      `L ${cx - R_cross} ${cy}`,             // W inward valley
      `L ${cx - h} ${cy - v}`,               // Left edge, top of center
      `L ${cx - h} ${cy - h}`,               // TL corner
      `Z`,
    ].join(" ");
  }
};

/**
 * Fish Scale shape: A circle with the top part cropped by the row above.
 * For the palette and individual cells, we use this path.
 */
const getFishScalePath = (cx: number, cy: number, size: number) => {
  const r = size / 2;
  // A simple circle is often used for fish scales if the overlap is handled by drawing order.
  // However, for single swatches, a circle is fine.
  // If we want the "scallop" look:
  return `M ${cx - r},${cy} A ${r},${r} 0 1 0 ${cx + r},${cy} A ${r},${r} 0 1 0 ${cx - r},${cy}`;
};

const CellTrapezoid = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== "none" && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === "diagonal-bl-tr") {
      isCellColored = ny <= 1 - nx;
    } else if (partialColorMode === "diagonal-tl-br") {
      isCellColored = ny <= nx;
    } else if (partialColorMode === "horizontal-middle") {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === "horizontal-sides") {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);



  const W = data.cellSize;
  const H = data.cellSize;
  const slant = W * TRAPEZOID_SLANT_FACTOR;
  const deltaX = cell.x % 2 === 0 ? 0 : slant;
  const deltaX1 = (cell.x + 1) % 2 === 0 ? 0 : slant;

  const x0 = cell.x * W;
  const x1 = (cell.x + 1) * W;
  const y0 = cell.y * H;
  const y1 = (cell.y + 1) * H;

  const polyPoints = [
    `${x0},${y0 + deltaX}`,
    `${x1},${y0 + deltaX1}`,
    `${x1},${y1 + deltaX1}`,
    `${x0},${y1 + deltaX}`,
  ].join(" ");

  return (
    <g>
      <polygon
        points={polyPoints}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={W * 0.7}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored
            ? {
              stroke:
                textFill === TEXT_COLOR_ON_DARK
                  ? "rgba(0,0,0,0.6)"
                  : "rgba(255,255,255,0.8)",
              strokeWidth: W * 0.1,
              paintOrder: "stroke",
            }
            : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellFishScale = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const r = layout.r;

  return (
    <g>
      <circle
        cx={layout.cx}
        cy={layout.cy}
        r={r}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={cell.y === data.height - 1 ? layout.cy : layout.cy - r * 0.3} // Offset up for better centering in visible top half, except for last row which is fully visible
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={r * 1.1}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: r * 0.15,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellIslamic = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const s = data.cellSize;

  return (
    <g>
      <path
        d={getIslamicTilePath(layout.cx, layout.cy, s, cell.x, cell.y)}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={layout.r * 1.1}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: s * 0.1,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellPuzzle = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const s = data.cellSize;

  return (
    <g>
      <path
        d={getPuzzlePiecePath(layout.cx, layout.cy, s, cell.x, cell.y, data.width, data.height)}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={layout.r * 1.1}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: s * 0.1,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellPentagon = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const r = layout.r;
  const cx = layout.cx;
  const cy = layout.cy;

  const angles = [-90, -30, 30, 90, 150, 210].map((deg) => (deg * Math.PI) / 180);
  const points = angles.map((angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }));

  return (
    <g>
      <path
        d={getRoundedPolygonPath(points, r * 0.15)}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={r * 1.4}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: r * 0.15,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellCircle = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);


  return (
    <g>
      <circle
        cx={layout.cx}
        cy={layout.cy}
        r={layout.r}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={layout.r * 1.4}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: layout.r * 0.15,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellSquare = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const s = data.cellSize;

  return (
    <g>
      <rect
        x={cell.x * s}
        y={cell.y * s}
        width={s}
        height={s}
        rx={s * 0.15}
        fill={fillColor}
        stroke={STROKE_COLOR}
        strokeWidth={1.2}
      />
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={s * 0.7}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: s * 0.1,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

const CellDiamond = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColorMode,
  gridDims,
  removeBackground,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColorMode?: PartialColorMode;
  gridDims?: { width: number; height: number };
  removeBackground?: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColorMode && partialColorMode !== 'none' && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    if (partialColorMode === 'diagonal-bl-tr') {
      isCellColored = ny <= (1 - nx);
    } else if (partialColorMode === 'diagonal-tl-br') {
      isCellColored = ny <= nx;
    } else if (partialColorMode === 'horizontal-middle') {
      isCellColored = ny <= 0.5;
    } else if (partialColorMode === 'horizontal-sides') {
      isCellColored = ny > 0.5;
    }
  }

  // In transparent mode, skip uncolored cells entirely
  const isBgCell = !cell.code;
  if (removeBackground && isBgCell) return null;

  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL_LIGHT;
  const textFill = getTextColor(fillColor);

  const half = layout.r;
  const side = half * Math.sqrt(2);

  return (
    <g>
      <g transform={`rotate(45, ${layout.cx}, ${layout.cy})`}>
        <rect
          x={layout.cx - side / 2}
          y={layout.cy - side / 2}
          width={side}
          height={side}
          rx={side * 0.15}
          fill={fillColor}
          stroke={STROKE_COLOR}
          strokeWidth={1.2}
        />
      </g>
      {showNumbers && (
        <text
          x={layout.cx}
          y={layout.cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={half * 1.1}
          fontWeight={400}
          fontFamily="'Noto Sans', sans-serif"
          {...(isCellColored ? {
            stroke: textFill === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
            strokeWidth: half * 0.15,
            paintOrder: "stroke",
          } : {})}
        >
          {cell.code}
        </text>
      )}
    </g>
  );
};

/* ── Grid rendered onto an 8.5×11 page ── */
interface PageGridLayout {
  gridLayout: PageLayout;
  paletteLayout: PaletteLayout | null;
  gridVisualTop: number;
  paletteVisualTop: number;
  gridVisualLeftOffset: number;
  visualBounds: { width: number; height: number; minX: number; minY: number };
}

const PageGrid = ({
  data,
  filled,
  showNumbers,
  colored,
  layout,
  partialColorMode,
  pageBgColor,
  removeBackground,
}: {
  data: ColorByNumberData;
  filled: Record<string, boolean>;
  showNumbers: boolean;
  colored: boolean;
  layout: PageGridLayout;
  partialColorMode?: PartialColorMode;
  pageBgColor?: string;
  removeBackground?: boolean;
}) => {
  const {
    gridLayout,
    paletteLayout,
    paletteVisualTop,
    gridVisualTop,
  } = layout;

  const gridDims = getGridDimensions(data);

  const CellComponent =
    data.gridType === "honeycomb"
      ? CellCircle
      : data.gridType === "diamond"
        ? CellDiamond
        : data.gridType === "pentagon"
          ? CellPentagon
          : data.gridType === "puzzle"
            ? CellPuzzle
            : data.gridType === "islamic"
              ? CellIslamic
              : data.gridType === "fish-scale"
                ? CellFishScale
                : data.gridType === "trapezoid"
                  ? CellTrapezoid
                  : CellSquare;

  // Checker pattern ID for transparent background preview
  const checkerId = `checker-${colored ? 'c' : 'u'}`;

  return (
    <g>
      {/* Page background */}
      {removeBackground ? (
        // Transparent mode: show checker pattern so user sees transparency
        <>
          <defs>
            <pattern id={checkerId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#cccccc" />
              <rect x="10" y="0" width="10" height="10" fill="#ffffff" />
              <rect x="0" y="10" width="10" height="10" fill="#ffffff" />
              <rect x="10" y="10" width="10" height="10" fill="#cccccc" />
            </pattern>
          </defs>
          <rect
            x={0}
            y={0}
            width={LETTER_OUTPUT_WIDTH}
            height={LETTER_OUTPUT_HEIGHT}
            fill={`url(#${checkerId})`}
            stroke="#d4d4d8"
            strokeWidth={2}
          />
        </>
      ) : (
        <rect
          x={0}
          y={0}
          width={LETTER_OUTPUT_WIDTH}
          height={LETTER_OUTPUT_HEIGHT}
          fill={pageBgColor ?? "#ffffff"}
          stroke="#d4d4d8"
          strokeWidth={2}
        />
      )}

      {/* Palette Column (only show if not removeBackground) */}
      {paletteLayout && !removeBackground && (
        <g transform={`translate(${PAGE_PADDING_X - 40}, ${paletteVisualTop})`}>
          <PaletteColumnSVG data={data} layout={paletteLayout} />
        </g>
      )}

      {/* Grid centered in its available area */}
      {/* Grid X = Padding + PaletteWidth + Gap + OffsetX - 40 offset */}
      <g
        transform={`translate(${PAGE_PADDING_X - 40 + (paletteLayout && !removeBackground ? paletteLayout.palColW + 30 : 0) + gridLayout.offsetX + (layout.gridVisualLeftOffset || 0) + (removeBackground ? -layout.visualBounds.minX * gridLayout.scale : 0)}, ${gridVisualTop + (!paletteLayout || removeBackground ? gridLayout.offsetY : 0) + (removeBackground ? -layout.visualBounds.minY * gridLayout.scale : 0)}) scale(${gridLayout.scale})`}
      >
        <g transform={`translate(0, 0)`}>
          {data.cells.map((cell) => (
            <CellComponent
              key={`${cell.x},${cell.y}`}
              cell={cell}
              filled={!!filled[`${cell.x},${cell.y}`]}
              data={data}
              showNumbers={showNumbers}
              colored={colored}
              partialColorMode={partialColorMode}
              gridDims={gridDims}
              removeBackground={removeBackground}
            />
          ))}
        </g>
      </g>
    </g>
  );
};

interface ColorByNumberGridProps {
  width: number;
  height: number;
}

export default function ColorByNumberGrid({
  width,
  height,
}: ColorByNumberGridProps) {
  const {
    activeProjectId, // Use active project data
    projects,
    updateActiveProject, // To update zoom/pan/filled
    globalShowNumbers,
    globalShowPalette,
    globalTheme,
  } = useColorByNumberStore();

  // Helper to get active project data safely
  const activeProject = projects.find(p => p.id === activeProjectId);
  const data = activeProject?.data || null;
  const filled = activeProject?.filled || {};
  const zoom = activeProject?.zoom || 1;
  const panX = activeProject?.panX || 0;
  const panY = activeProject?.panY || 0;
  const showNumbers = activeProject?.removeBackground ? false : globalShowNumbers;
  const showPalette = activeProject?.removeBackground ? false : globalShowPalette;
  const partialColorMode = (activeProject?.partialColorMode ?? 'none') as PartialColorMode;
  const theme = getThemeById(globalTheme);
  const bgColor = theme.backgroundColor;


  // Actions wrapper
  const setPan = (x: number, y: number) => updateActiveProject({ panX: x, panY: y });

  const fillCell = (x: number, y: number) => {
    if (!activeProject || !data || !activeProject.selectedCode) return;
    const cell = data.cells.find((c) => c.x === x && c.y === y);
    if (!cell || cell.code !== activeProject.selectedCode) return;
    const key = `${x},${y}`;
    const newFilled = { ...activeProject.filled, [key]: true };
    updateActiveProject({ filled: newFilled });
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const didPanRef = useRef(false);
  const [lastPointer, setLastPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Prevent default scroll behavior on wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', preventScroll, { passive: false });
    return () => el.removeEventListener('wheel', preventScroll);
  }, []);

  // Determine layout based on data (shared for both pages and hit testing)
  const pageLayout = useMemo<PageGridLayout | null>(() => {
    if (!data) return null;

    // 1. Determine "Safe Area" based on fixed margins
    const padX = showPalette ? PAGE_PADDING_X : 0;
    const padY = showPalette ? PAGE_PADDING_Y : 0;

    const safeW = LETTER_OUTPUT_WIDTH - padX * 2;
    const safeH = LETTER_OUTPUT_HEIGHT - padY * 2;

    let pLayout: PaletteLayout | null = null;

    // Only calculate palette layout if enabled
    if (showPalette) {
      pLayout = calculatePaletteLayout(data, safeW, { vertical: true });
    }

    const PALETTE_GAP = 30;
    const paletteWidth = pLayout ? pLayout.palColW : 0;

    // Add 40px to available width (Palette moved left into margin)
    // Only applies if palette is shown? Or maybe we want consistent grid position?
    // Requirement: "nếu hide thì cho ảnh hiển thị full" (if hide, show image full)
    // So if hidden, we reclaim the space.

    const PALETTE_X_OFFSET = -40; // Only relevant if palette is present

    // If palette is hidden, paletteWidth is 0. 
    // visual available width = safeW

    let maxGridW = Math.max(
      0,
      safeW - paletteWidth - (paletteWidth > 0 ? PALETTE_GAP : 0) - (paletteWidth > 0 ? PALETTE_X_OFFSET : 0)
    );

    let maxGridH = safeH;

    let gridVisualLeftOffset = 0;
    let gridVisualTopOffset = 0;

    const visualBounds = getVisualGridBounds(data);

    // Keep a little extra air in Object Focus mode so the subject is not clipped.
    if (activeProject?.removeBackground) {
      const padRatio = 0.16;
      maxGridW = safeW * (1 - padRatio * 2);
      maxGridH = safeH * (1 - padRatio * 2);
      gridVisualLeftOffset = safeW * padRatio;
      gridVisualTopOffset = safeH * padRatio;
    }

    const gridLayout = getPageLayout(data, maxGridW, maxGridH);

    const gridVisualTop = PAGE_PADDING_Y + gridVisualTopOffset;

    // Vertical positioning: align palette swatches with grid rows (matching export.ts)
    const firstCell = getCellLayout(0, 0, data);
    const gridFirstRowCenterY = gridVisualTop + firstCell.cy * gridLayout.scale;
    const paletteFirstSwatchCenterY = pLayout ? pLayout.sTop + pLayout.sSW / 2 : 0;
    const paletteVisualTop = pLayout ? gridFirstRowCenterY - paletteFirstSwatchCenterY + 25 : gridVisualTop;

    return {
      gridLayout,
      paletteLayout: pLayout,
      gridVisualTop,
      paletteVisualTop,
      gridVisualLeftOffset,
      visualBounds,
    };
  }, [data, showPalette, activeProject?.removeBackground]);

  // Center the "page" in the viewport
  const pageScale = Math.min(
    (width - 40) / (LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP), // 2 pages side by side
    (height - 40) / LETTER_OUTPUT_HEIGHT,
  );

  // Actually, we usually show just ONE page (the colored/uncolored one) or both?
  // The code below renders BOTH side-by-side. 
  // User might only want to zoom into one?
  // For now, keep existing logic: 2 pages side-by-side.

  const totalContentW = activeProject?.removeBackground ? LETTER_OUTPUT_WIDTH : LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP;
  const totalContentH = LETTER_OUTPUT_HEIGHT;

  // Initial center (before pan)
  const centerX = (width - totalContentW * pageScale) / 2;
  const centerY = (height - totalContentH * pageScale) / 2;

  // Event Handlers for Panning
  const handlePointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true);
    didPanRef.current = false;
    setLastPointer({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !lastPointer) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      didPanRef.current = true;
    }

    setPan(panX + dx, panY + dy);
    setLastPointer({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    containerRef.current?.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setLastPointer(null);
  };

  // Click to Fill
  const handleClick = (e: React.MouseEvent) => {
    if (didPanRef.current || !data || !pageLayout) return;

    // Transform screen coordinates to SVG coordinates
    // We need to inverse the transform: translate(pan) -> scale(zoom) -> translate(center) -> scale(pageScale)

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Inverse Pan
    // Inverse Zoom (pivot is center of screen? No, Zoom is usually around center or applied to group)
    // The render transform is:
    // translate(centerX + panX, centerY + panY) scale(pageScale * zoom)

    // So:
    // x_local = (mouseX - (centerX + panX)) / (pageScale * zoom)
    // y_local = (mouseY - (centerY + panY)) / (pageScale * zoom)

    const scale = pageScale * zoom;
    const localX = (mouseX - (centerX + panX)) / scale;
    const localY = (mouseY - (centerY + panY)) / scale;

    // Identify which page was clicked
    // Left Page (Colored): x range [0, LETTER_OUTPUT_WIDTH]
    // Right Page (Uncolored): x range [LETTER_OUTPUT_WIDTH + PAGE_GAP, LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP]

    // Since both pages display the SAME grid (just different rendering), checking against either is fine for finding the cell.
    // However, the Grid Render inside PageGrid has its own transform.

    let hitX = -1;
    let hitY = -1;

    // Check Left Page
    if (localX >= 0 && localX <= LETTER_OUTPUT_WIDTH && localY >= 0 && localY <= LETTER_OUTPUT_HEIGHT) {
      hitX = localX;
      hitY = localY;
    }
    // Check Right Page
    else if (!activeProject?.removeBackground && localX >= LETTER_OUTPUT_WIDTH + PAGE_GAP && localX <= totalContentW && localY >= 0 && localY <= LETTER_OUTPUT_HEIGHT) {
      hitX = localX - (LETTER_OUTPUT_WIDTH + PAGE_GAP);
      hitY = localY;
    }

    if (hitX >= 0 && hitY >= 0) {
      // Inverse PageGrid transform
      const { gridLayout, paletteLayout, gridVisualTop, gridVisualLeftOffset = 0, visualBounds } = pageLayout;
      const removeBackground = activeProject?.removeBackground;
      const gridXOffset = PAGE_PADDING_X - 40 + (paletteLayout ? paletteLayout.palColW + 30 : 0) + gridLayout.offsetX + gridVisualLeftOffset + (removeBackground ? -visualBounds.minX * gridLayout.scale : 0);
      const gridYOffset = gridVisualTop + (!paletteLayout || removeBackground ? gridLayout.offsetY : 0) + (removeBackground ? -visualBounds.minY * gridLayout.scale : 0);
      const gridScale = gridLayout.scale;

      const cellX = (hitX - gridXOffset) / gridScale;
      const cellY = (hitY - gridYOffset) / gridScale;

      const cell = hitTestCell(cellX, cellY, data);
      if (cell) {
        fillCell(cell.x, cell.y);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!activeProject) return;

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomSensitivity = 0.009;
      const zoomDelta = -e.deltaY * zoomSensitivity;

      let newZoom = activeProject.zoom * (1 + zoomDelta);
      newZoom = Math.max(0.05, Math.min(20, newZoom));

      if (newZoom !== activeProject.zoom) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const currentScale = pageScale * activeProject.zoom;
          const localX = (mouseX - (centerX + panX)) / currentScale;
          const localY = (mouseY - (centerY + panY)) / currentScale;

          const newScale = pageScale * newZoom;
          const newPanX = mouseX - centerX - localX * newScale;
          const newPanY = mouseY - centerY - localY * newScale;

          updateActiveProject({
            zoom: newZoom,
            panX: newPanX,
            panY: newPanY
          });
        }
      }
    } else {
      // Pan
      updateActiveProject({
        panX: panX - e.deltaX,
        panY: panY - e.deltaY
      });
    }
  };

  if (!data || !pageLayout) {
    return (
      <div className="flex h-full w-full items-center justify-center text-(--text-secondary)">
        {!activeProjectId ? "Select a project to view" : "Processing..."}
      </div>
    );
  }

  const finalScale = pageScale * zoom;
  const finalX = centerX + panX;
  const finalY = centerY + panY;

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <g transform={`translate(${finalX}, ${finalY}) scale(${finalScale})`}>
          {/* Left Page: Colored Preview */}
          <g>
            <PageGrid
              data={data}
              filled={filled}
              showNumbers={showNumbers}
              colored={true}
              layout={pageLayout}
              partialColorMode={partialColorMode}
              pageBgColor={bgColor}
              removeBackground={activeProject?.removeBackground}
            />
            {/* Page Border/Shadow for realism */}
            <rect
              x={0} y={0}
              width={LETTER_OUTPUT_WIDTH} height={LETTER_OUTPUT_HEIGHT}
              fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1"
            />
          </g>

          {/* Right Page: Uncolored Preview */}
          {!activeProject?.removeBackground && (
            <g transform={`translate(${LETTER_OUTPUT_WIDTH + PAGE_GAP}, 0)`}>
              <PageGrid
                data={data}
                filled={filled}
                showNumbers={showNumbers}
                colored={false}
                layout={pageLayout}
                pageBgColor={bgColor}
                removeBackground={activeProject?.removeBackground}
              />
              <rect
                x={0} y={0}
                width={LETTER_OUTPUT_WIDTH} height={LETTER_OUTPUT_HEIGHT}
                fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
