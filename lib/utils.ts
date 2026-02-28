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

/**
 * Extended color palette (~70 colors) for finer-grained color naming.
 * Used only for palette chart exports – does NOT affect the core color-by-number quantization.
 */
export const EXTENDED_COLORS_EN: { rgb: RGB; name: string }[] = [
  // Whites / off-whites
  { rgb: { r: 255, g: 255, b: 255 }, name: "White" },
  { rgb: { r: 255, g: 250, b: 240 }, name: "Ivory" },
  { rgb: { r: 245, g: 245, b: 220 }, name: "Beige" },
  { rgb: { r: 255, g: 253, b: 208 }, name: "Cream" },

  // Blacks / dark grays
  { rgb: { r: 0, g: 0, b: 0 }, name: "Black" },
  { rgb: { r: 54, g: 69, b: 79 }, name: "Charcoal" },
  { rgb: { r: 64, g: 64, b: 64 }, name: "Dark gray" },

  // Grays
  { rgb: { r: 128, g: 128, b: 128 }, name: "Gray" },
  { rgb: { r: 169, g: 169, b: 169 }, name: "Silver" },
  { rgb: { r: 192, g: 192, b: 192 }, name: "Light gray" },
  { rgb: { r: 112, g: 128, b: 144 }, name: "Slate" },

  // Reds
  { rgb: { r: 255, g: 0, b: 0 }, name: "Red" },
  { rgb: { r: 220, g: 20, b: 60 }, name: "Crimson" },
  { rgb: { r: 178, g: 34, b: 34 }, name: "Dark red" },
  { rgb: { r: 128, g: 0, b: 0 }, name: "Maroon" },
  { rgb: { r: 255, g: 99, b: 71 }, name: "Tomato" },
  { rgb: { r: 205, g: 92, b: 92 }, name: "Indian red" },
  { rgb: { r: 188, g: 71, b: 73 }, name: "Brick red" },

  // Pinks
  { rgb: { r: 255, g: 192, b: 203 }, name: "Pink" },
  { rgb: { r: 255, g: 105, b: 180 }, name: "Hot pink" },
  { rgb: { r: 255, g: 182, b: 193 }, name: "Light pink" },
  { rgb: { r: 219, g: 112, b: 147 }, name: "Rose" },
  { rgb: { r: 250, g: 128, b: 114 }, name: "Salmon" },

  // Oranges
  { rgb: { r: 255, g: 165, b: 0 }, name: "Orange" },
  { rgb: { r: 255, g: 140, b: 0 }, name: "Dark orange" },
  { rgb: { r: 255, g: 127, b: 80 }, name: "Coral" },
  { rgb: { r: 255, g: 160, b: 122 }, name: "Peach" },
  { rgb: { r: 255, g: 191, b: 0 }, name: "Amber" },

  // Yellows
  { rgb: { r: 255, g: 255, b: 0 }, name: "Yellow" },
  { rgb: { r: 255, g: 215, b: 0 }, name: "Gold" },
  { rgb: { r: 255, g: 239, b: 0 }, name: "Lemon" },
  { rgb: { r: 240, g: 230, b: 140 }, name: "Khaki" },

  // Tans / Browns
  { rgb: { r: 210, g: 180, b: 140 }, name: "Tan" },
  { rgb: { r: 244, g: 164, b: 96 }, name: "Sandy brown" },
  { rgb: { r: 210, g: 105, b: 30 }, name: "Chocolate" },
  { rgb: { r: 139, g: 69, b: 19 }, name: "Brown" },
  { rgb: { r: 160, g: 82, b: 45 }, name: "Sienna" },
  { rgb: { r: 101, g: 67, b: 33 }, name: "Dark brown" },
  { rgb: { r: 183, g: 65, b: 14 }, name: "Rust" },
  { rgb: { r: 128, g: 0, b: 32 }, name: "Burgundy" },

  // Greens
  { rgb: { r: 0, g: 128, b: 0 }, name: "Green" },
  { rgb: { r: 0, g: 255, b: 0 }, name: "Lime" },
  { rgb: { r: 154, g: 205, b: 50 }, name: "Yellow green" },
  { rgb: { r: 34, g: 139, b: 34 }, name: "Forest green" },
  { rgb: { r: 0, g: 100, b: 0 }, name: "Dark green" },
  { rgb: { r: 80, g: 200, b: 120 }, name: "Emerald" },
  { rgb: { r: 62, g: 180, b: 137 }, name: "Mint" },
  { rgb: { r: 0, g: 255, b: 127 }, name: "Spring green" },
  { rgb: { r: 128, g: 128, b: 0 }, name: "Olive" },
  { rgb: { r: 46, g: 139, b: 87 }, name: "Sea green" },
  { rgb: { r: 144, g: 238, b: 144 }, name: "Light green" },

  // Cyans / Teals
  { rgb: { r: 0, g: 206, b: 209 }, name: "Cyan" },
  { rgb: { r: 0, g: 128, b: 128 }, name: "Teal" },
  { rgb: { r: 64, g: 224, b: 208 }, name: "Turquoise" },
  { rgb: { r: 127, g: 255, b: 212 }, name: "Aqua" },
  { rgb: { r: 95, g: 158, b: 160 }, name: "Cadet blue" },

  // Blues
  { rgb: { r: 0, g: 0, b: 255 }, name: "Blue" },
  { rgb: { r: 65, g: 105, b: 225 }, name: "Royal blue" },
  { rgb: { r: 0, g: 0, b: 139 }, name: "Dark blue" },
  { rgb: { r: 0, g: 0, b: 80 }, name: "Navy" },
  { rgb: { r: 135, g: 206, b: 235 }, name: "Sky blue" },
  { rgb: { r: 70, g: 130, b: 180 }, name: "Steel blue" },
  { rgb: { r: 0, g: 71, b: 171 }, name: "Cobalt" },
  { rgb: { r: 100, g: 149, b: 237 }, name: "Cornflower" },
  { rgb: { r: 173, g: 216, b: 230 }, name: "Light blue" },

  // Purples
  { rgb: { r: 128, g: 0, b: 128 }, name: "Purple" },
  { rgb: { r: 75, g: 0, b: 130 }, name: "Indigo" },
  { rgb: { r: 148, g: 103, b: 189 }, name: "Violet" },
  { rgb: { r: 221, g: 160, b: 221 }, name: "Plum" },
  { rgb: { r: 230, g: 190, b: 255 }, name: "Lavender" },
  { rgb: { r: 186, g: 85, b: 211 }, name: "Orchid" },
  { rgb: { r: 102, g: 51, b: 153 }, name: "Dark purple" },

  // Magentas / Fuchsia
  { rgb: { r: 255, g: 0, b: 255 }, name: "Magenta" },
  { rgb: { r: 255, g: 0, b: 128 }, name: "Fuchsia" },
  { rgb: { r: 200, g: 162, b: 200 }, name: "Lilac" },
  { rgb: { r: 227, g: 115, b: 131 }, name: "Mauve" },
];

/**
 * Extended color name: closest match from EXTENDED_COLORS_EN (~70 colors).
 * Used for palette chart exports only.
 */
export const rgbToExtendedColorName = (color: RGB): { name: string; rgb: RGB } => {
  let minDist = Infinity;
  let best = EXTENDED_COLORS_EN[0];
  for (const entry of EXTENDED_COLORS_EN) {
    const dr = color.r - entry.rgb.r;
    const dg = color.g - entry.rgb.g;
    const db = color.b - entry.rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      best = entry;
    }
  }
  return { name: best.name, rgb: best.rgb };
};

/**
 * Get label for palette index (1-9, then A, B, …, N for color-by-number)
 */
export const paletteIndexToLabel = (index: number): string => {
  const n = index + 1; // 1-based
  if (n <= 9) return String(n);
  return String.fromCharCode(65 + n - 10);
};

/**
 * Resize image to max width while preserving aspect ratio.
 * Uses high-quality smoothing so the scaled image stays sharp for conversion.
 * Returns ImageData for processing.
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
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
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
