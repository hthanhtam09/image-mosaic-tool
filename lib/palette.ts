import type { RGB } from "./utils";
import { BASIC_COLORS_EN, parseHexToRGB } from "./utils";
import { rgbToLab, deltaE2000 } from "./pixelate";

/** Names for palette indices 0..N (same order as FIXED_PALETTE). */
export const PALETTE_NAMES: readonly string[] =
  BASIC_COLORS_EN.map((c) => c.name);

/** Fixed palette: indices 0–23 → labels 0, 1, …, 9, A, B, …, N. */
export const FIXED_PALETTE: readonly RGB[] = BASIC_COLORS_EN.map((c) => ({
  r: c.rgb.r,
  g: c.rgb.g,
  b: c.rgb.b,
}));

const FIXED_PALETTE_LAB = FIXED_PALETTE.map((c) => rgbToLab(c));

/** Find the index of the closest color in FIXED_PALETTE using OKLab distance. */
export const findClosestFixedColorIndex = (color: RGB): number => {
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

/** Get display name for palette index (0–23) in the full fixed palette. */
export const getPaletteColorName = (index: number): string =>
  index >= 0 && index < PALETTE_NAMES.length ? PALETTE_NAMES[index] : "";

/** Get the color name for a given hex string using findClosestFixedColorIndex and getPaletteColorName */
export const getHexColorName = (hex: string): string => {
  if (!hex || !hex.startsWith("#")) return "Choose...";
  try {
    const rgb = parseHexToRGB(hex);
    const fixedIndex = findClosestFixedColorIndex(rgb);
    const colorName = getPaletteColorName(fixedIndex);
    return `${colorName} (${hex.toUpperCase()})`;
  } catch (e) {
    return hex.toUpperCase();
  }
};
