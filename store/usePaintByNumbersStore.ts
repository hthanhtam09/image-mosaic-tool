import { create } from "zustand";
import type { AlgorithmType } from "@/lib/paintByNumbers/quantizeImage";

export type PBNAlgorithm = AlgorithmType;
export type PBNViewMode = "preview" | "print";

export interface PBNState {
  // Image
  originalImage: string | null; // data URL
  originalFileName: string | null;
  imageWidth: number;
  imageHeight: number;

  // Config
  numColors: number;
  algorithm: PBNAlgorithm;
  minRegionSize: number;
  outlineThickness: number;
  fontSize: number;
  viewMode: PBNViewMode;
  maxImageSize: number;

  // Processing state
  isProcessing: boolean;
  processingStep: string;

  // Results
  palette: [number, number, number][] | null;
  pixelColorIndex: Uint8Array | null;
  regionMap: Int32Array | null;
  regions: { id: number; colorIndex: number; pixelCount: number; centroidX: number; centroidY: number }[] | null;

  // Actions
  setOriginalImage: (dataUrl: string, fileName: string) => void;
  clearImage: () => void;
  setNumColors: (n: number) => void;
  setAlgorithm: (a: PBNAlgorithm) => void;
  setMinRegionSize: (n: number) => void;
  setOutlineThickness: (n: number) => void;
  setFontSize: (n: number) => void;
  setViewMode: (m: PBNViewMode) => void;
  setMaxImageSize: (n: number) => void;
  setProcessing: (isProcessing: boolean, step?: string) => void;
  setResults: (results: {
    palette: [number, number, number][];
    pixelColorIndex: Uint8Array;
    regionMap: Int32Array;
    regions: { id: number; colorIndex: number; pixelCount: number; centroidX: number; centroidY: number }[];
    imageWidth: number;
    imageHeight: number;
  }) => void;
  resetResults: () => void;
}

export const usePaintByNumbersStore = create<PBNState>((set) => ({
  // Image
  originalImage: null,
  originalFileName: null,
  imageWidth: 0,
  imageHeight: 0,

  // Config
  numColors: 12,
  algorithm: "rgbquant",
  minRegionSize: 100,
  outlineThickness: 1,
  fontSize: 14,
  viewMode: "print",
  maxImageSize: 1200,

  // Processing
  isProcessing: false,
  processingStep: "",

  // Results
  palette: null,
  pixelColorIndex: null,
  regionMap: null,
  regions: null,

  // Actions
  setOriginalImage: (dataUrl, fileName) =>
    set({
      originalImage: dataUrl,
      originalFileName: fileName,
      // Reset results when new image is loaded
      palette: null,
      pixelColorIndex: null,
      regionMap: null,
      regions: null,
    }),

  clearImage: () =>
    set({
      originalImage: null,
      originalFileName: null,
      imageWidth: 0,
      imageHeight: 0,
      palette: null,
      pixelColorIndex: null,
      regionMap: null,
      regions: null,
      isProcessing: false,
      processingStep: "",
    }),

  setNumColors: (n) => set({ numColors: n }),
  setAlgorithm: (a) => set({ algorithm: a }),
  setMinRegionSize: (n) => set({ minRegionSize: n }),
  setOutlineThickness: (n) => set({ outlineThickness: n }),
  setFontSize: (n) => set({ fontSize: n }),
  setViewMode: (m) => set({ viewMode: m }),
  setMaxImageSize: (n) => set({ maxImageSize: n }),

  setProcessing: (isProcessing, step = "") =>
    set({ isProcessing, processingStep: step }),

  setResults: (results) =>
    set({
      palette: results.palette,
      pixelColorIndex: results.pixelColorIndex,
      regionMap: results.regionMap,
      regions: results.regions,
      imageWidth: results.imageWidth,
      imageHeight: results.imageHeight,
      isProcessing: false,
      processingStep: "",
    }),

  resetResults: () =>
    set({
      palette: null,
      pixelColorIndex: null,
      regionMap: null,
      regions: null,
    }),
}));
