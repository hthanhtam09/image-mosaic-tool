import {
  createMosaicBlocks,
  reduceToUsedPalette,
  mergeMinorColors,
  rgbToLab,
  deltaE2000,
  removeBackgroundBlocks,
} from "../pixelate";
import { quantizeImage } from "../quantize";
import { FIXED_PALETTE } from "../palette";
import { rgbToHex, paletteIndexToLabel, isWhite, enhanceImage, type RGB } from "../utils";
import type { ConversionWorkerMessage } from "./types";

/**
 * Pre-computed OKLab values for FIXED_PALETTE (computed once at module load).
 * rgbToLab() now uses OKLab math — see lib/pixelate.ts.
 */
const FIXED_PALETTE_LAB = FIXED_PALETTE.map((c) => rgbToLab(c));

/**
 * findClosestFixedColorIndex — uses pre-computed OKLab + Euclidean distance.
 * More accurate than CIEDE2000 for most perceptual color matching tasks.
 */
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

/**
 * agglomerativeMerge — OPTIMIZED:
 * Uses a distance matrix to avoid recomputing all pairwise distances each iteration.
 * Original was O(n³·deltaE2000), now O(n²) amortized for distance lookups.
 *
 * Improvement: uses frequency-weighted centroid instead of naive midpoint.
 * The merged color is pulled toward the dominant color in the cluster.
 */
const agglomerativeMerge = (colors: RGB[], maxColors: number): RGB[] => {
  const n = colors.length;
  if (n <= maxColors) return colors.map((c) => ({ ...c }));

  const palette = colors.map((c) => ({ ...c }));
  const paletteLab = palette.map((c) => rgbToLab(c));
  const paletteIsWhite = palette.map(
    (c) => c.r >= 245 && c.g >= 245 && c.b >= 245,
  );
  // Track count (frequency) of each cluster — starts at 1 each, grows on merge
  const counts = new Int32Array(n).fill(1);

  // Build upper-triangular distance matrix
  const size = palette.length;
  const dist = new Float32Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      if (paletteIsWhite[i] !== paletteIsWhite[j]) {
        dist[i * size + j] = 1e9; // Don't merge white with non-white
      } else {
        dist[i * size + j] = deltaE2000(paletteLab[i], paletteLab[j]);
      }
    }
  }

  // Track which indices are still active
  const active = new Uint8Array(size);
  active.fill(1);

  let remaining = size;

  while (remaining > maxColors) {
    // Find closest pair among active indices
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

    if (bestI < 0) break; // Shouldn't happen

    // Frequency-weighted centroid merge: pull toward the dominant color
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

    // Update distances for bestI vs all other active indices
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

  // Collect active palette entries
  const result: RGB[] = [];
  for (let i = 0; i < size; i++) {
    if (active[i]) result.push(palette[i]);
  }
  return result;
};

self.onmessage = (e: MessageEvent) => {
  const { imageData, gridType, cellSize, useDithering, maxColors, cols, rows, removeWhiteBackground } =
    e.data as ConversionWorkerMessage;

  // 0. ENHANCE IMAGE: auto-contrast + saturation boost + sharpen
  //    Runs directly on the transferred ImageData buffer before quantization.
  const rawImageData = imageData as unknown as ImageData;
  const enhancedImageData = enhanceImage(rawImageData, {
    contrastStrength: 0.6,  // Less aggressive to avoid clipping highlights/shadows
    saturation: 1.35,       // Slightly stronger saturation for better color separation
    sharpen: true,
  });

  // 1. EXTRACT DYNAMIC PALETTE
  const overSample = Math.max(maxColors * 3, 48);
  const { palette: initialPalette } = quantizeImage(
    enhancedImageData,
    overSample,
  );

  // 1a. FORCE-ADD PURE WHITE TO PALETTE
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

  // 1b. AGGLOMERATIVE MERGE
  const dynamicPalette = agglomerativeMerge(initialPalette, maxColors);

  // 2. Create mosaic blocks (use enhanced image for better block averaging)
  let rawBlocks = createMosaicBlocks(
    enhancedImageData,
    dynamicPalette,
    cellSize,
    useDithering,
    true,
  );

  // 2b. FILTER MINOR COLORS
  rawBlocks = mergeMinorColors(rawBlocks, dynamicPalette, 10);
  
  // 2c. REMOVE BACKGROUND IF REQUESTED
  if (removeWhiteBackground) {
    const hasTransparentBlocks = rawBlocks.some((b) => b.isTransparent);
    if (hasTransparentBlocks) {
      // If the image already has true alpha transparency, just remove the empty blocks!
      // This prevents the flood-fill from accidentally eating white objects that touch the edge.
      rawBlocks = rawBlocks.filter((b) => !b.isTransparent);
    } else {
      // Fallback for JPEG or solid-white backgrounds: use the color-based floodfill
      rawBlocks = removeBackgroundBlocks(rawBlocks, cols, rows, cellSize);
    }
  }

  // 3. Reduce to used palette
  const { blocks, palette: usedPalette } = reduceToUsedPalette(
    rawBlocks,
    dynamicPalette,
  );

  // 4. Map to fixed palette
  const dynamicToFixedIndex = usedPalette.map((c) =>
    findClosestFixedColorIndex(c),
  );

  // 5. Build sequential code mapping
  const indexIsWhite = usedPalette.map((c) => isWhite(c));
  let seq = 0;
  const indexToCode = new Map<number, string>();
  for (let i = 0; i < usedPalette.length; i++) {
    if (indexIsWhite[i]) {
      indexToCode.set(i, "");
    } else {
      indexToCode.set(i, paletteIndexToLabel(seq));
      seq++;
    }
  }

  // 6. Convert to cells
  let minX = cols,
    minY = rows,
    maxX = 0,
    maxY = 0;

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

  let finalCells = rawCells;
  let finalCols = cols;
  let finalRows = rows;

  if (removeWhiteBackground && rawCells.length > 0) {
    // Padding logic: keep standard cells padding 1 cell if possible
    minX = Math.max(0, minX - 1);
    minY = Math.max(0, minY - 1);
    maxX = Math.min(cols - 1, maxX + 1);
    maxY = Math.min(rows - 1, maxY + 1);

    finalCols = maxX - minX + 1;
    finalRows = maxY - minY + 1;
    finalCells = rawCells.map((c) => ({
      ...c,
      x: c.x - minX,
      y: c.y - minY,
    }));
  }

  const result = {
    gridType,
    width: finalCols,
    height: finalRows,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    cells: finalCells,
  };

  self.postMessage(result);
};
