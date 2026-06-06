import type { ColorByNumberCell, ColorByNumberData } from "./types";

export const isDotCodeObjectFocus = (
  data: Pick<ColorByNumberData, "gridType"> | null | undefined,
  removeBackground?: boolean,
): boolean =>
  Boolean(
    removeBackground &&
    (data?.gridType === "square-mark" || data?.gridType === "hexagon-mark"),
  );

export const shouldShowCodes = (
  data: Pick<ColorByNumberData, "gridType"> | null | undefined,
  removeBackground: boolean | undefined,
  fallback: boolean,
): boolean =>
  isDotCodeObjectFocus(data, removeBackground)
    ? true
    : removeBackground
      ? false
      : fallback;

export const shouldUseTightCrop = (
  data: Pick<ColorByNumberData, "gridType"> | null | undefined,
  removeBackground?: boolean,
): boolean =>
  Boolean(
    removeBackground &&
    data?.gridType !== "square-mark" &&
    data?.gridType !== "hexagon-mark",
  );

export const getBackgroundCellSet = (
  data: Pick<ColorByNumberData, "backgroundCells">,
): Set<string> => new Set(data.backgroundCells ?? []);

export const isTransparentCell = (
  data: Pick<ColorByNumberData, "gridType" | "backgroundCells">,
  cell: Pick<ColorByNumberCell, "x" | "y" | "code">,
  transparentBg?: boolean,
): boolean => {
  if (!transparentBg) return false;
  if (data.gridType === "square-mark" || data.gridType === "hexagon-mark") {
    return getBackgroundCellSet(data).has(`${cell.x},${cell.y}`);
  }
  return !cell.code;
};

export const shouldRenderDotCodeBaseCell = (
  data: Pick<ColorByNumberData, "gridType" | "backgroundCells">,
  x: number,
  y: number,
  transparentBg?: boolean,
): boolean =>
  data.gridType === "hexagon-mark" ||
  !transparentBg ||
  !getBackgroundCellSet(data).has(`${x},${y}`);

export const getDotCodeMagnifierLayout = ({
  pageW,
  pageH,
  gridX,
  gridY,
  gridW,
  gridH,
  cellSize,
  scale,
}: {
  pageW: number;
  pageH: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  cellSize: number;
  scale: number;
}): { cx: number; cy: number; r: number } => {
  const r = Math.max(240, Math.min(340, cellSize * scale * 10.5));
  const cx = Math.max(r + 50, Math.min(pageW - r - 35, gridX - r * 0.25));
  const cy = Math.max(r + 35, Math.min(pageH - r - 50, gridY + gridH * 0.72));
  return { cx, cy, r };
};
