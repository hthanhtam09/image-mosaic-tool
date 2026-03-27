import type { Region } from "./detectRegions";

export interface DrawPBNOptions {
  width: number;
  height: number;
  palette: [number, number, number][];
  pixelColorIndex: Uint8Array;
  regionMap: Int32Array;
  regions: Region[];
  outlineThickness: number;
  fontSize: number;
  showColorPreview: boolean; // true = colored regions, false = white (print mode)
}

/**
 * Draw the Paint-by-Numbers output onto a canvas.
 * - In preview mode: fills regions with their colors + outlines + numbers
 * - In print mode: white background + outlines + numbers
 */
export function drawPBN(canvas: HTMLCanvasElement, options: DrawPBNOptions): void {
  const {
    width,
    height,
    palette,
    pixelColorIndex,
    regionMap,
    regions,
    outlineThickness,
    fontSize,
    showColorPreview,
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;

  // Step 1: Fill background
  if (showColorPreview) {
    // Draw quantized colors
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
      const colorIdx = pixelColorIndex[i];
      const color = palette[colorIdx];
      imageData.data[i * 4] = color[0];
      imageData.data[i * 4 + 1] = color[1];
      imageData.data[i * 4 + 2] = color[2];
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  } else {
    // White background for print mode
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  // Step 2: Draw outlines where adjacent pixels have different region IDs
  const outlineImageData = ctx.getImageData(0, 0, width, height);
  const data = outlineImageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const currentRegion = regionMap[idx];
      
      let isEdge = false;

      // Check neighbors within outline thickness
      const thicknessSq = outlineThickness * outlineThickness;
      for (let dy = -outlineThickness; dy <= outlineThickness && !isEdge; dy++) {
        for (let dx = -outlineThickness; dx <= outlineThickness && !isEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (dx * dx + dy * dy > thicknessSq) continue; // Make corners rounder

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            isEdge = true; // edge of image
          } else {
            const neighborIdx = ny * width + nx;
            if (regionMap[neighborIdx] !== currentRegion) {
              isEdge = true;
            }
          }
        }
      }

      if (isEdge) {
        const pixelIdx = idx * 4;
        data[pixelIdx] = 0;     // R
        data[pixelIdx + 1] = 0; // G
        data[pixelIdx + 2] = 0; // B
        data[pixelIdx + 3] = 255;
      }
    }
  }

  ctx.putImageData(outlineImageData, 0, 0);

  // Step 3: Draw number labels at centroids
  // Build a mapping from colorIndex to label number (1-based)
  const colorIndexToLabel = new Map<number, number>();
  let label = 1;
  for (let i = 0; i < palette.length; i++) {
    colorIndexToLabel.set(i, label++);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const region of regions) {
    const labelNum = colorIndexToLabel.get(region.colorIndex);
    if (labelNum === undefined) continue;

    const text = String(labelNum);
    
    ctx.font = `bold ${fontSize}px 'Inter', Arial, sans-serif`;

    // Draw white stroke / glow around number for readability
    if (showColorPreview) {
      // Light shadow if previewing
      ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
      ctx.shadowBlur = 4;
    } else {
      // Hard white stroke if print mode to protect from crossing lines
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeText(text, region.centroidX, region.centroidY);
      ctx.shadowBlur = 0;
    }

    // Draw number
    ctx.fillStyle = "#000000";
    ctx.fillText(text, region.centroidX, region.centroidY);
  }
}

/**
 * Generate a color legend as an array of { label, hex } entries.
 */
export function generateColorLegend(
  palette: [number, number, number][]
): { label: number; hex: string; rgb: [number, number, number] }[] {
  return palette.map((color, i) => ({
    label: i + 1,
    hex: `#${color.map((c) => c.toString(16).padStart(2, "0")).join("")}`,
    rgb: color,
  }));
}
