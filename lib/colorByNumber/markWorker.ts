/**
 * Conversion worker for MARK grids (square-mark, hexagon-mark).
 *
 * Uses tone/luminance-based quantization — each cell is assigned a mark code
 * (1–5 for square-mark, ./1–5 for hexagon-mark) based on perceived brightness.
 * Do NOT add pattern grid logic here; use patternsWorker.ts for all other types.
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

// ─── Mark-specific tone config ────────────────────────────────────────────────

const MARK_DENSITY_GAMMA = 0.82;
const MARK_EDGE_THRESHOLD = 0.12;
const MARK_EDGE_BOOST = 0.18;
// Hexagon mark pages are monochrome — keep midtones lighter so soft shadows
// don't jump into dense black symbols prematurely (looks blotchy otherwise).
const HEXAGON_MARK_DENSITY_GAMMA = 1.15;
const HEXAGON_MARK_EDGE_THRESHOLD = 0.14;
const HEXAGON_MARK_EDGE_BOOST = 0.06;
const MARK_SMOOTH_THRESHOLD = 1.5;

const markCodesForGridType = (gridType: string): string[] =>
  gridType === "hexagon-mark"
    ? [".", "1", "2", "3", "4", "5"]
    : ["1", "2", "3", "4", "5"];

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

// ─── Utility helpers ──────────────────────────────────────────────────────────

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

// Ensures all tone levels (0–N) are represented in hexagon-mark output so every
// symbol variant appears on the page — prevents missing levels from under-representation.
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
        ? neighbors.reduce((sum, n) => sum + n.value, 0) / neighbors.length
        : entry.value;
    const edgeStrength = Math.abs(entry.value - neighborAverageValue);
    const normalizedEdge = clamp(edgeStrength / safeRange, 0, 1);
    const normalized = range > 0 ? clamp((entry.value - low) / safeRange, 0, 1) : 0.5;
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
        neighborLevels.reduce((sum, nl) => sum + nl, 0) / neighborLevels.length;
      const lightNeighbors = neighborLevels.filter((nl) => nl <= level - 2).length;
      const darkNeighbors = neighborLevels.filter((nl) => nl >= level + 2).length;

      if (level - average >= MARK_SMOOTH_THRESHOLD && lightNeighbors >= neighborLevels.length - 1) {
        smoothedLevel = level - 1;
      } else if (average - level >= MARK_SMOOTH_THRESHOLD && darkNeighbors >= neighborLevels.length - 1) {
        smoothedLevel = level + 1;
      }
    }

    smoothedLevelByOrdinal.set(entry.ordinal, clamp(smoothedLevel, 0, markCodes.length - 1));
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

  // Preliminary pass to get palette frequency weights for mark grids
  const paletteWeights = new Float64Array(initialPalette.length);
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

  // 1b. Agglomerative merge with frequency weights
  const dynamicPalette = agglomerativeMerge(initialPalette, maxColors, paletteWeights);

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

  // 2c. Remove background if requested (mark grids preserve cell keys for code assignment)
  let backgroundCellKeys: string[] | undefined;
  if (removeWhiteBackground) {
    const hasTransparentBlocks = rawBlocks.some((b) => b.isTransparent);
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
  }

  // 3. Reduce to used palette
  const { blocks, palette: usedPalette } = reduceToUsedPalette(rawBlocks, dynamicPalette);

  // 4. Map to fixed palette
  const dynamicToFixedIndex = usedPalette.map((c) => findClosestFixedColorIndex(c));

  // 5. Assign mark codes by tone value (not color)
  const markBlockCodes = assignMarkCodesByValue(
    blocks,
    gridType,
    cellSize,
    backgroundCellKeys ? new Set(backgroundCellKeys) : undefined,
  );

  // 6. Convert to cells
  let minX = cols, minY = rows, maxX = 0, maxY = 0;

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
      code: markBlockCodes[blockOrdinal] ?? "",
      color: rgbToHex(block.avgColor ?? block.color),
      fixedPaletteIndex: dynamicToFixedIndex[block.paletteIndex],
    };
  });

  // 7. Tight-crop (skip for hexagon-mark — its hex layout makes crop unreliable)
  let finalCells = rawCells;
  let finalCols = cols;
  let finalRows = rows;
  let finalBackgroundCellKeys = backgroundCellKeys;

  if (removeWhiteBackground && rawCells.length > 0 && gridType !== "hexagon-mark") {
    const codedCells = rawCells.filter((c) => Boolean(c.code));
    const cellsForBounds = codedCells.length > 0 ? codedCells : rawCells;
    const cropPadding = 2;

    minX = Math.max(0, Math.min(...cellsForBounds.map((c) => c.x)) - cropPadding);
    minY = Math.max(0, Math.min(...cellsForBounds.map((c) => c.y)) - cropPadding);
    maxX = Math.min(cols - 1, Math.max(...cellsForBounds.map((c) => c.x)) + cropPadding);
    maxY = Math.min(rows - 1, Math.max(...cellsForBounds.map((c) => c.y)) + cropPadding);

    finalCols = maxX - minX + 1;
    finalRows = maxY - minY + 1;
    finalCells = rawCells
      .filter((c) => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY)
      .map((c) => ({ ...c, x: c.x - minX, y: c.y - minY }));
    finalBackgroundCellKeys = backgroundCellKeys
      ?.map((key) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y };
      })
      .filter(({ x, y }) => x >= minX && x <= maxX && y >= minY && y <= maxY)
      .map(({ x, y }) => `${x - minX},${y - minY}`);
  }

  // 8. Fill the full grid for mark grids (every cell must exist)
  const cellsByCoord = new Map(finalCells.map((c) => [`${c.x},${c.y}`, c]));
  const filledCells = [];
  for (let y = 0; y < finalRows; y++) {
    for (let x = 0; x < finalCols; x++) {
      filledCells.push(
        cellsByCoord.get(`${x},${y}`) ?? {
          x,
          y,
          code: "",
          color: "#ffffff",
          fixedPaletteIndex: findClosestFixedColorIndex({ r: 255, g: 255, b: 255 }),
        },
      );
    }
  }

  const result = {
    gridType,
    width: finalCols,
    height: finalRows,
    cellSize,
    cellGap: 0,
    rotationDeg: 0,
    backgroundCells: finalBackgroundCellKeys,
    cells: filledCells,
  };

  self.postMessage(result);
};
