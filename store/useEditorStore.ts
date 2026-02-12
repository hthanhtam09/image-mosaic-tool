/**
 * Editor State Management Store
 *
 * Uses Zustand for lightweight, performant state management
 * Centralized store for all image editor state and actions
 */

import { create } from 'zustand';
import { RGB } from '@/lib/utils';
import { resizeImage } from '@/lib/utils';
import { quantizeImage } from '@/lib/quantize';
import { createMosaicBlocks, MosaicBlock } from '@/lib/pixelate';

export interface EditorState {
  // Image state
  originalImage: HTMLImageElement | null;
  processedImageData: ImageData | null;
  mosaicBlocks: MosaicBlock[];

  // Palette state
  palette: RGB[];

  // User controls
  colorCount: number;
  blockSize: number;
  showGrid: boolean;
  showNumbers: boolean; // Placeholder for future feature

  // UI state
  isProcessing: boolean;

  // Actions
  setImage: (file: File) => Promise<void>;
  setColorCount: (count: number) => void;
  setBlockSize: (size: number) => void;
  toggleGrid: () => void;
  toggleNumbers: () => void;
  reset: () => void;
  reprocessImage: () => void;
}

const DEFAULT_STATE = {
  originalImage: null,
  processedImageData: null,
  mosaicBlocks: [],
  palette: [],
  colorCount: 12,
  blockSize: 20,
  showGrid: true,
  showNumbers: false,
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
      const { palette } = quantizeImage(resizedImageData, get().colorCount);
      const blocks = createMosaicBlocks(
        resizedImageData,
        palette,
        get().blockSize
      );

      set({
        originalImage: img,
        processedImageData: resizedImageData,
        palette,
        mosaicBlocks: blocks,
        isProcessing: false,
      });
    } catch (error) {
      console.error('Error processing image:', error);
      set({ isProcessing: false });
    }
  },

  setColorCount: (count: number) => {
    set({ colorCount: count });
    get().reprocessImage();
  },

  setBlockSize: (size: number) => {
    set({ blockSize: size });

    const { processedImageData, palette } = get();
    if (!processedImageData || palette.length === 0) return;

    const blocks = createMosaicBlocks(processedImageData, palette, size);
    set({ mosaicBlocks: blocks });
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  toggleNumbers: () => {
    set((state) => ({ showNumbers: !state.showNumbers }));
  },

  reset: () => {
    set(DEFAULT_STATE);
  },

  reprocessImage: () => {
    const { processedImageData, colorCount, blockSize } = get();
    if (!processedImageData) return;

    set({ isProcessing: true });

    try {
      const { palette } = quantizeImage(processedImageData, colorCount);
      const blocks = createMosaicBlocks(processedImageData, palette, blockSize);

      set({
        palette,
        mosaicBlocks: blocks,
        isProcessing: false,
      });
    } catch (error) {
      console.error('Error reprocessing image:', error);
      set({ isProcessing: false });
    }
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
