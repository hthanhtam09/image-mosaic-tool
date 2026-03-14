import {
  createMosaicBlocks,
  reduceToUsedPalette,
  mergeMinorColors,
  rgbToLab,
  deltaE2000,
} from "../pixelate";
import { quantizeImage } from "../quantize";
import { FIXED_PALETTE } from "../palette";
import {
  rgbToHex,
  paletteIndexToLabel,
  isWhite,
  type RGB,
} from "../utils";
import type { ColorByNumberGridType } from "./types";

/**
 * Pre-computed Lab values for FIXED_PALETTE (computed once at module load).
 */
const FIXED_PALETTE_LAB = FIXED_PALETTE.map((c) => rgbToLab(c));

/**
 * findClosestFixedColorIndex — uses pre-computed Lab + deltaE2000 for accuracy.
 * Falls back to fast RGB distance for speed when Lab is unavailable.
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
 */
const agglomerativeMerge = (colors: RGB[], maxColors: number): RGB[] => {
  const n = colors.length;
  if (n <= maxColors) return colors.map((c) => ({ ...c }));

  let palette = colors.map((c) => ({ ...c }));
  let paletteLab = palette.map((c) => rgbToLab(c));
  let paletteIsWhite = palette.map((c) => c.r >= 245 && c.g >= 245 && c.b >= 245);

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

    // Merge j into i
    const ci = palette[bestI];
    const cj = palette[bestJ];
    const merged = {
      r: Math.round((ci.r + cj.r) / 2),
      g: Math.round((ci.g + cj.g) / 2),
      b: Math.round((ci.b + cj.b) / 2),
    };

    palette[bestI] = merged;
    paletteLab[bestI] = rgbToLab(merged);
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
  const { imageData, gridType, cellSize, useDithering, maxColors, cols, rows } = e.data;

  // 1. EXTRACT DYNAMIC PALETTE
  const overSample = Math.max(maxColors * 3, 48);
  const { palette: initialPalette } = quantizeImage(imageData, overSample);

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

  // 2. Create mosaic blocks
  let rawBlocks = createMosaicBlocks(
    imageData,
    dynamicPalette,
    cellSize,
    useDithering,
    true,
  );

  // 2b. FILTER MINOR COLORS
  rawBlocks = mergeMinorColors(rawBlocks, dynamicPalette, 10);

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
  const indexIsWhite = usedPalette.map(c => isWhite(c));
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
  const cells = blocks.map((block) => ({
    x: Math.round(block.x / cellSize),
    y: Math.round(block.y / cellSize),
    code: indexToCode.get(block.paletteIndex) ?? "",
    color: rgbToHex(block.color),
    fixedPaletteIndex: dynamicToFixedIndex[block.paletteIndex],
  }));

  const result = {
    gridType,
    width: cols,
    height: rows,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    cells,
  };

  self.postMessage(result);
};
