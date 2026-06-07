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
    ? [".", "1", "2", "3", "4", "5"]
    : ["1", "2", "3", "4", "5"];

const MARK_DENSITY_GAMMA = 0.82;
const MARK_EDGE_THRESHOLD = 0.12;
const MARK_EDGE_BOOST = 0.18;
// Hexagon mark pages are monochrome, so color is translated into mark density.
// Keep midtones lighter; otherwise soft shadows and warm browns jump into dense
// black symbols too early and the converted image looks blotchy.
const HEXAGON_MARK_DENSITY_GAMMA = 1.15;
const HEXAGON_MARK_EDGE_THRESHOLD = 0.14;
const HEXAGON_MARK_EDGE_BOOST = 0.06;
const MARK_SMOOTH_THRESHOLD = 1.5;

const getMarkToneConfig = (gridType: string) =>
  gridType === "hexagon-mark"
    ? {
        densityGamma: HEXAGON_MARK_DENSITY_GAMMA,
        edgeThreshold: HEXAGON_MARK_EDGE_THRESHOLD,
        edgeBoost: HEXAGON_MARK_EDGE_BOOST,
      }
    : {
        densityGamma: MARK_DENSITY_GAMMA,
        edgeThreshold: MARK_EDGE_THRESHOLD,
        edgeBoost: MARK_EDGE_BOOST,
      };

const markValueOf = (color: RGB): number => rgbToLab(color).L;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp((sorted.length - 1) * p, 0, sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const t = index - lower;
  return sorted[lower] * (1 - t) + sorted[upper] * t;
};

type MarkEntry = {
  ordinal: number;
  x: number;
  y: number;
  value: number;
};

const ensureAllHexagonMarkLevels = (
  entries: MarkEntry[],
  levelByOrdinal: Map<number, number>,
  rawLevelByOrdinal: Map<number, number>,
  levelCount: number,
): void => {
  if (entries.length < levelCount) return;

  const counts = new Array<number>(levelCount).fill(0);
  for (const entry of entries) {
    const level = levelByOrdinal.get(entry.ordinal);
    if (level !== undefined) counts[level]++;
  }

  const claimedOrdinals = new Set<number>();
  for (let missingLevel = 0; missingLevel < levelCount; missingLevel++) {
    if (counts[missingLevel] > 0) continue;

    let bestEntry: MarkEntry | undefined;
    let bestCurrentLevel = -1;
    let bestScore = Infinity;

    for (const entry of entries) {
      if (claimedOrdinals.has(entry.ordinal)) continue;

      const currentLevel = levelByOrdinal.get(entry.ordinal);
      if (currentLevel === undefined || currentLevel === missingLevel) continue;
      if (counts[currentLevel] <= 1) continue;

      const rawLevel = rawLevelByOrdinal.get(entry.ordinal) ?? currentLevel;
      const score =
        Math.abs(rawLevel - missingLevel) +
        Math.abs(currentLevel - missingLevel) * 0.15 -
        Math.min(counts[currentLevel], 1000) * 0.000001;

      if (score < bestScore) {
        bestEntry = entry;
        bestCurrentLevel = currentLevel;
        bestScore = score;
      }
    }

    if (!bestEntry) continue;

    counts[bestCurrentLevel]--;
    counts[missingLevel]++;
    claimedOrdinals.add(bestEntry.ordinal);
    levelByOrdinal.set(bestEntry.ordinal, missingLevel);
  }
};

const getNeighborOffsets = (
  gridType: string,
  y: number,
): Array<[number, number]> =>
  gridType === "hexagon-mark"
    ? [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [y % 2 === 0 ? -1 : 1, -1],
        [y % 2 === 0 ? -1 : 1, 1],
      ]
    : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

const assignMarkCodesByValue = (
  blocks: MosaicBlock[],
  gridType: string,
  cellSize: number,
  backgroundCellKeys?: Set<string>,
): string[] => {
  const markCodes = markCodesForGridType(gridType);
  const codes = new Array<string>(blocks.length).fill("");
  if (blocks.length === 0) return codes;

  const entries: MarkEntry[] = blocks.flatMap((block, ordinal) => {
    const x = Math.round(block.x / cellSize);
    const y = Math.round(block.y / cellSize);
    if (block.isTransparent || backgroundCellKeys?.has(`${x},${y}`)) return [];

    const value = markValueOf(block.avgColor ?? block.color);
    return [{ ordinal, x, y, value }];
  });

  if (entries.length === 0) return codes;

  const toneConfig = getMarkToneConfig(gridType);
  const values = entries.map((entry) => entry.value);
  const low = percentile(values, 0.02);
  const high = percentile(values, 0.98);
  const range = high - low;
  const safeRange = range > 0 ? range : 1;

  const entryByCoord = new Map<string, MarkEntry>();
  for (const entry of entries) {
    entryByCoord.set(`${entry.x},${entry.y}`, entry);
  }

  const levelByOrdinal = new Map<number, number>();
  const rawLevelByOrdinal = new Map<number, number>();
  const normalizedEdgeByOrdinal = new Map<number, number>();

  for (const entry of entries) {
    const neighbors = getNeighborOffsets(gridType, entry.y)
      .map(([dx, dy]) => entryByCoord.get(`${entry.x + dx},${entry.y + dy}`))
      .filter((neighbor): neighbor is MarkEntry => Boolean(neighbor));
    const neighborAverageValue =
      neighbors.length > 0
        ? neighbors.reduce((sum, neighbor) => sum + neighbor.value, 0) /
          neighbors.length
        : entry.value;
    const edgeStrength = Math.abs(entry.value - neighborAverageValue);
    const normalizedEdge = clamp(edgeStrength / safeRange, 0, 1);
    const normalized =
      range > 0 ? clamp((entry.value - low) / safeRange, 0, 1) : 0.5;
    const baseDensity = 1 - normalized;
    const curvedDensity = Math.pow(baseDensity, toneConfig.densityGamma);
    const edgeBoost =
      normalizedEdge > toneConfig.edgeThreshold
        ? normalizedEdge * toneConfig.edgeBoost
        : 0;
    const density = clamp(curvedDensity + edgeBoost, 0, 1);
    const rawLevel = density * (markCodes.length - 1);
    const codeIndex = Math.round(rawLevel);

    normalizedEdgeByOrdinal.set(entry.ordinal, normalizedEdge);
    rawLevelByOrdinal.set(entry.ordinal, rawLevel);
    levelByOrdinal.set(entry.ordinal, clamp(codeIndex, 0, markCodes.length - 1));
  }

  const smoothedLevelByOrdinal = new Map<number, number>();
  for (const entry of entries) {
    const level = levelByOrdinal.get(entry.ordinal);
    if (level === undefined) continue;

    const neighborLevels: number[] = [];
    for (const [dx, dy] of getNeighborOffsets(gridType, entry.y)) {
      const neighbor = entryByCoord.get(`${entry.x + dx},${entry.y + dy}`);
      if (!neighbor) continue;
      const neighborLevel = levelByOrdinal.get(neighbor.ordinal);
      if (neighborLevel !== undefined) neighborLevels.push(neighborLevel);
    }

    let smoothedLevel = level;
    const normalizedEdge = normalizedEdgeByOrdinal.get(entry.ordinal) ?? 0;
    if (normalizedEdge <= toneConfig.edgeThreshold && neighborLevels.length >= 3) {
      const average =
        neighborLevels.reduce((sum, neighborLevel) => sum + neighborLevel, 0) /
        neighborLevels.length;
      const lightNeighbors = neighborLevels.filter(
        (neighborLevel) => neighborLevel <= level - 2,
      ).length;
      const darkNeighbors = neighborLevels.filter(
        (neighborLevel) => neighborLevel >= level + 2,
      ).length;

      if (
        level - average >= MARK_SMOOTH_THRESHOLD &&
        lightNeighbors >= neighborLevels.length - 1
      ) {
        smoothedLevel = level - 1;
      } else if (
        average - level >= MARK_SMOOTH_THRESHOLD &&
        darkNeighbors >= neighborLevels.length - 1
      ) {
        smoothedLevel = level + 1;
      }
    }

    smoothedLevelByOrdinal.set(
      entry.ordinal,
      clamp(smoothedLevel, 0, markCodes.length - 1),
    );
  }

  if (gridType === "hexagon-mark") {
    ensureAllHexagonMarkLevels(
      entries,
      smoothedLevelByOrdinal,
      rawLevelByOrdinal,
      markCodes.length,
    );
  }

  for (const entry of entries) {
    const level = smoothedLevelByOrdinal.get(entry.ordinal);
    if (level === undefined) continue;
    codes[entry.ordinal] = markCodes[level];
  }

  return codes;
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
  if (!isMarkGrid(gridType)) {
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
    markBlockCodes = assignMarkCodesByValue(
      blocks,
      gridType,
      cellSize,
      backgroundCellKeys ? new Set(backgroundCellKeys) : undefined,
    );
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
  let finalBackgroundCellKeys = backgroundCellKeys;

  if (removeWhiteBackground && rawCells.length > 0) {
    const boundCells = isMarkGrid(gridType)
      ? rawCells.filter((c) => Boolean(c.code))
      : rawCells;
    const cellsForBounds = boundCells.length > 0 ? boundCells : rawCells;
    const cropPadding = isMarkGrid(gridType) ? 2 : 1;

    minX = Math.max(0, Math.min(...cellsForBounds.map((c) => c.x)) - cropPadding);
    minY = Math.max(0, Math.min(...cellsForBounds.map((c) => c.y)) - cropPadding);
    maxX = Math.min(cols - 1, Math.max(...cellsForBounds.map((c) => c.x)) + cropPadding);
    maxY = Math.min(rows - 1, Math.max(...cellsForBounds.map((c) => c.y)) + cropPadding);

    finalCols = maxX - minX + 1;
    finalRows = maxY - minY + 1;
    finalCells = rawCells
      .filter((c) => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY)
      .map((c) => ({
        ...c,
        x: c.x - minX,
        y: c.y - minY,
      }));
    finalBackgroundCellKeys = backgroundCellKeys
      ?.map((key) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y };
      })
      .filter(({ x, y }) => x >= minX && x <= maxX && y >= minY && y <= maxY)
      .map(({ x, y }) => `${x - minX},${y - minY}`);
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
    backgroundCells: finalBackgroundCellKeys,
    cells: finalCells,
  };

  self.postMessage(result);
};
