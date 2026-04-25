/**
 * Editor State Management Store
 *
 * Uses Zustand for lightweight, performant state management.
 * Centralized store for all image editor state and actions.
 *
 * PIPELINE (improved):
 *   File → resize → enhance → quantize (dynamic N colors) → agglomerate → mosaic blocks
 *   → map each dynamic color → closest FIXED_PALETTE color (for naming/labels)
 *
 * Previously the pipeline skipped quantization and mapped pixels directly
 * to 24 fixed colors — causing severe color recognition errors.
 */

import { create } from "zustand";
import { RGB, resizeImage, enhanceImage } from "@/lib/utils";
import {
  createMosaicBlocks,
  reduceToUsedPalette,
  removeBackgroundBlocks,
  MosaicBlock,
  rgbToLab,
  deltaE2000,
} from "@/lib/pixelate";
import { quantizeImage } from "@/lib/quantize";
import { FIXED_PALETTE } from "@/lib/palette";
import type { GridType } from "@/lib/grid";

export interface EditorState {
  // Image state
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  mosaicBlocks: MosaicBlock[];

  // Palette state (only colors that appear in the image)
  palette: RGB[];
  /** For each palette[i], fixedPaletteIndices[i] is the index in the full fixed palette (for names). */
  fixedPaletteIndices: number[];

  // User controls
  blockSize: number;
  showGrid: boolean;
  showNumbers: boolean;

  // Grid template
  gridType: GridType;
  gridRows: number;
  gridCols: number;

  removeBackground: boolean;

  // UI state
  isProcessing: boolean;

  // Actions
  setImage: (file: File) => Promise<void>;
  setBlockSize: (size: number) => void;
  toggleGrid: () => void;
  toggleNumbers: () => void;
  setGridType: (type: GridType) => void;
  setGridRows: (rows: number) => void;
  setGridCols: (cols: number) => void;
  setRemoveBackground: (val: boolean) => void;
  reset: () => void;
  reprocessImage: () => void;
}

const DEFAULT_STATE = {
  originalImage: null,
  processedImageData: null,
  mosaicBlocks: [],
  palette: [],
  fixedPaletteIndices: [] as number[],
  blockSize: 20,
  showGrid: true,
  showNumbers: false,
  gridType: "square" as GridType,
  gridRows: 10,
  gridCols: 10,
  removeBackground: true,
  isProcessing: false,
};

/** Max dynamic colors extracted from image before mapping to fixed palette. */
const MAX_DYNAMIC_COLORS = 24;

/**
 * Pre-computed OKLab for FIXED_PALETTE. Computed once at module level.
 * Used to map each dynamic color → closest fixed palette entry.
 */
const FIXED_PALETTE_LAB = FIXED_PALETTE.map((c) => rgbToLab(c));

/**
 * Find the FIXED_PALETTE index whose color is perceptually closest (OKLab Euclidean).
 */
const findClosestFixedIndex = (color: RGB): number => {
  const lab = rgbToLab(color);
  let minDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < FIXED_PALETTE_LAB.length; i++) {
    const d = deltaE2000(lab, FIXED_PALETTE_LAB[i]);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
};

/**
 * Build a dynamic palette from image data using quantization,
 * then run mosaic block generation against that palette.
 * Finally, map each dynamic palette color to the closest fixed palette entry.
 */
const buildMosaicFromImageData = (
  imageData: ImageData,
  blockSize: number,
  removeBackground: boolean,
): { palette: RGB[]; fixedIndices: number[]; blocks: MosaicBlock[] } => {
  // 1. Dynamic quantization: extract the real colors in this image
  const overSample = Math.max(MAX_DYNAMIC_COLORS * 3, 48);
  const { palette: rawPalette } = quantizeImage(imageData, overSample);

  // 2. Force-add white (near-white → pure white)
  let hasWhite = false;
  for (let i = 0; i < rawPalette.length; i++) {
    const c = rawPalette[i];
    if (c.r >= 245 && c.g >= 245 && c.b >= 245) {
      rawPalette[i] = { r: 255, g: 255, b: 255 };
      hasWhite = true;
    }
  }
  if (!hasWhite) rawPalette.push({ r: 255, g: 255, b: 255 });

  // 3. Agglomerative merge down to MAX_DYNAMIC_COLORS
  const dynamicPalette = agglomerativeMerge(rawPalette, MAX_DYNAMIC_COLORS);

  // 4. Create mosaic blocks using the dynamic palette
  let rawBlocks = createMosaicBlocks(imageData, dynamicPalette, blockSize, true, true);

  // 5. Remove background if requested
  if (removeBackground) {
    const hasTransparent = rawBlocks.some((b) => b.isTransparent);
    if (hasTransparent) {
      rawBlocks = rawBlocks.filter((b) => !b.isTransparent);
    } else {
      const cols = Math.ceil(imageData.width / blockSize);
      const rows = Math.ceil(imageData.height / blockSize);
      rawBlocks = removeBackgroundBlocks(rawBlocks, cols, rows, blockSize);
    }
  }

  // 6. Reduce to only used colors
  const { palette, blocks } = reduceToUsedPalette(rawBlocks, dynamicPalette);

  // 7. Map each dynamic palette color to closest FIXED_PALETTE entry (for names)
  const fixedIndices = palette.map((c) => findClosestFixedIndex(c));

  return { palette, fixedIndices, blocks };
};

/**
 * Agglomerative merge: reduce palette to maxColors using OKLab Euclidean distance.
 * Uses frequency-weighted centroid to preserve dominant colors.
 */
const agglomerativeMerge = (colors: RGB[], maxColors: number): RGB[] => {
  if (colors.length <= maxColors) return colors.map((c) => ({ ...c }));

  const palette = colors.map((c) => ({ ...c }));
  const paletteLab = palette.map((c) => rgbToLab(c));
  const isWhiteCluster = palette.map((c) => c.r >= 245 && c.g >= 245 && c.b >= 245);
  const counts = new Int32Array(palette.length).fill(1);

  const size = palette.length;
  const dist = new Float32Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = i + 1; j < size; j++) {
      dist[i * size + j] = isWhiteCluster[i] !== isWhiteCluster[j]
        ? 1e9
        : deltaE2000(paletteLab[i], paletteLab[j]);
    }
  }

  const active = new Uint8Array(size).fill(1);
  let remaining = size;

  while (remaining > maxColors) {
    let bestI = -1, bestJ = -1, minDist = Infinity;
    for (let i = 0; i < size; i++) {
      if (!active[i]) continue;
      for (let j = i + 1; j < size; j++) {
        if (!active[j]) continue;
        const d = dist[i * size + j];
        if (d < minDist) { minDist = d; bestI = i; bestJ = j; }
      }
    }
    if (bestI < 0) break;

    const wi = counts[bestI], wj = counts[bestJ], wt = wi + wj;
    const ci = palette[bestI], cj = palette[bestJ];
    palette[bestI] = {
      r: Math.round((ci.r * wi + cj.r * wj) / wt),
      g: Math.round((ci.g * wi + cj.g * wj) / wt),
      b: Math.round((ci.b * wi + cj.b * wj) / wt),
    };
    paletteLab[bestI] = rgbToLab(palette[bestI]);
    counts[bestI] = wt;
    active[bestJ] = 0;
    remaining--;

    for (let k = 0; k < size; k++) {
      if (!active[k] || k === bestI) continue;
      const lo = Math.min(bestI, k), hi = Math.max(bestI, k);
      dist[lo * size + hi] = isWhiteCluster[bestI] !== isWhiteCluster[k]
        ? 1e9
        : deltaE2000(paletteLab[bestI], paletteLab[k]);
    }
  }

  const result: RGB[] = [];
  for (let i = 0; i < size; i++) {
    if (active[i]) result.push(palette[i]);
  }
  return result;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...DEFAULT_STATE,

  setImage: async (file: File) => {
    set({ isProcessing: true });
    try {
      const img = await loadImageFromFile(file);
      const resized = resizeImage(img, 800, false);
      const processedImageData = enhanceImage(resized, {
        contrastStrength: 0.8,
        saturation: 1.25,
        sharpen: true,
      });
      const { blockSize, removeBackground } = get();
      const { palette, fixedIndices, blocks } = buildMosaicFromImageData(
        processedImageData,
        blockSize,
        removeBackground,
      );
      set({
        originalImage: img,
        processedImageData,
        palette,
        fixedPaletteIndices: fixedIndices,
        mosaicBlocks: blocks,
        isProcessing: false,
      });
    } catch (error) {
      console.error("Error processing image:", error);
      set({ isProcessing: false });
    }
  },

  setBlockSize: (size: number) => {
    set({ blockSize: size });
    const { processedImageData, removeBackground } = get();
    if (!processedImageData) return;
    const { palette, fixedIndices, blocks } = buildMosaicFromImageData(
      processedImageData,
      size,
      removeBackground,
    );
    set({ palette, fixedPaletteIndices: fixedIndices, mosaicBlocks: blocks });
  },

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleNumbers: () => set((state) => ({ showNumbers: !state.showNumbers })),
  setGridType: (type: GridType) => set({ gridType: type }),
  setGridRows: (rows: number) => set({ gridRows: Math.max(1, Math.min(100, rows)) }),
  setGridCols: (cols: number) => set({ gridCols: Math.max(1, Math.min(100, cols)) }),

  setRemoveBackground: (val: boolean) => {
    set({ removeBackground: val });
    get().reprocessImage();
  },

  reset: () => set(DEFAULT_STATE),

  reprocessImage: () => {
    const { processedImageData, blockSize, removeBackground } = get();
    if (!processedImageData) return;
    const { palette, fixedIndices, blocks } = buildMosaicFromImageData(
      processedImageData,
      blockSize,
      removeBackground,
    );
    set({ palette, fixedPaletteIndices: fixedIndices, mosaicBlocks: blocks });
  },
}));

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
