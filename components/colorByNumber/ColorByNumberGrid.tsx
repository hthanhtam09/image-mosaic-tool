"use client";

/**
 * Color by Number – SVG grid renderer (WYSIWYG preview)
 *
 * Shows the same 8.5×11" letter layout as the export:
 *   - White page background, grid centered with padding
 *   - Colored page (left) + Uncolored page (right)
 *   - Imported image thumbnail in top-right corner
 */

import { useCallback, useRef, useState, useMemo } from "react";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import {
  getCellLayout,
  hitTestCell,
  getGridDimensions,
} from "@/lib/colorByNumber/layoutCalculator";
import {
  getPageLayout,
  calculatePaletteLayout,
  type PaletteLayout,
  PAL_DROPLET_COUNT,
  PALETTE_GAP_TO_GRID,
  getPalColW,
  PAGE_PADDING_X,
  PAGE_PADDING_Y,
  DIAG_START_Y,
  DIAG_END_Y,
} from "@/lib/colorByNumber/export";
import type { ColorByNumberData, ColorByNumberCell } from "@/lib/colorByNumber";
import { LETTER_OUTPUT_WIDTH, LETTER_OUTPUT_HEIGHT } from "@/lib/utils";

const STROKE_COLOR = "#000000";
const DEFAULT_FILL = "#ffffff";
const TEXT_COLOR_ON_LIGHT = "#333333";
const TEXT_COLOR_ON_DARK = "#ffffff";
// const PAGE_PADDING = 20; // Removed in favor of imports
const PAGE_GAP = 30; // gap between the two pages in the viewport
const THUMB_WIDTH = 80;

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
  return DEFAULT_FILL;
};

const getTextColor = (fillColor: string): string => {
  const hex = fillColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128 ? TEXT_COLOR_ON_DARK : TEXT_COLOR_ON_LIGHT;
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
    sRH,
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

        // Droplet calculations
        const dropTop = yPos + sSW + sGap;
        const fillRatio = Math.min(1, (codeToCount.get(code) ?? 0) / maxCount);
        const filledCount = Math.round(fillRatio * PAL_DROPLET_COUNT);
        const totalDropW =
          PAL_DROPLET_COUNT * sDW + (PAL_DROPLET_COUNT - 1) * sDGap;
        const dropStartX = cx - totalDropW / 2 + sDW / 2;

        return (
          <g key={code}>
            {/* Swatch Shape */}
            {shape === "circle" && (
              <circle
                cx={cx}
                cy={swCY}
                r={sSW / 2}
                fill={color}
                stroke="#333"
                strokeWidth={2}
              />
            )}
            {shape === "square" && (
              <g>
                <rect
                  x={cx - sSW / 2}
                  y={swCY - sSW / 2}
                  width={sSW}
                  height={sSW}
                  rx={sSW * 0.15}
                  fill={color}
                  stroke="#333"
                  strokeWidth={2}
                />
              </g>
            )}
            {shape === "diamond" && (
              <g transform={`rotate(45, ${cx}, ${swCY})`}>
                <rect
                  x={cx - (sSW * 0.6) / 2}
                  y={swCY - (sSW * 0.6) / 2}
                  width={sSW * 0.6}
                  height={sSW * 0.6}
                  rx={(sSW * 0.6) * 0.15}
                  fill={color}
                  stroke="#333"
                  strokeWidth={2}
                />
              </g>
            )}
            {shape === "pentagon" && (
              <path
                d={(() => {
                  const angles = [-90, -30, 30, 90, 150, 210].map(
                    (deg) => (deg * Math.PI) / 180,
                  );
                  const r = sSW / 2;
                  const points = angles.map((angle) => ({
                    x: cx + r * Math.cos(angle),
                    y: swCY + r * Math.sin(angle),
                  }));
                  return getRoundedPolygonPath(points, r * 0.15);
                })()}
                fill={color}
                stroke="#333"
                strokeWidth={2}
              />
            )}

            {/* Label inside swatch */}
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
                const shapeY = arcCenterY + sArcRadius * Math.sin(angle);
                if (shape === "circle") {
                  return (
                    <circle
                      key={i}
                      cx={shapeX}
                      cy={shapeY}
                      r={r}
                      fill="none"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                }
                if (shape === "square") {
                  return (
                    <rect
                      key={i}
                      x={shapeX - rSquare}
                      y={shapeY - rSquare}
                      width={rSquare * 2}
                      height={rSquare * 2}
                      rx={rSquare * 2 * 0.15}
                      fill="none"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                }
                if (shape === "diamond") {
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
                        fill="none"
                        stroke="#555"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                }
                // Pentagon (Visual: Hexagon) - rounded
                const angles = [-90, -30, 30, 90, 150, 210].map(
                  (deg) => (deg * Math.PI) / 180,
                );
                const points = angles.map((a) => ({
                  x: shapeX + r * Math.cos(a),
                  y: shapeY + r * Math.sin(a),
                }));
                const pathId = `pentagon-arc-${i}`;
                return (
                  <path
                    key={i}
                    d={getRoundedPolygonPath(points, r * 0.15)}
                    fill="none"
                    stroke="#555"
                    strokeWidth={1.5}
                  />
                );
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
                <span className="shrink-0 text-black" aria-hidden>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="rotate-[-20deg]"
                  >
                    <path d="M12 19l7-7 3 3-7 7-3-3z" />
                    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                    <path d="M2 2l7.586 7.586" />
                  </svg>
                </span>
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

const CellPentagon = ({
  cell,
  filled,
  data,
  showNumbers,
  colored,
  partialColor,
  gridDims,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColor?: boolean;
  gridDims?: { width: number; height: number };
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  // Diagonal partial color check
  let isCellColored = colored;
  if (colored && partialColor && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    const diagonalY = DIAG_START_Y + (DIAG_END_Y - DIAG_START_Y) * nx;
    isCellColored = ny <= diagonalY;
  }
  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
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
          fill={textColor}
          fontSize={r * 0.6}
          fontWeight={600}
          fontFamily="sans-serif"
          {...(isCellColored ? {
            stroke: textColor === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
            strokeWidth: r * 0.08,
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
  partialColor,
  gridDims,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColor?: boolean;
  gridDims?: { width: number; height: number };
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColor && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    const diagonalY = DIAG_START_Y + (DIAG_END_Y - DIAG_START_Y) * nx;
    isCellColored = ny <= diagonalY;
  }
  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);

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
          fill={textColor}
          fontSize={layout.r * 0.6}
          fontWeight={600}
          fontFamily="sans-serif"
          {...(isCellColored ? {
            stroke: textColor === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
            strokeWidth: layout.r * 0.08,
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
  partialColor,
  gridDims,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColor?: boolean;
  gridDims?: { width: number; height: number };
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColor && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    const diagonalY = DIAG_START_Y + (DIAG_END_Y - DIAG_START_Y) * nx;
    isCellColored = ny <= diagonalY;
  }
  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
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
          fill={textColor}
          fontSize={s * 0.5}
          fontWeight={600}
          fontFamily="sans-serif"
          {...(isCellColored ? {
            stroke: textColor === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
            strokeWidth: s * 0.06,
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
  partialColor,
  gridDims,
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
  partialColor?: boolean;
  gridDims?: { width: number; height: number };
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  let isCellColored = colored;
  if (colored && partialColor && gridDims) {
    const nx = layout.cx / gridDims.width;
    const ny = layout.cy / gridDims.height;
    const diagonalY = DIAG_START_Y + (DIAG_END_Y - DIAG_START_Y) * nx;
    isCellColored = ny <= diagonalY;
  }
  const fillColor = isCellColored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
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
          fill={textColor}
          fontSize={half * 0.6}
          fontWeight={600}
          fontFamily="sans-serif"
          {...(isCellColored ? {
            stroke: textColor === TEXT_COLOR_ON_DARK ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
            strokeWidth: half * 0.08,
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
  gridLayout: any;
  paletteLayout: PaletteLayout | null;
  gridVisualTop: number;
  paletteVisualTop: number;
}

const PageGrid = ({
  data,
  filled,
  showNumbers,
  colored,
  layout,
  partialColor,
}: {
  data: ColorByNumberData;
  filled: Record<string, boolean>;
  showNumbers: boolean;
  colored: boolean;
  layout: PageGridLayout;
  partialColor?: boolean;
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
          : CellSquare;

  return (
    <g>
      {/* White page background */}
      <rect
        x={0}
        y={0}
        width={LETTER_OUTPUT_WIDTH}
        height={LETTER_OUTPUT_HEIGHT}
        fill="#ffffff"
        stroke="#d4d4d8"
        strokeWidth={2}
      />

      {/* Palette Column (always show if layout exists, per requirement) */}
      {paletteLayout && (
        <g transform={`translate(${PAGE_PADDING_X - 40}, ${paletteVisualTop})`}>
          <PaletteColumnSVG data={data} layout={paletteLayout} />
        </g>
      )}

      {/* Grid centered in its available area */}
      {/* Grid X = Padding + PaletteWidth + Gap + OffsetX - 40 offset */}
      <g
        transform={`translate(${PAGE_PADDING_X - 40 + (paletteLayout ? paletteLayout.palColW + 30 : 0) + gridLayout.offsetX}, ${gridVisualTop}) scale(${gridLayout.scale})`}
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
              partialColor={partialColor}
              gridDims={gridDims}
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
  } = useColorByNumberStore();

  // Helper to get active project data safely
  const activeProject = projects.find(p => p.id === activeProjectId);
  const data = activeProject?.data || null;
  const filled = activeProject?.filled || {};
  const zoom = activeProject?.zoom || 1;
  const panX = activeProject?.panX || 0;
  const panY = activeProject?.panY || 0;
  const showNumbers = activeProject?.showNumbers ?? true;
  const showPalette = activeProject?.showPalette ?? true;
  const partialColor = activeProject?.partialColor ?? false;
  const importedImageDataUrl = activeProject?.thumbnailDataUrl || null;
  
  // Actions wrapper
  const setZoom = (z: number) => updateActiveProject({ zoom: z });
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

  // Determine layout based on data (shared for both pages and hit testing)
  const pageLayout = useMemo<PageGridLayout | null>(() => {
    if (!data) return null;

    // Palette width available is full page width - padding
    const paletteAvailableW = LETTER_OUTPUT_WIDTH - PAGE_PADDING_X * 2;
    let pLayout: PaletteLayout | null = null;
    
    // Only calculate palette layout if enabled
    if (showPalette) {
      pLayout = calculatePaletteLayout(data, paletteAvailableW, { vertical: true });
    }
    
    const PALETTE_GAP = 30; 
    const paletteWidth = pLayout ? pLayout.palColW : 0;
    
    // Add 40px to available width (Palette moved left into margin)
    // Only applies if palette is shown? Or maybe we want consistent grid position?
    // Requirement: "nếu hide thì cho ảnh hiển thị full" (if hide, show image full)
    // So if hidden, we reclaim the space.
    
    const PALETTE_X_OFFSET = -40; // Only relevant if palette is present
    
    // If palette is hidden, paletteWidth is 0. 
    // visual available width = paletteAvailableW
    
    const maxGridW = Math.max(
        0, 
        paletteAvailableW - paletteWidth - (paletteWidth > 0 ? PALETTE_GAP : 0) - (paletteWidth > 0 ? PALETTE_X_OFFSET : 0)
    );
    
    const maxGridH =
      LETTER_OUTPUT_HEIGHT - PAGE_PADDING_Y * 2; // full height available

    const gridLayout = getPageLayout(data, maxGridW, maxGridH);
    
    const gridVisualTop = PAGE_PADDING_Y;
    
    return {
      gridLayout,
      paletteLayout: pLayout,
      gridVisualTop,
      paletteVisualTop: gridVisualTop,
    };
  }, [data, showPalette]);

  // Center the "page" in the viewport
  const pageScale = Math.min(
    (width - 40) / (LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP), // 2 pages side by side
    (height - 40) / LETTER_OUTPUT_HEIGHT,
  );
  
  // Actually, we usually show just ONE page (the colored/uncolored one) or both?
  // The code below renders BOTH side-by-side. 
  // User might only want to zoom into one?
  // For now, keep existing logic: 2 pages side-by-side.
  
  const totalContentW = LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP;
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
    const x1 = mouseX - panX;
    const y1 = mouseY - panY;

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
    else if (localX >= LETTER_OUTPUT_WIDTH + PAGE_GAP && localX <= totalContentW && localY >= 0 && localY <= LETTER_OUTPUT_HEIGHT) {
        hitX = localX - (LETTER_OUTPUT_WIDTH + PAGE_GAP);
        hitY = localY;
    }

    if (hitX >= 0 && hitY >= 0) {
        // Inverse PageGrid transform
        // transform={`translate(${PAGE_PADDING_X - 40 + (paletteLayout ? paletteLayout.palColW + 30 : 0) + gridLayout.offsetX}, ${gridVisualTop}) scale(${gridLayout.scale})`}
        
        const { gridLayout, paletteLayout, gridVisualTop } = pageLayout;
        const gridXOffset = PAGE_PADDING_X - 40 + (paletteLayout ? paletteLayout.palColW + 30 : 0) + gridLayout.offsetX;
        const gridYOffset = gridVisualTop;
        const gridScale = gridLayout.scale;
        
        const cellX = (hitX - gridXOffset) / gridScale;
        const cellY = (hitY - gridYOffset) / gridScale;
        
        const cell = hitTestCell(cellX, cellY, data);
        if (cell) {
            fillCell(cell.x, cell.y);
        }
    }
  };

  if (!data || !pageLayout) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--text-secondary)]">
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
              partialColor={partialColor}
            />
            {/* Page Border/Shadow for realism */}
            <rect 
                x={0} y={0} 
                width={LETTER_OUTPUT_WIDTH} height={LETTER_OUTPUT_HEIGHT} 
                fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" 
            />
          </g>

          {/* Right Page: Uncolored Preview */}
          <g transform={`translate(${LETTER_OUTPUT_WIDTH + PAGE_GAP}, 0)`}>
            <PageGrid
              data={data}
              filled={filled}
              showNumbers={showNumbers}
              colored={false}
              layout={pageLayout}
            />
             <rect 
                x={0} y={0} 
                width={LETTER_OUTPUT_WIDTH} height={LETTER_OUTPUT_HEIGHT} 
                fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" 
            />
            
            {/* Add Thumbnail to Top Right of Right Page */}
            {/* Thumbnail Removed */}
          </g>
        </g>
      </svg>
    </div>
  );
}
