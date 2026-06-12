/**
 * Conversion worker for PATTERN grids (standard, honeycomb, diamond, pentagon,
 * puzzle, islamic, fish-scale, trapezoid).
 *
 * Uses color-based quantization — each cell gets an actual palette color.
 * Do NOT add mark grid logic here; use markWorker.ts for square-mark / hexagon-mark.
 */

import {
  createMosaicBlocks,
  reduceToUsedPalette,
  mergeMinorColors,
  rgbToLab,
  deltaE2000,
  removeBackgroundBlocks,
  type MosaicBlock,
} from "../pixelate";
import { quantizeImage } from "../quantize";
import { FIXED_PALETTE } from "../palette";
import {
  rgbToHex,
  paletteIndexToLabel,
  isWhite,
  enhanceImage,
  type RGB,
} from "../utils";
import type { ConversionWorkerMessage } from "./types";

// ─── Fixed palette matching ───────────────────────────────────────────────────

const FIXED_PALETTE_LAB = FIXED_PALETTE.map((c) => rgbToLab(c));

const findClosestFixedColorIndex = (color: RGB): number => {
  const colorLab = rgbToLab(color);
  let minDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < FIXED_PALETTE_LAB.length; i++) {
    const d = deltaE2000(colorLab, FIXED_PALETTE_LAB[i]);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
};

const codeForPalettePosition = (index: number, gridType: string): string =>
  paletteIndexToLabel(index);

// ─── Agglomerative palette merge ─────────────────────────────────────────────

const agglomerativeMerge = (
  colors: RGB[],
  maxColors: number,
  inputWeights?: ArrayLike<number>,
): RGB[] => {
  const n = colors.length;
  if (n <= maxColors) return colors.map((c) => ({ ...c }));

  const palette = colors.map((c) => ({ ...c }));
  const paletteLab = palette.map((c) => rgbToLab(c));
  const paletteIsWhite = palette.map(
    (c) => c.r >= 245 && c.g >= 245 && c.b >= 245,
  );
  const counts = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    counts[i] = Math.max(1, inputWeights?.[i] ?? 1);
  }

  const size = palette.length;
  const dist = new Float32Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      if (paletteIsWhite[i] !== paletteIsWhite[j]) {
        dist[i * size + j] = 1e9;
      } else {
        dist[i * size + j] = deltaE2000(paletteLab[i], paletteLab[j]);
      }
    }
  }

  const active = new Uint8Array(size);
  active.fill(1);
  let remaining = size;

  while (remaining > maxColors) {
    let bestI = -1;
    let bestJ = -1;
    let minDist = Infinity;

    for (let i = 0; i < size; i++) {
      if (!active[i]) continue;
      for (let j = i + 1; j < size; j++) {
        if (!active[j]) continue;
        const d = dist[i * size + j];
        if (d < minDist) {
          minDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestI < 0) break;

    const wi = counts[bestI];
    const wj = counts[bestJ];
    const wTotal = wi + wj;
    const ci = palette[bestI];
    const cj = palette[bestJ];
    const merged = {
      r: Math.round((ci.r * wi + cj.r * wj) / wTotal),
      g: Math.round((ci.g * wi + cj.g * wj) / wTotal),
      b: Math.round((ci.b * wi + cj.b * wj) / wTotal),
    };

    palette[bestI] = merged;
    paletteLab[bestI] = rgbToLab(merged);
    counts[bestI] = wTotal;
    active[bestJ] = 0;
    remaining--;

    for (let k = 0; k < size; k++) {
      if (!active[k] || k === bestI) continue;
      const lo = Math.min(bestI, k);
      const hi = Math.max(bestI, k);
      if (paletteIsWhite[bestI] !== paletteIsWhite[k]) {
        dist[lo * size + hi] = 1e9;
      } else {
        dist[lo * size + hi] = deltaE2000(paletteLab[bestI], paletteLab[k]);
      }
    }
  }

  const result: RGB[] = [];
  for (let i = 0; i < size; i++) {
    if (active[i]) result.push(palette[i]);
  }
  return result;
};

// ─── Worker message handler ───────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const {
    imageData,
    gridType,
    cellSize,
    useDithering,
    maxColors,
    cols,
    rows,
    removeWhiteBackground,
  } = e.data as ConversionWorkerMessage;

  const rawImageData = imageData as unknown as ImageData;
  const enhancedImageData = enhanceImage(rawImageData, {
    contrastStrength: 0,
    saturation: 1,
    sharpen: true,
  });

  // 1. Extract dynamic palette
  const overSample = Math.max(maxColors * 3, 48);
  const { palette: initialPalette } = quantizeImage(enhancedImageData, overSample);

  // 1a. Force-add pure white
  let hasWhite = false;
  for (let i = 0; i < initialPalette.length; i++) {
    const c = initialPalette[i];
    if (c.r >= 245 && c.g >= 245 && c.b >= 245) {
      initialPalette[i] = { r: 255, g: 255, b: 255 };
      hasWhite = true;
    }
  }
  if (!hasWhite) {
    initialPalette.push({ r: 255, g: 255, b: 255 });
  }

  // 1b. Agglomerative merge to target color count
  const dynamicPalette = agglomerativeMerge(initialPalette, maxColors);

  // 2. Create mosaic blocks
  let rawBlocks = createMosaicBlocks(
    enhancedImageData,
    dynamicPalette,
    cellSize,
    useDithering,
    true,
  );

  // 2b. Filter minor colors
  rawBlocks = mergeMinorColors(rawBlocks, dynamicPalette, 10);

  // 2c. Remove background if requested
  if (removeWhiteBackground) {
    const hasTransparentBlocks = rawBlocks.some((b) => b.isTransparent);
    if (hasTransparentBlocks) {
      rawBlocks = rawBlocks.filter((b) => !b.isTransparent);
    } else {
      rawBlocks = removeBackgroundBlocks(rawBlocks, cols, rows, cellSize);
    }
  }

  // 3. Reduce to used palette
  const { blocks, palette: usedPalette } = reduceToUsedPalette(rawBlocks, dynamicPalette);

  // 4. Map to fixed palette
  const dynamicToFixedIndex = usedPalette.map((c) => findClosestFixedColorIndex(c));

  // 5. Build sequential code mapping (white cells get empty code)
  const indexIsWhite = usedPalette.map((c) => isWhite(c));
  let seq = 0;
  const indexToCode = new Map<number, string>();
  for (let i = 0; i < usedPalette.length; i++) {
    if (indexIsWhite[i]) {
      indexToCode.set(i, "");
    } else {
      indexToCode.set(i, codeForPalettePosition(seq, gridType));
      seq++;
    }
  }

  // 6. Convert to cells
  let minX = cols, minY = rows, maxX = 0, maxY = 0;

  const rawCells = blocks.map((block) => {
    const x = Math.round(block.x / cellSize);
    const y = Math.round(block.y / cellSize);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    return {
      x,
      y,
      code: indexToCode.get(block.paletteIndex) ?? "",
      color: rgbToHex(block.color),
      fixedPaletteIndex: dynamicToFixedIndex[block.paletteIndex],
    };
  });

  // 7. Tight-crop when background was removed
  let finalCells = rawCells;
  let finalCols = cols;
  let finalRows = rows;

  if (removeWhiteBackground && rawCells.length > 0) {
    minX = Math.max(0, Math.min(...rawCells.map((c) => c.x)) - 1);
    minY = Math.max(0, Math.min(...rawCells.map((c) => c.y)) - 1);
    maxX = Math.min(cols - 1, Math.max(...rawCells.map((c) => c.x)) + 1);
    maxY = Math.min(rows - 1, Math.max(...rawCells.map((c) => c.y)) + 1);

    finalCols = maxX - minX + 1;
    finalRows = maxY - minY + 1;
    finalCells = rawCells
      .filter((c) => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY)
      .map((c) => ({ ...c, x: c.x - minX, y: c.y - minY }));
  }

  const result = {
    gridType,
    width: finalCols,
    height: finalRows,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    backgroundCells: undefined,
    cells: finalCells,
  };

  self.postMessage(result);
};
