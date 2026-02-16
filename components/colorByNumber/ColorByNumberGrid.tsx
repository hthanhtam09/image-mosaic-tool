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
} from "@/lib/colorByNumber/export";
import type { ColorByNumberData, ColorByNumberCell } from "@/lib/colorByNumber";
import { LETTER_OUTPUT_WIDTH, LETTER_OUTPUT_HEIGHT } from "@/lib/utils";

const STROKE_COLOR = "#000000";
const DEFAULT_FILL = "#ffffff";
const TEXT_COLOR_ON_LIGHT = "#333333";
const TEXT_COLOR_ON_DARK = "#ffffff";
const PAGE_PADDING = 20;
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
                {/* Rounded rect approximation */}
                <rect
                  x={cx - sSW / 2}
                  y={swCY - sSW / 2}
                  width={sSW}
                  height={sSW}
                  rx={sSW * 0.12}
                  fill={color}
                  stroke="#333"
                  strokeWidth={2}
                />
              </g>
            )}
            {shape === "diamond" && (
              <polygon
                points={`${cx},${swCY - sSW / 2} ${cx + sSW / 2},${swCY} ${cx},${
                  swCY + sSW / 2
                } ${cx - sSW / 2},${swCY}`}
                fill={color}
                stroke="#333"
                strokeWidth={2}
              />
            )}
            {shape === "pentagon" && (
              <polygon
                points={[-90, -30, 30, 90, 150, 210]
                  .map((deg) => {
                    const angle = (deg * Math.PI) / 180;
                    const r = sSW / 2;
                    return `${cx + r * Math.cos(angle)},${swCY + r * Math.sin(angle)}`;
                  })
                  .join(" ")}
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
                      rx={rSquare * 0.12}
                      fill="none"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                }
                if (shape === "diamond") {
                  return (
                    <polygon
                      key={i}
                      points={`${shapeX},${shapeY - r} ${shapeX + r},${shapeY} ${shapeX},${shapeY + r} ${shapeX - r},${shapeY}`}
                      fill="none"
                      stroke="#555"
                      strokeWidth={1.5}
                    />
                  );
                }
                // Pentagon (Visual: Hexagon)
                return (
                  <polygon
                    key={i}
                    points={[-90, -30, 30, 90, 150, 210]
                      .map((deg) => {
                        const angle = (deg * Math.PI) / 180;
                        return `${shapeX + r * Math.cos(angle)},${shapeY + r * Math.sin(angle)}`;
                      })
                      .join(" ")}
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
  const points = angles
    .map((angle) => {
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      return `${px},${py}`;
    })
    .join(" ");

  return (
    <g>
      <polygon
        points={points}
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

  return (
    <g>
      <rect
        x={cell.x * s}
        y={cell.y * s}
        width={s}
        height={s}
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

  const points = [
    [layout.cx, layout.cy - half],
    [layout.cx + half, layout.cy],
    [layout.cx, layout.cy + half],
    [layout.cx - half, layout.cy],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  return (
    <g>
      <polygon
        points={points}
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
const PageGrid = ({
  data,
  filled,
  showNumbers,
  colored,
}: {
  data: ColorByNumberData;
  filled: Record<string, boolean>;
  showNumbers: boolean;
  colored: boolean;
}) => {
  // Determine layout based on coloring mode
  const {
    gridLayout,
    paletteLayout,
    paletteWidth,
    paletteVisualTop,
    gridVisualTop,
  } = useMemo(() => {
      // Palette width available is full page width - padding
      const paletteAvailableW = LETTER_OUTPUT_WIDTH - PAGE_PADDING * 2;
      let pLayout: PaletteLayout | null = null;
      
      const needsPalette = true; 
      
      if (needsPalette) {
          pLayout = calculatePaletteLayout(data, paletteAvailableW);
      }
      
      const paletteHeight = pLayout ? pLayout.totalHeight : 0;
      
      // Grid available height
      // 10px @ 300 DPI approx 30 units
      const PALETTE_GAP = 30; 
      const maxGridH = LETTER_OUTPUT_HEIGHT - paletteHeight - PALETTE_GAP - PAGE_PADDING * 2;
      const maxGridW = LETTER_OUTPUT_WIDTH - PAGE_PADDING * 2;

      // Calculate grid layout first
      const gLayout = getPageLayout(data, maxGridW, maxGridH);

      // Grid visual height
      const gridVisualH = gLayout.gridDims.height * gLayout.scale;
      const totalContentH = gridVisualH + PALETTE_GAP + paletteHeight;

      // Center vertically: Group (Grid + Gap + Palette)
      const startY = (LETTER_OUTPUT_HEIGHT - totalContentH) / 2;
      
      const gridVisualTop = startY;
      const paletteVisualTop = startY + gridVisualH + PALETTE_GAP;

      return {
        gridLayout: gLayout,
        paletteLayout: pLayout,
        paletteWidth: 0, 
        gridVisualTop, 
        paletteVisualTop,
      };
    }, [data, colored]);

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
        <g transform={`translate(${PAGE_PADDING + gridLayout.offsetX - 60}, ${paletteVisualTop})`}>
          <PaletteColumnSVG data={data} layout={paletteLayout} />
        </g>
      )}

      {/* Grid centered in its available area */}
      <g
        transform={`translate(${PAGE_PADDING + gridLayout.offsetX}, ${gridVisualTop}) scale(${gridLayout.scale})`}
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
      if (!data || !selectedCode || didPanRef.current) return;
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
      // Note: The click handling logic assumes full page grid for colored page.
      // Since colored page layout hasn't changed (no palette), this logic remains correct.
      if (
        svgX >= 0 &&
        svgX <= LETTER_OUTPUT_WIDTH &&
        svgY >= 0 &&
        svgY <= LETTER_OUTPUT_HEIGHT
      ) {
        const layout = getPageLayout(
          data,
          LETTER_OUTPUT_WIDTH,
          LETTER_OUTPUT_HEIGHT,
        );
        const gridX = (svgX - layout.offsetX) / layout.scale - PAGE_PADDING;
        const gridY = (svgY - layout.offsetY) / layout.scale - PAGE_PADDING;
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
    ],
  );

  if (!data || data.cells.length === 0) {
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
            />
          </g>

          {/* Uncolored page (right) */}
          <g transform={`translate(${LETTER_OUTPUT_WIDTH + PAGE_GAP}, 0)`}>
            <PageGrid
              data={data}
              filled={filled}
              showNumbers={showNumbers}
              colored={false}
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
