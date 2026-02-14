/**
 * Utility functions for image processing and color conversion
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Squared RGB distance between two colors */
const colorDistanceSq = (a: RGB, b: RGB): number => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

/**
 * Deduplicate palette: keep only unique colors (merge near-duplicates).
 * Returns unique palette and indexMap so that indexMap[oldIndex] === newIndex.
 * Threshold: squared RGB distance; colors closer than this are treated as same (default ~5–6 per channel).
 */
export const deduplicatePalette = (
  palette: RGB[],
  thresholdSq = 100
): { palette: RGB[]; indexMap: number[] } => {
  const unique: RGB[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    let found = -1;
    for (let j = 0; j < unique.length; j++) {
      if (colorDistanceSq(color, unique[j]) < thresholdSq) {
        found = j;
        break;
      }
    }
    if (found >= 0) {
      indexMap[i] = found;
    } else {
      indexMap[i] = unique.length;
      unique.push({ ...color });
    }
  }

  return { palette: unique, indexMap };
};

/**
 * Deduplicate palette by English color name: one name appears only once.
 * Merges palette entries that map to the same rgbToColorNameEn() result.
 * Returns unique palette (one color per name) and indexMap: oldIndex -> newIndex.
 */
export const deduplicatePaletteByName = (
  palette: RGB[]
): { palette: RGB[]; indexMap: number[] } => {
  const unique: RGB[] = [];
  const indexMap: number[] = [];
  const nameToIndex = new Map<string, number>();

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];
    const name = rgbToColorNameEn(color);
    const existing = nameToIndex.get(name);
    if (existing !== undefined) {
      indexMap[i] = existing;
    } else {
      const newIndex = unique.length;
      indexMap[i] = newIndex;
      nameToIndex.set(name, newIndex);
      unique.push({ ...color });
    }
  }

  return { palette: unique, indexMap };
};

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (color: RGB): string => {
  const r = color.r.toString(16).padStart(2, "0");
  const g = color.g.toString(16).padStart(2, "0");
  const b = color.b.toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
};

/** Basic colors (English) – everyone can recognize. Match by closest RGB. */
const BASIC_COLORS_EN: { rgb: RGB; name: string }[] = [
  { rgb: { r: 255, g: 255, b: 255 }, name: "White" },
  { rgb: { r: 0, g: 0, b: 0 }, name: "Black" },
  { rgb: { r: 128, g: 128, b: 128 }, name: "Gray" },
  { rgb: { r: 192, g: 192, b: 192 }, name: "Light gray" },
  { rgb: { r: 255, g: 0, b: 0 }, name: "Red" },
  { rgb: { r: 255, g: 99, b: 71 }, name: "Tomato" },
  { rgb: { r: 178, g: 34, b: 34 }, name: "Dark red" },
  { rgb: { r: 255, g: 165, b: 0 }, name: "Orange" },
  { rgb: { r: 255, g: 215, b: 0 }, name: "Gold" },
  { rgb: { r: 255, g: 255, b: 0 }, name: "Yellow" },
  { rgb: { r: 154, g: 205, b: 50 }, name: "Yellow green" },
  { rgb: { r: 0, g: 128, b: 0 }, name: "Green" },
  { rgb: { r: 0, g: 255, b: 0 }, name: "Lime" },
  { rgb: { r: 0, g: 255, b: 127 }, name: "Spring green" },
  { rgb: { r: 0, g: 206, b: 209 }, name: "Cyan" },
  { rgb: { r: 0, g: 0, b: 255 }, name: "Blue" },
  { rgb: { r: 65, g: 105, b: 225 }, name: "Royal blue" },
  { rgb: { r: 0, g: 0, b: 139 }, name: "Dark blue" },
  { rgb: { r: 128, g: 0, b: 128 }, name: "Purple" },
  { rgb: { r: 255, g: 0, b: 255 }, name: "Magenta" },
  { rgb: { r: 255, g: 192, b: 203 }, name: "Pink" },
  { rgb: { r: 139, g: 69, b: 19 }, name: "Brown" },
  { rgb: { r: 210, g: 180, b: 140 }, name: "Tan" },
  { rgb: { r: 245, g: 245, b: 220 }, name: "Beige" },
];

/**
 * English color name: closest match from basic colors. If color is close enough, use that name.
 */
export const rgbToColorNameEn = (color: RGB): string => {
  let minDist = Infinity;
  let bestName = "Other";
  for (const { rgb, name } of BASIC_COLORS_EN) {
    const dr = color.r - rgb.r;
    const dg = color.g - rgb.g;
    const db = color.b - rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      bestName = name;
    }
  }
  return bestName;
};

/** Named colors (Vietnamese) – fallback when Vietnamese label is needed (e.g. UI) */
const NAMED_COLORS: { rgb: RGB; name: string }[] = [
  { rgb: { r: 255, g: 255, b: 255 }, name: "Trắng" },
  { rgb: { r: 0, g: 0, b: 0 }, name: "Đen" },
  { rgb: { r: 128, g: 128, b: 128 }, name: "Xám" },
  { rgb: { r: 192, g: 192, b: 192 }, name: "Xám nhạt" },
  { rgb: { r: 255, g: 0, b: 0 }, name: "Đỏ" },
  { rgb: { r: 255, g: 128, b: 128 }, name: "Đỏ nhạt" },
  { rgb: { r: 139, g: 0, b: 0 }, name: "Đỏ đậm" },
  { rgb: { r: 255, g: 165, b: 0 }, name: "Cam" },
  { rgb: { r: 255, g: 200, b: 124 }, name: "Cam nhạt" },
  { rgb: { r: 255, g: 255, b: 0 }, name: "Vàng" },
  { rgb: { r: 255, g: 255, b: 200 }, name: "Vàng nhạt" },
  { rgb: { r: 128, g: 128, b: 0 }, name: "Vàng olive" },
  { rgb: { r: 0, g: 128, b: 0 }, name: "Xanh lá" },
  { rgb: { r: 144, g: 238, b: 144 }, name: "Xanh lá nhạt" },
  { rgb: { r: 0, g: 255, b: 0 }, name: "Xanh lá cây" },
  { rgb: { r: 0, g: 0, b: 255 }, name: "Xanh dương" },
  { rgb: { r: 173, g: 216, b: 230 }, name: "Xanh dương nhạt" },
  { rgb: { r: 0, g: 0, b: 139 }, name: "Xanh dương đậm" },
  { rgb: { r: 128, g: 0, b: 128 }, name: "Tím" },
  { rgb: { r: 218, g: 112, b: 214 }, name: "Tím nhạt" },
  { rgb: { r: 255, g: 192, b: 203 }, name: "Hồng" },
  { rgb: { r: 255, g: 105, b: 180 }, name: "Hồng đậm" },
  { rgb: { r: 139, g: 69, b: 19 }, name: "Nâu" },
  { rgb: { r: 210, g: 180, b: 140 }, name: "Nâu nhạt" },
  { rgb: { r: 101, g: 67, b: 33 }, name: "Nâu đậm" },
  { rgb: { r: 245, g: 245, b: 220 }, name: "Be" },
  { rgb: { r: 255, g: 228, b: 196 }, name: "Kem" },
];

/**
 * Get human-readable color name (Vietnamese) for a given RGB by closest match
 */
export const rgbToColorName = (color: RGB): string => {
  let minDist = Infinity;
  let bestName = "Màu khác";
  for (const { rgb, name } of NAMED_COLORS) {
    const dr = color.r - rgb.r;
    const dg = color.g - rgb.g;
    const db = color.b - rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      bestName = name;
    }
  }
  return bestName;
};

/**
 * Get label for palette index (0-9, then A, B, …, M for color-by-number)
 */
export const paletteIndexToLabel = (index: number): string => {
  if (index <= 9) return String(index);
  return String.fromCharCode(65 + index - 10);
};

/**
 * Resize image to max width while preserving aspect ratio
 * Returns ImageData for processing
 */
export const resizeImage = (
  img: HTMLImageElement,
  maxWidth: number,
): ImageData => {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

/** Letter size (8.5" x 11") at 150 DPI for print */
export const LETTER_OUTPUT_DPI = 150;
export const LETTER_WIDTH_IN = 8.5;
export const LETTER_HEIGHT_IN = 11;
export const LETTER_OUTPUT_WIDTH = Math.round(
  LETTER_WIDTH_IN * LETTER_OUTPUT_DPI,
);
export const LETTER_OUTPUT_HEIGHT = Math.round(
  LETTER_HEIGHT_IN * LETTER_OUTPUT_DPI,
);

/**
 * Compute fit dimensions to scale content into letter size, centered
 */
export const getLetterSizeFit = (
  contentWidth: number,
  contentHeight: number,
  outputWidth = LETTER_OUTPUT_WIDTH,
  outputHeight = LETTER_OUTPUT_HEIGHT,
): { scale: number; offsetX: number; offsetY: number } => {
  const scale = Math.min(
    outputWidth / contentWidth,
    outputHeight / contentHeight,
  );
  const scaledW = contentWidth * scale;
  const scaledH = contentHeight * scale;
  const offsetX = (outputWidth - scaledW) / 2;
  const offsetY = (outputHeight - scaledH) / 2;
  return { scale, offsetX, offsetY };
};

/**
 * Download canvas as PNG file
 */
export const downloadCanvas = (
  canvas: HTMLCanvasElement,
  filename: string,
): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
