export interface BeforeAfterTheme {
  backgroundColor: string;
  borderColor: string;
  arrowColor: string;
  textColor: string;
  labelBackgroundColor: string;
  transparentBackground: boolean;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const drawLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  width: number,
  theme: BeforeAfterTheme,
) => {
  const h = 44;
  roundedRect(ctx, cx - width / 2, y, width, h, 10);
  ctx.fillStyle = theme.labelBackgroundColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = theme.borderColor;
  ctx.stroke();
  ctx.fillStyle = theme.textColor;
  ctx.font = "900 21px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, y + h / 2 + 1);
};

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 24);
  ctx.lineTo(cx + 4, cy - 24);
  ctx.lineTo(cx + 4, cy - 44);
  ctx.lineTo(cx + 50, cy);
  ctx.lineTo(cx + 4, cy + 44);
  ctx.lineTo(cx + 4, cy + 24);
  ctx.lineTo(cx - 38, cy + 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const exportBeforeAfterToCanvas = async (
  beforeUrl: string,
  afterUrl: string,
  theme: BeforeAfterTheme,
): Promise<HTMLCanvasElement> => {
  const [beforeImg, afterImg] = await Promise.all([loadImage(beforeUrl), loadImage(afterUrl)]);
  const scaleFactor = 3;
  const designW = 1600;
  const designH = 1040;
  const canvas = document.createElement("canvas");
  canvas.width = designW * scaleFactor;
  canvas.height = designH * scaleFactor;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(scaleFactor, scaleFactor);

  if (theme.transparentBackground) {
    ctx.clearRect(0, 0, designW, designH);
  } else {
    ctx.fillStyle = theme.backgroundColor;
    ctx.fillRect(0, 0, designW, designH);
  }

  const panelW = 620;
  const panelH = 840;
  const panelY = 130;
  const leftX = 72;
  const rightX = designW - leftX - panelW;
  const radius = 24;

  const drawPanel = (img: HTMLImageElement, x: number, label: string) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 10;
    roundedRect(ctx, x, panelY, panelW, panelH, radius);
    ctx.fillStyle = theme.transparentBackground ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.18)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = theme.borderColor;
    ctx.stroke();
    ctx.clip();
    drawCoverImage(ctx, img, x + 28, panelY + 36, panelW - 56, panelH - 68);
    ctx.restore();
    drawLabel(ctx, label, x + panelW / 2, panelY - 27, 360, theme);
  };

  drawPanel(beforeImg, leftX, "BEFORE YOU COLOR");
  drawPanel(afterImg, rightX, "AFTER YOU COLOR");
  drawArrow(ctx, designW / 2, panelY + panelH / 2, theme.arrowColor);

  return canvas;
};
