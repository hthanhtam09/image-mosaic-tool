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
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  const fillColor = colored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
  const r = layout.r;
  const cx = layout.cx;
  const cy = layout.cy;

  // Hexagon (6 sides) for tight packing "like the image"
  // Point up: -90, -30, 30, 90, 150, 210
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
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  const fillColor = colored
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
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  const fillColor = colored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
  const s = data.cellSize;
  // Use s for rx? The layout.r is not available here, but s is the full side length.
  // We want corners to be rounded.
  
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
}: {
  cell: ColorByNumberCell;
  filled: boolean;
  data: ColorByNumberData;
  showNumbers: boolean;
  colored: boolean;
}) => {
  const layout = getCellLayout(cell.x, cell.y, data);
  const fillColor = colored
    ? getCellFillColor(cell.color, filled)
    : DEFAULT_FILL;
  const textColor = getTextColor(fillColor);
  const half = layout.r; 
  // half is distance from center to vertex.
  // Bounding square side for a diamond with "radius" half:
  // We want the diamond vertices to match (cx, cy-half), etc.
  // A square centered at cy,cy rotated 45deg has vertices at distance "d" from center.
  // For a square of side L, d = L * sqrt(2) / 2.
  // We want d = half.
  // So L * sqrt(2) / 2 = half => L = 2 * half / sqrt(2) = half * sqrt(2).
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
}: {
  data: ColorByNumberData;
  filled: Record<string, boolean>;
  showNumbers: boolean;
  colored: boolean;
  layout: PageGridLayout;
}) => {
  const {
    gridLayout,
    paletteLayout,
    paletteVisualTop,
    gridVisualTop,
  } = layout;

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
            />
          ))}
        </g>
      </g>
    </g>
  );
};

interface ColorByNumberGridProps {
  viewportWidth: number;
  viewportHeight: number;
}

export default function ColorByNumberGrid({
  viewportWidth,
  viewportHeight,
}: ColorByNumberGridProps) {
  const {
    data,
    filled,
    selectedCode,
    zoom,
    panX,
    panY,
    showNumbers,
    importedImageDataUrl,
    fillCell,
    setZoom,
    setPan,
  } = useColorByNumberStore();
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
    
    // Always show palette
    pLayout = calculatePaletteLayout(data, paletteAvailableW, { vertical: true });
    
    const PALETTE_GAP = 30; 
    const paletteWidth = pLayout ? pLayout.palColW : 0;
    
    // Add 40px to available width (Palette moved left into margin)
    const PALETTE_X_OFFSET = -40;
    const maxGridW = Math.max(0, paletteAvailableW - paletteWidth - (paletteWidth > 0 ? PALETTE_GAP : 0) - PALETTE_X_OFFSET);
    const maxGridH = LETTER_OUTPUT_HEIGHT - PAGE_PADDING_Y * 2;

    // Calculate grid layout first
    const gLayout = getPageLayout(data, maxGridW, maxGridH);

    // Vertical centering
    const paletteVisualH = pLayout ? pLayout.totalHeight : 0;
    const gridVisualH = gLayout.gridDims.height * gLayout.scale;
    
    // Anchor to TOP padding
    const paletteVisualTop = PAGE_PADDING_Y;
    const gridVisualTop = PAGE_PADDING_Y;

    return {
      gridLayout: gLayout,
      paletteLayout: pLayout,
      gridVisualTop, // gridVisualTop matches gridY in export
      paletteVisualTop, // paletteVisualTop matches paletteY in export
    };
  }, [data]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    },
    [zoom, setZoom],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0) {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      didPanRef.current = false;
      setLastPointer({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging && lastPointer) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPanRef.current = true;
        setPan(panX + dx, panY + dy);
        setLastPointer({ x: e.clientX, y: e.clientY });
      }
    },
    [isDragging, lastPointer, panX, panY, setPan],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    setLastPointer(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!data || !selectedCode || didPanRef.current || !pageLayout) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();

      // Total scene: two pages side by side
      const totalW = LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP;
      const totalH = LETTER_OUTPUT_HEIGHT;
      const tx = (viewportWidth - totalW * zoom) / 2 + panX;
      const ty = (viewportHeight - totalH * zoom) / 2 + panY;

      const svgX = (e.clientX - rect.left - tx) / zoom;
      const svgY = (e.clientY - rect.top - ty) / zoom;

      // Only respond to clicks on the colored page (left)
      if (
        svgX >= 0 &&
        svgX <= LETTER_OUTPUT_WIDTH &&
        svgY >= 0 &&
        svgY <= LETTER_OUTPUT_HEIGHT
      ) {
        const gLayout = pageLayout.gridLayout;
        const pLayout = pageLayout.paletteLayout;
        const PALETTE_GAP = 30;
        const paletteWidth = pLayout ? pLayout.palColW : 0;
        
        // Grid starts at: Padding + Palette + Gap + OffsetX + OffsetShift
        // Visual X of Palette = Padding - 40
        // Visual X of Grid = (Padding - 40) + Palette + Gap + OffsetX
        const gridStartX = PAGE_PADDING_X - 40 + paletteWidth + (paletteWidth > 0 ? PALETTE_GAP : 0) + gLayout.offsetX;
        
        const originX = gridStartX;
        const originY = pageLayout.gridVisualTop;
        
        const gridX = (svgX - originX) / gLayout.scale;
        const gridY = (svgY - originY) / gLayout.scale;
        
        const hit = hitTestCell(gridX, gridY, data);
        if (hit) fillCell(hit.x, hit.y);
      }
    },
    [
      data,
      selectedCode,
      zoom,
      panX,
      panY,
      viewportWidth,
      viewportHeight,
      fillCell,
      pageLayout, // Depend on computed layout
    ],
  );

  if (!data || data.cells.length === 0 || !pageLayout) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
        Import ảnh để bắt đầu
      </div>
    );
  }

  const totalW = LETTER_OUTPUT_WIDTH * 2 + PAGE_GAP;
  const totalH = LETTER_OUTPUT_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        width={viewportWidth}
        height={viewportHeight}
        className="cursor-crosshair touch-none"
        onClick={handleClick}
        style={{ userSelect: "none" }}
      >
        <g
          transform={`translate(${(viewportWidth - totalW * zoom) / 2 + panX}, ${(viewportHeight - totalH * zoom) / 2 + panY}) scale(${zoom})`}
        >
          {/* Colored page (left) */}
          <g>
            <PageGrid
              data={data}
              filled={filled}
              showNumbers={showNumbers}
              colored={true}
              layout={pageLayout}
            />
          </g>

          {/* Uncolored page (right) */}
          <g transform={`translate(${LETTER_OUTPUT_WIDTH + PAGE_GAP}, 0)`}>
            <PageGrid
              data={data}
              filled={filled}
              showNumbers={showNumbers}
              colored={false}
              layout={pageLayout}
            />
          </g>
        </g>
      </svg>

      {/* Imported image thumbnail – top right */}
      {importedImageDataUrl && (
        <div className="absolute top-3 right-3">
          <img
            src={importedImageDataUrl}
            alt="Imported image"
            className="rounded-lg border border-[var(--border-subtle)] shadow-lg"
            style={{ width: THUMB_WIDTH, height: "auto", opacity: 0.9 }}
          />
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-muted)]">
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>•</span>
        <span>Kéo để pan</span>
      </div>
    </div>
  );
}
