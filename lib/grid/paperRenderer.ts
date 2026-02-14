/**
 * PaperRenderer – white paper, thin black border, optional shadow/rotation (preview only)
 */

import { PAPER_FILL, STROKE_COLOR, STROKE_PAPER_PX } from "./constants";

export const renderPaper = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    withBorder: boolean;
    withShadow: boolean;
    rotationDeg: number;
  }
): void => {
  ctx.save();
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (options.rotationDeg !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((options.rotationDeg * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (options.withShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  }

  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x, y, width, height);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (options.withBorder) {
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_PAPER_PX;
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
};
