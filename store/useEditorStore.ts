/**
 * Editor State Management Store
 *
 * Uses Zustand for lightweight, performant state management
 * Centralized store for all image editor state and actions
 */

import { create } from "zustand";
import { RGB, resizeImage } from "@/lib/utils";
import {
  createMosaicBlocks,
  reduceToUsedPalette,
  MosaicBlock,
} from "@/lib/pixelate";
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
  isProcessing: false,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...DEFAULT_STATE,

  /**
   * Load and process an uploaded image
   *
   * Workflow:
   * 1. Create HTMLImageElement from file
   * 2. Resize to preview resolution (800px max width)
   * 3. Quantize colors using image-q
   * 4. Generate mosaic blocks
   * 5. Update state
   */
  setImage: async (file: File) => {
    set({ isProcessing: true });

    try {
      const img = await loadImageFromFile(file);
      const resizedImageData = resizeImage(img, 800);
      const { blockSize } = get();
      const rawBlocks = createMosaicBlocks(
        resizedImageData,
        FIXED_PALETTE,
        blockSize,
      );
      const { palette, blocks, fixedIndices } = reduceToUsedPalette(
        rawBlocks,
        FIXED_PALETTE,
      );

      set({
        originalImage: img,
        processedImageData: resizedImageData,
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

    const { processedImageData } = get();
    if (!processedImageData) return;

    const rawBlocks = createMosaicBlocks(
      processedImageData,
      FIXED_PALETTE,
      size,
    );
    const { palette, blocks, fixedIndices } = reduceToUsedPalette(
      rawBlocks,
      FIXED_PALETTE,
    );
    set({ palette, fixedPaletteIndices: fixedIndices, mosaicBlocks: blocks });
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  toggleNumbers: () => {
    set((state) => ({ showNumbers: !state.showNumbers }));
  },

  setGridType: (type: GridType) => {
    set({ gridType: type });
  },

  setGridRows: (rows: number) => {
    set({ gridRows: Math.max(1, Math.min(100, rows)) });
  },

  setGridCols: (cols: number) => {
    set({ gridCols: Math.max(1, Math.min(100, cols)) });
  },

  reset: () => {
    set(DEFAULT_STATE);
  },

  reprocessImage: () => {
    const { processedImageData, blockSize } = get();
    if (!processedImageData) return;

    const rawBlocks = createMosaicBlocks(
      processedImageData,
      FIXED_PALETTE,
      blockSize,
    );
    const { palette, blocks, fixedIndices } = reduceToUsedPalette(
      rawBlocks,
      FIXED_PALETTE,
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
