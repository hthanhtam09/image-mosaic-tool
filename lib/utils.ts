/**
 * Utility functions for image processing and color conversion
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (color: RGB): string => {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
};

/**
 * Get label for palette index (1-9, then A, B, C... for color-by-number)
 */
export const paletteIndexToLabel = (index: number): string => {
  if (index < 9) return String(index + 1);
  return String.fromCharCode(65 + index - 9);
};

/**
 * Resize image to max width while preserving aspect ratio
 * Returns ImageData for processing
 */
export const resizeImage = (img: HTMLImageElement, maxWidth: number): ImageData => {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxWidth / img.width);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
};

/** Letter size (8.5" x 11") at 150 DPI for print */
export const LETTER_OUTPUT_DPI = 150;
export const LETTER_WIDTH_IN = 8.5;
export const LETTER_HEIGHT_IN = 11;
export const LETTER_OUTPUT_WIDTH = Math.round(LETTER_WIDTH_IN * LETTER_OUTPUT_DPI);
export const LETTER_OUTPUT_HEIGHT = Math.round(LETTER_HEIGHT_IN * LETTER_OUTPUT_DPI);

/**
 * Compute fit dimensions to scale content into letter size, centered
 */
export const getLetterSizeFit = (
  contentWidth: number,
  contentHeight: number,
  outputWidth = LETTER_OUTPUT_WIDTH,
  outputHeight = LETTER_OUTPUT_HEIGHT
): { scale: number; offsetX: number; offsetY: number } => {
  const scale = Math.min(outputWidth / contentWidth, outputHeight / contentHeight);
  const scaledW = contentWidth * scale;
  const scaledH = contentHeight * scale;
  const offsetX = (outputWidth - scaledW) / 2;
  const offsetY = (outputHeight - scaledH) / 2;
  return { scale, offsetX, offsetY };
};

/**
 * Download canvas as PNG file
 */
export const downloadCanvas = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};
