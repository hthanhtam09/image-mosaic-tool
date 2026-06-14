/**
 * Utility functions for image processing and color conversion
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Threshold: sRGB channels >= this are treated as white (no number drawn on grid/template/export). */
export const WHITE_THRESHOLD = 250;

/** True if color is white or near-white; such cells are left without a number everywhere. */
export const isWhite = (c: RGB): boolean =>
  c.r >= WHITE_THRESHOLD && c.g >= WHITE_THRESHOLD && c.b >= WHITE_THRESHOLD;

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
  thresholdSq = 100,
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
  palette: RGB[],
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

/** Basic colors (English) – palette for color-by-number; everyone can recognize. Match by closest RGB. */
export const BASIC_COLORS_EN: { rgb: RGB; name: string }[] = [
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

export const parseHexToRGB = (hex: string): RGB => {
  const c = hex.replace("#", "");
  if (c.length === 3)
    return {
      r: parseInt(c[0] + c[0], 16),
      g: parseInt(c[1] + c[1], 16),
      b: parseInt(c[2] + c[2], 16),
    };
  return {
    r: parseInt(c.slice(0, 2), 16) || 0,
    g: parseInt(c.slice(2, 4), 16) || 0,
    b: parseInt(c.slice(4, 6), 16) || 0,
  };
};

/**
 * Get label for palette index (1-9, then A, B, …, N for color-by-number)
 */
export const paletteIndexToLabel = (index: number): string => {
  const n = index + 1; // 1-based
  if (n <= 9) return String(n);
  
  let temp = index - 9;
  let label = "";
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
};

export interface EnhanceOptions {
  /** Auto-contrast strength: 0 = none, 1 = full. Default 0.8 */
  contrastStrength?: number;
  /** Saturation multiplier relative to original. 1 = unchanged, 1.3 = +30%. Default 1.25 */
  saturation?: number;
  /** Enable unsharp mask to sharpen edges before pixelation. Default true */
  sharpen?: boolean;
}

/**
 * Enhance image for better color recognition:
 *  1. Auto-contrast: stretch the luminance histogram to fill [0, 255].
 *  2. Saturation boost: amplify chroma so the quantizer distinguishes hues more easily.
 *  3. Unsharp mask: preserve edge sharpness so block averaging picks the right dominant color.
 *
 * All operations run entirely on CPU (ImageData) to work inside Web Workers too.
 */
export const enhanceImage = (
  imageData: ImageData,
  options: EnhanceOptions = {},
): ImageData => {
  const { contrastStrength = 0.8, saturation = 1.25, sharpen = true } = options;

  const { width, height, data } = imageData;
  const n = width * height;
  const out = new Uint8ClampedArray(data);

  // --- Step 1: Auto-contrast (per-channel min/max stretch) ---
  if (contrastStrength > 0) {
    const minR = new Array(256).fill(0);
    const minG = new Array(256).fill(0);
    const minB = new Array(256).fill(0);
    let rMin = 255,
      rMax = 0,
      gMin = 255,
      gMax = 0,
      bMin = 255,
      bMax = 0;
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const r = data[j],
        g = data[j + 1],
        b = data[j + 2];
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
      void minR;
      void minG;
      void minB;
    }
    const rRange = Math.max(1, rMax - rMin);
    const gRange = Math.max(1, gMax - gMin);
    const bRange = Math.max(1, bMax - bMin);
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const r = data[j],
        g = data[j + 1],
        b = data[j + 2];
      // Blend between original and fully-stretched: strength controls blend
      out[j] = Math.round(
        r + contrastStrength * (((r - rMin) / rRange) * 255 - r),
      );
      out[j + 1] = Math.round(
        g + contrastStrength * (((g - gMin) / gRange) * 255 - g),
      );
      out[j + 2] = Math.round(
        b + contrastStrength * (((b - bMin) / bRange) * 255 - b),
      );
    }
  }

  // --- Step 2: Saturation boost (HSL-based) ---
  if (saturation !== 1.0) {
    for (let i = 0; i < n; i++) {
      const j = i * 4;
      const r = out[j] / 255;
      const g = out[j + 1] / 255;
      const b = out[j + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      if (max === min) continue; // achromatic, skip
      const d = max - min;
      let s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      s = Math.min(1, s * saturation);

      // Re-compute RGB from modified HSL
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (pv: number, qv: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return pv + (qv - pv) * 6 * t;
        if (t < 1 / 2) return qv;
        if (t < 2 / 3) return pv + (qv - pv) * (2 / 3 - t) * 6;
        return pv;
      };
      // Hue
      let h = 0;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;

      out[j] = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
      out[j + 1] = Math.round(hue2rgb(p, q, h) * 255);
      out[j + 2] = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    }
  }

  // --- Step 3: Unsharp mask (simple 3x3 approximation) ---
  if (sharpen) {
    const src = new Uint8ClampedArray(out);
    const amount = 0.4; // Sharpening intensity
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          // 3x3 box blur approximation (neighbors)
          const blurred =
            (src[((y - 1) * width + x) * 4 + c] +
              src[((y + 1) * width + x) * 4 + c] +
              src[(y * width + x - 1) * 4 + c] +
              src[(y * width + x + 1) * 4 + c] +
              center * 4) /
            8;
          const sharpened = center + amount * (center - blurred);
          out[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
    }
  }

  return new ImageData(out, width, height);
};

/**
 * Resize image to max width while preserving aspect ratio.
 * Uses high-quality smoothing so the scaled image stays sharp for conversion.
 * Returns ImageData for processing.
 */
export const resizeImage = (
  img: HTMLImageElement,
  maxWidth: number,
  enhance?: EnhanceOptions | false,
): ImageData => {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (enhance === false) return raw;
  return enhanceImage(raw, enhance ?? {});
};

/**
 * Resize a canvas source to max width while preserving aspect ratio.
 * Same as resizeImage but accepts HTMLCanvasElement directly — avoids toDataURL().
 */
export const resizeImageFromCanvas = (
  source: HTMLCanvasElement,
  maxWidth: number,
): ImageData => {
  const scale = Math.min(1, maxWidth / source.width);
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  if (scale >= 1) {
    // No resize needed, just extract ImageData
    const ctx = source.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    return ctx.getImageData(0, 0, source.width, source.height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
};

/**
 * Resize a canvas-based source to exact pixel dimensions.
 * Equivalent to resizeImageToSize but for canvas sources.
 */
export const resizeCanvasToSize = (
  source: HTMLCanvasElement,
  targetW: number,
  targetH: number,
): ImageData => {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
};

/** Letter size (8.5" x 11") at 300 DPI for print */
export const LETTER_OUTPUT_DPI = 300;
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

/**
 * Get custom label for palette index (1-9, then A, B, … based on badgeStyle)
 */
export const paletteIndexToLabelCustom = (
  index: number,
  badgeStyle: "number" | "letter" | "mixed",
): string => {
  const getLetterLabel = (idx: number): string => {
    let temp = idx;
    let label = "";
    while (temp >= 0) {
      label = String.fromCharCode((temp % 26) + 65) + label;
      temp = Math.floor(temp / 26) - 1;
    }
    return label;
  };

  if (badgeStyle === "number") {
    return String(index + 1);
  }
  if (badgeStyle === "letter") {
    return getLetterLabel(index);
  }
  // mixed style: numbers 1-9 for first 9 colors, and letters A-Z... for subsequent colors
  if (index < 9) {
    return String(index + 1);
  }
  return getLetterLabel(index - 9);
};

/**
 * Maps a standard code string to custom badge style representation
 */
export const getCustomLabel = (
  code: string,
  badgeStyle: "number" | "letter" | "mixed",
  gridType?: string,
): string => {
  if (!code) return "";
  if (gridType === "square-mark" || gridType === "hexagon-mark") {
    return code; // marks are not mapped
  }
  let index = 0;
  const num = parseInt(code, 10);
  if (!isNaN(num) && /^\d+$/.test(code)) {
    index = num - 1;
  } else {
    // Decode letter-based code (e.g. "A", "B", "AA")
    let val = 0;
    let isValid = true;
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      if (charCode >= 65 && charCode <= 90) {
        val = val * 26 + (charCode - 65 + 1);
      } else {
        isValid = false;
        break;
      }
    }
    if (isValid && code.length > 0) {
      index = val - 1 + 9;
    } else {
      index = 0;
    }
  }
  return paletteIndexToLabelCustom(index, badgeStyle);
};
