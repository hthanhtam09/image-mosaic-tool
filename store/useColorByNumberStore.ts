/**
 * Color by Number Store – interactive tô màu theo số
 */

import { create } from "zustand";
import type {
  ColorByNumberData,
  ColorByNumberCell,
  ColorByNumberGridType,
  FilledMap,
} from "@/lib/colorByNumber";
import { imageToColorByNumber } from "@/lib/colorByNumber";

export interface ColorByNumberState {
  data: ColorByNumberData | null;
  filled: FilledMap;
  selectedCode: string | null;
  zoom: number;
  panX: number;
  panY: number;

  /** Whether to show code numbers inside cells */
  showNumbers: boolean;
  /** Cell size for the grid */
  cellSize: number;
  /** Data URL of the imported image (for thumbnail & reprocessing) */
  importedImageDataUrl: string | null;
  /** Stored File object for reprocessing with different grid type / cell size */
  importedFile: File | null;

  setData: (data: ColorByNumberData | null) => void;
  fillCell: (x: number, y: number) => void;
  setSelectedCode: (code: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  resetFill: () => void;
  loadProgress: (filled: FilledMap) => void;
  toggleShowNumbers: () => void;
  setCellSize: (size: number) => void;
  setImportedImage: (file: File, dataUrl: string) => void;
  reprocessWithGridType: (gridType: ColorByNumberGridType) => Promise<void>;
  reprocessWithCellSize: (cellSize: number) => Promise<void>;
}

export const useColorByNumberStore = create<ColorByNumberState>((set, get) => ({
  data: null,
  filled: {},
  selectedCode: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showNumbers: true,
  cellSize: 20,
  importedImageDataUrl: null,
  importedFile: null,

  setData: (data) => set({ data, filled: {} }),

  fillCell: (x, y) => {
    const { data, selectedCode, filled } = get();
    if (!data || !selectedCode) return;
    const cell = data.cells.find((c) => c.x === x && c.y === y);
    if (!cell || cell.code !== selectedCode) return;
    const key = `${x},${y}`;
    set({ filled: { ...filled, [key]: true } });
  },

  setSelectedCode: (code) => set({ selectedCode: code }),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

  setPan: (panX, panY) => set({ panX, panY }),

  resetFill: () => set({ filled: {} }),

  loadProgress: (filled) => set({ filled }),

  toggleShowNumbers: () =>
    set((state) => ({ showNumbers: !state.showNumbers })),

  setCellSize: (size) => set({ cellSize: size }),

  setImportedImage: (file, dataUrl) =>
    set({ importedFile: file, importedImageDataUrl: dataUrl }),

  reprocessWithGridType: async (gridType) => {
    const { importedFile, cellSize } = get();
    if (!importedFile) return;
    try {
      const result = await imageToColorByNumber(importedFile, {
        gridType,
        cellSize,
      });
      set({ data: result, filled: {} });
    } catch (err) {
      console.error("Failed to reprocess with grid type:", err);
    }
  },

  reprocessWithCellSize: async (newCellSize) => {
    const { importedFile, data } = get();
    if (!importedFile || !data) return;
    set({ cellSize: newCellSize });
    try {
      const result = await imageToColorByNumber(importedFile, {
        gridType: data.gridType,
        cellSize: newCellSize,
      });
      set({ data: result, filled: {} });
    } catch (err) {
      console.error("Failed to reprocess with cell size:", err);
    }
  },
}));
