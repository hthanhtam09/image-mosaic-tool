/**
 * PageRenderer – outer gray background (preview only)
 */

import { PAGE_BG_GRAY } from "./constants";

export const renderPageBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  ctx.fillStyle = PAGE_BG_GRAY;
  ctx.fillRect(0, 0, width, height);
};
