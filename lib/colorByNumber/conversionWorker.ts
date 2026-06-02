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
import {
  rgbToHex,
  paletteIndexToLabel,
  isWhite,
  enhanceImage,
  type RGB,
} from "../utils";
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

const codeForPalettePosition = (index: number, gridType: string): string =>
  gridType === "square-mark" ? String(index) : paletteIndexToLabel(index);

const isMarkGrid = (gridType: string): boolean =>
  gridType === "square-mark" || gridType === "hexagon-mark";

const markCodesForGridType = (gridType: string): string[] =>
  gridType === "hexagon-mark"
    ? [".", "1", "2", "3", "4", "5", "6"]
    : ["1", "2", "3", "4", "5"];

const brightnessOf = (color: RGB): number =>
  color.r * 0.299 + color.g * 0.587 + color.b * 0.114;

const hueDegreesFromLab = (a: number, b: number): number => {
  const deg = (Math.atan2(b, a) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
};

const circularHueDistance = (a: number, b: number): number => {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
};

const markToneOf = (color: RGB): { score: number; hue: number; chroma: number } => {
  const lab = rgbToLab(color);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = hueDegreesFromLab(lab.a, lab.b);

  // OKLab L is the primary tone. Chroma/hue nudges separate warm, cool, and neutral
  // colors that have similar lightness but should use different marks.
  const warmHueProximity = 1 - circularHueDistance(hue, 75) / 180;
  const coolHueProximity = 1 - circularHueDistance(hue, 265) / 180;
  const neutralPenalty = Math.max(0, 0.035 - chroma) * 0.45;
  const score =
    lab.L +
    chroma * 0.18 +
    chroma * warmHueProximity * 0.1 -
    chroma * coolHueProximity * 0.06 -
    neutralPenalty;

  return { score, hue, chroma };
};

/**
 * agglomerativeMerge — OPTIMIZED:
 * Uses a distance matrix to avoid recomputing all pairwise distances each iteration.
 * Original was O(n³·deltaE2000), now O(n²) amortized for distance lookups.
 *
 * Improvement: uses frequency-weighted centroid instead of naive midpoint.
 * The merged color is pulled toward the dominant color in the cluster.
 */
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
  // Track count (frequency) of each cluster — starts at 1 each, grows on merge
  const counts = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    counts[i] = Math.max(1, inputWeights?.[i] ?? 1);
  }

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

  // 0. ENHANCE IMAGE: auto-contrast + saturation boost + sharpen
  //    Runs directly on the transferred ImageData buffer before quantization.
  const rawImageData = imageData as unknown as ImageData;
  const markGrid = isMarkGrid(gridType);
  const enhancedImageData = enhanceImage(rawImageData, {
    contrastStrength: markGrid ? 0.22 : 0.6,
    saturation: markGrid ? 1.12 : 1.35,
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

  const paletteWeights = new Float64Array(initialPalette.length);
  if (markGrid) {
    const preliminaryBlocks = createMosaicBlocks(
      enhancedImageData,
      initialPalette,
      cellSize,
      false,
      true,
    );
    for (const block of preliminaryBlocks) {
      paletteWeights[block.paletteIndex]++;
    }
  }

  // 1b. AGGLOMERATIVE MERGE
  const dynamicPalette = agglomerativeMerge(
    initialPalette,
    maxColors,
    markGrid ? paletteWeights : undefined,
  );

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

  let backgroundCellKeys: string[] | undefined;

  // 2c. REMOVE BACKGROUND IF REQUESTED
  if (removeWhiteBackground) {
    const hasTransparentBlocks = rawBlocks.some((b) => b.isTransparent);
    if (isMarkGrid(gridType)) {
      const visibleBlocks = hasTransparentBlocks
        ? rawBlocks.filter((b) => !b.isTransparent)
        : removeBackgroundBlocks(rawBlocks, cols, rows, cellSize);
      const visibleKeys = new Set(
        visibleBlocks.map(
          (b) => `${Math.round(b.x / cellSize)},${Math.round(b.y / cellSize)}`,
        ),
      );
      backgroundCellKeys = rawBlocks
        .filter(
          (b) =>
            !visibleKeys.has(
              `${Math.round(b.x / cellSize)},${Math.round(b.y / cellSize)}`,
            ),
        )
        .map(
          (b) => `${Math.round(b.x / cellSize)},${Math.round(b.y / cellSize)}`,
        );
    } else if (hasTransparentBlocks) {
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
  const indexIsWhite = usedPalette.map(
    (c) => !isMarkGrid(gridType) && isWhite(c),
  );
  let seq = 0;
  const indexToCode = new Map<number, string>();
  if (isMarkGrid(gridType)) {
    const markCodes = markCodesForGridType(gridType);
    const paletteCounts = new Int32Array(usedPalette.length);
    for (const block of blocks) {
      paletteCounts[block.paletteIndex]++;
    }
    const brightEntries = usedPalette.map((color, index) => {
      const tone = markToneOf(color);
      return {
        index,
        score: tone.score,
        hue: tone.hue,
        chroma: tone.chroma,
        count: paletteCounts[index],
        brightness: brightnessOf(color),
        isLight: color.r >= 245 && color.g >= 245 && color.b >= 245,
      };
    });
    for (const entry of brightEntries) {
      if (entry.isLight) indexToCode.set(entry.index, "");
    }
    const ranked = brightEntries
      .filter((entry) => !entry.isLight)
      .sort((a, b) => {
        const toneDiff = b.score - a.score;
        if (Math.abs(toneDiff) > 0.018) return toneDiff;
        const chromaDiff = b.chroma - a.chroma;
        if (Math.abs(chromaDiff) > 0.015) return chromaDiff;
        const hueDiff = a.hue - b.hue;
        if (Math.abs(hueDiff) > 8) return hueDiff;
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        return b.brightness - a.brightness;
      });
    const maxRank = Math.max(1, ranked.length - 1);
    ranked.forEach((entry, rank) => {
      const codeIndex =
        ranked.length === 1
          ? markCodes.length - 1
          : Math.round((rank / maxRank) * (markCodes.length - 1));
      indexToCode.set(entry.index, markCodes[Math.max(0, Math.min(markCodes.length - 1, codeIndex))]);
    });
  } else {
    for (let i = 0; i < usedPalette.length; i++) {
      if (indexIsWhite[i]) {
        indexToCode.set(i, "");
      } else {
        indexToCode.set(i, codeForPalettePosition(seq, gridType));
        seq++;
      }
    }
  }

  let markBlockCodes: string[] | undefined;
  if (isMarkGrid(gridType)) {
    const markCodes = markCodesForGridType(gridType);
    const entries = blocks.map((block, ordinal) => {
      const color = block.avgColor ?? block.color;
      const tone = markToneOf(color);
      return {
        ordinal,
        score: tone.score,
        hue: tone.hue,
        chroma: tone.chroma,
        brightness: brightnessOf(color),
        isLight: color.r >= 245 && color.g >= 245 && color.b >= 245,
      };
    });

    markBlockCodes = new Array(blocks.length).fill("");
    const rankedBlocks = entries
      .filter((entry) => !entry.isLight)
      .sort((a, b) => {
        const toneDiff = b.score - a.score;
        if (Math.abs(toneDiff) > 0.012) return toneDiff;
        const chromaDiff = b.chroma - a.chroma;
        if (Math.abs(chromaDiff) > 0.01) return chromaDiff;
        const hueDiff = a.hue - b.hue;
        if (Math.abs(hueDiff) > 6) return hueDiff;
        return b.brightness - a.brightness;
      });
    const maxRank = Math.max(1, rankedBlocks.length - 1);
    rankedBlocks.forEach((entry, rank) => {
      const codeIndex =
        rankedBlocks.length === 1
          ? markCodes.length - 1
          : Math.round((rank / maxRank) * (markCodes.length - 1));
      markBlockCodes![entry.ordinal] =
        markCodes[Math.max(0, Math.min(markCodes.length - 1, codeIndex))];
    });
  }

  // 6. Convert to cells
  let minX = cols,
    minY = rows,
    maxX = 0,
    maxY = 0;

  const rawCells = blocks.map((block, blockOrdinal) => {
    const x = Math.round(block.x / cellSize);
    const y = Math.round(block.y / cellSize);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    return {
      x,
      y,
      code: markBlockCodes?.[blockOrdinal] ?? indexToCode.get(block.paletteIndex) ?? "",
      color: rgbToHex(isMarkGrid(gridType) ? block.avgColor ?? block.color : block.color),
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

  if (isMarkGrid(gridType)) {
    const cellsByCoord = new Map(finalCells.map((c) => [`${c.x},${c.y}`, c]));
    const fallbackColor = "#ffffff";
    const filledCells = [];
    for (let y = 0; y < finalRows; y++) {
      for (let x = 0; x < finalCols; x++) {
        filledCells.push(
          cellsByCoord.get(`${x},${y}`) ?? {
            x,
            y,
            code: "",
            color: fallbackColor,
            fixedPaletteIndex: findClosestFixedColorIndex({
              r: 255,
              g: 255,
              b: 255,
            }),
          },
        );
      }
    }
    finalCells = filledCells;
  }

  const result = {
    gridType,
    width: finalCols,
    height: finalRows,
    cellSize,
    cellGap: gridType === "honeycomb" ? 2 : 0,
    rotationDeg: gridType === "diamond" ? 45 : 0,
    backgroundCells: backgroundCellKeys,
    cells: finalCells,
  };

  self.postMessage(result);
};
