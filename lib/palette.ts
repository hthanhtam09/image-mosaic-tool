/**
 * Fixed color palette for color-by-number (0–9, A–N).
 * Sourced from BASIC_COLORS_EN so ảnh follow đúng các loại màu chuẩn.
 */

import type { RGB } from "./utils";
import { BASIC_COLORS_EN } from "./utils";

/** Names for palette indices 0..N (same order as FIXED_PALETTE). */
export const PALETTE_NAMES: readonly string[] =
  BASIC_COLORS_EN.map((c) => c.name);

/** Fixed palette: indices 0–23 → labels 0, 1, …, 9, A, B, …, N. */
export const FIXED_PALETTE: readonly RGB[] = BASIC_COLORS_EN.map((c) => ({
  r: c.rgb.r,
  g: c.rgb.g,
  b: c.rgb.b,
}));

/** Get display name for palette index (0–23) in the full fixed palette. */
export const getPaletteColorName = (index: number): string =>
  index >= 0 && index < PALETTE_NAMES.length ? PALETTE_NAMES[index] : "";
