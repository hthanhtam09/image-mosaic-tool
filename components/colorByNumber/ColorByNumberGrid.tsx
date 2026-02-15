"use client";

/**
 * Color by Number – SVG grid renderer (WYSIWYG preview)
 *
 * Shows the same 8.5×11" letter layout as the export:
 *   - White page background, grid centered with padding
 *   - Colored page (left) + Uncolored page (right)
 *   - Imported image thumbnail in top-right corner
 */

import { useCallback, useRef, useState } from "react";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import {
  getCellLayout,
  getGridDimensions,
  hitTestCell,
} from "@/lib/colorByNumber/layoutCalculator";
import { getPageLayout } from "@/lib/colorByNumber/export";
import type { ColorByNumberData, ColorByNumberCell } from "@/lib/colorByNumber";
import {
  LETTER_OUTPUT_WIDTH,
  LETTER_OUTPUT_HEIGHT,
} from "@/lib/utils";

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

/* ── Cell renderers ── */

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
  const fillColor = colored ? getCellFillColor(cell.color, filled) : DEFAULT_FILL;
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
  const fillColor = colored ? getCellFillColor(cell.color, filled) : DEFAULT_FILL;
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
  const fillColor = colored ? getCellFillColor(cell.color, filled) : DEFAULT_FILL;
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
  const layout = getPageLayout(data);
  const CellComponent =
    data.gridType === "honeycomb"
      ? CellCircle
      : data.gridType === "diamond"
        ? CellDiamond
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
      {/* Grid centered on page */}
      <g
        transform={`translate(${layout.offsetX}, ${layout.offsetY}) scale(${layout.scale})`}
      >
        <g transform={`translate(${PAGE_PADDING}, ${PAGE_PADDING})`}>
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
      if (svgX >= 0 && svgX <= LETTER_OUTPUT_WIDTH && svgY >= 0 && svgY <= LETTER_OUTPUT_HEIGHT) {
        const layout = getPageLayout(data);
        const gridX = (svgX - layout.offsetX) / layout.scale - PAGE_PADDING;
        const gridY = (svgY - layout.offsetY) / layout.scale - PAGE_PADDING;
        const hit = hitTestCell(gridX, gridY, data);
        if (hit) fillCell(hit.x, hit.y);
      }
    },
    [data, selectedCode, zoom, panX, panY, viewportWidth, viewportHeight, fillCell],
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
