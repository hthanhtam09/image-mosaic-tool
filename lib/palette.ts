/**
 * Fixed color palette for color-by-number (0–9, A–M).
 * All mosaic colors are mapped to this palette only.
 */

import type { RGB } from './utils';

export const PALETTE_NAMES: readonly string[] = [
  'Black',        // 0
  'Gray',         // 1
  'Dark Gray',    // 2
  'Dark Brown',   // 3
  'Brown',        // 4
  'Tan',          // 5
  'Peach',        // 6
  'Red',          // 7
  'Red Orange',   // 8
  'Orange',       // 9
  'Yellow Orange',// A
  'Yellow',       // B
  'Yellow Green', // C
  'Green',        // D
  'Dark Green',   // E
  'Aqua Green',   // F
  'Light Blue',   // G
  'Blue',         // H
  'Dark Blue',    // I
  'Pink',         // J
  'Violet',       // K
  'Dark Violet',  // L
  'Magenta',      // M
];

/** Fixed palette: indices 0–22 → labels 0, 1, …, 9, A, B, …, M */
export const FIXED_PALETTE: readonly RGB[] = [
  { r: 0, g: 0, b: 0 },           // 0 Black
  { r: 128, g: 128, b: 128 },     // 1 Gray
  { r: 80, g: 80, b: 80 },        // 2 Dark Gray
  { r: 92, g: 64, b: 51 },        // 3 Dark Brown
  { r: 139, g: 69, b: 19 },      // 4 Brown
  { r: 210, g: 180, b: 140 },    // 5 Tan
  { r: 255, g: 218, b: 185 },    // 6 Peach
  { r: 220, g: 20, b: 60 },      // 7 Red
  { r: 237, g: 106, b: 61 },     // 8 Red Orange
  { r: 255, g: 140, b: 0 },      // 9 Orange
  { r: 244, g: 164, b: 96 },     // A Yellow Orange
  { r: 255, g: 215, b: 0 },      // B Yellow
  { r: 154, g: 205, b: 50 },     // C Yellow Green
  { r: 34, g: 197, b: 94 },      // D Green
  { r: 34, g: 139, b: 34 },      // E Dark Green
  { r: 64, g: 224, b: 208 },     // F Aqua Green
  { r: 135, g: 206, b: 235 },    // G Light Blue
  { r: 37, g: 99, b: 235 },      // H Blue
  { r: 30, g: 58, b: 95 },       // I Dark Blue
  { r: 244, g: 114, b: 182 },    // J Pink
  { r: 139, g: 92, b: 246 },     // K Violet
  { r: 91, g: 33, b: 182 },      // L Dark Violet
  { r: 217, g: 70, b: 239 },     // M Magenta
];

/** Get display name for palette index (0–22) in the full fixed palette. */
export const getPaletteColorName = (index: number): string =>
  index >= 0 && index < PALETTE_NAMES.length ? PALETTE_NAMES[index] : '';
