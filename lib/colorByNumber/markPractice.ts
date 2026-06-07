export type MarkPracticeGridType = "square-mark" | "hexagon-mark";

export interface MarkPracticeImage {
  code: string;
  fileName: string;
  canvas: HTMLCanvasElement;
}

const SQUARE_MARK_CODES = ["1", "2", "3", "4", "5"];
const HEXAGON_MARK_CODES = [".", "1", "2", "3", "4", "5"];

const getHexagonPoints = (cx: number, cy: number, r: number) =>
  [-90, -30, 30, 90, 150, 210].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  });

const drawRoundedPolygonPath = (
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  radius: number,
) => {
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const previous = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const angleIn = Math.atan2(current.y - previous.y, current.x - previous.x);
    const angleOut = Math.atan2(next.y - current.y, next.x - current.x);
    const start = {
      x: current.x - Math.cos(angleIn) * radius,
      y: current.y - Math.sin(angleIn) * radius,
    };
    const end = {
      x: current.x + Math.cos(angleOut) * radius,
      y: current.y + Math.sin(angleOut) * radius,
    };
    if (i === 0) ctx.moveTo(start.x, start.y);
    else ctx.lineTo(start.x, start.y);
    ctx.quadraticCurveTo(current.x, current.y, end.x, end.y);
  }
  ctx.closePath();
};

const drawDotCodeCellBase = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  const dotR = Math.max(1.1, size * 0.055);
  const smallR = Math.max(0.55, size * 0.025);
  const left = x;
  const right = x + size;
  const top = y;
  const bottom = y + size;

  const drawDot = (cx: number, cy: number, r: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  ctx.fillStyle = "#000000";
  drawDot(left, top, dotR, 1);
  drawDot(right, top, dotR, 1);
  drawDot(left, bottom, dotR, 1);
  drawDot(right, bottom, dotR, 1);

  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    drawDot(left + (right - left) * t, top, smallR, 0.28);
    drawDot(left + (right - left) * t, bottom, smallR, 0.28);
    drawDot(left, top + (bottom - top) * t, smallR, 0.28);
    drawDot(right, top + (bottom - top) * t, smallR, 0.28);
  }
};

const drawDotCodeSymbol = (
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

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (code === "1" || code === "3" || code === "4") line(left, bottom, right, top);
  if (code === "2" || code === "3" || code === "4") line(left, top, right, bottom);
  if (code === "4") {
    line(cx, top, cx, bottom);
    line(left, cy, right, cy);
  }

  ctx.restore();
};

const drawHexagonMarkCellBase = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) => {
  const points = getHexagonPoints(cx, cy, r);
  drawRoundedPolygonPath(ctx, points, r * 0.04);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  const dotR = Math.max(1.1, r * 0.085);
  const smallR = Math.max(0.55, r * 0.04);
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    for (let s = 1; s < 4; s++) {
      const t = s / 4;
      ctx.beginPath();
      ctx.arc(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        smallR,
        0,
        Math.PI * 2,
      );
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

const drawHexagonMarkSymbol = (
  ctx: CanvasRenderingContext2D,
  code: string,
  cx: number,
  cy: number,
  size: number,
  markRadius: number,
) => {
  const points = getHexagonPoints(cx, cy, markRadius);
  const [top, upperRight, lowerRight, bottom, lowerLeft, upperLeft] = points;

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineWidth = Math.max(1.4, size * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (code === ".") {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.4, size * 0.15), 0, Math.PI * 2);
    ctx.fill();
  } else if (code === "1") line(top.x, top.y, bottom.x, bottom.y);
  else if (code === "2") line(lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
  else if (code === "3") line(upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  else if (code === "4") {
    line(lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
    line(upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  } else if (code === "5") {
    line(top.x, top.y, bottom.x, bottom.y);
    line(lowerLeft.x, lowerLeft.y, upperRight.x, upperRight.y);
    line(upperLeft.x, upperLeft.y, lowerRight.x, lowerRight.y);
  }

  ctx.restore();
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? new Blob()), "image/png");
  });

export const generateMarkPracticeImages = (
  gridType: MarkPracticeGridType,
  emptyCellCount = 12,
): MarkPracticeImage[] => {
  const codes = gridType === "hexagon-mark" ? HEXAGON_MARK_CODES : SQUARE_MARK_CODES;
  const cellSize = 120;
  const gap = gridType === "hexagon-mark" ? 0 : 14;
  const marginX = 70;
  const marginY = 42;
  const width =
    gridType === "hexagon-mark"
      ? marginX * 2 + cellSize * (emptyCellCount + 1) + cellSize / 2
      : marginX * 2 + cellSize * (emptyCellCount + 1) + gap * emptyCellCount;
  const height = marginY * 2 + cellSize;

  return codes.map((code) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { code, fileName: `mark-${code === "." ? "dot" : code}.png`, canvas };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    if (gridType === "hexagon-mark") {
      const r = cellSize / Math.sqrt(3);
      const cy = marginY + cellSize / 2;
      for (let i = 0; i <= emptyCellCount; i++) {
        const cx = marginX + r + i * cellSize;
        drawHexagonMarkCellBase(ctx, cx, cy, r);
        if (i === 0) drawHexagonMarkSymbol(ctx, code, cx, cy, cellSize, r);
      }
    } else {
      const y = marginY;
      for (let i = 0; i <= emptyCellCount; i++) {
        const x = marginX + i * (cellSize + gap);
        drawDotCodeCellBase(ctx, x, y, cellSize);
        if (i === 0) drawDotCodeSymbol(ctx, code, x + cellSize / 2, y + cellSize / 2, cellSize);
      }
    }

    return {
      code,
      fileName: `mark-${code === "." ? "dot" : code}.png`,
      canvas,
    };
  });
};

export const markPracticeCanvasToBlob = canvasToBlob;
