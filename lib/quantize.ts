/**
 * Color quantization using image-q library.
 * Uses neuquant algorithm with CIEDE2000 distance for perceptually accurate palettes.
 */

import { buildPaletteSync, utils } from 'image-q';
import type { RGB } from './utils';

export const quantizeImage = (
  imageData: ImageData,
  colorCount: number
): { palette: RGB[] } => {
  const pointContainer = utils.PointContainer.fromImageData(imageData);

  // Try neuquant first (best perceptual quality), fall back to wuquant
  let palette;
  try {
    palette = buildPaletteSync([pointContainer], {
      colors: colorCount,
      colorDistanceFormula: 'ciede2000',
      paletteQuantization: 'neuquant',
    });
  } catch {
    palette = buildPaletteSync([pointContainer], {
      colors: colorCount,
      colorDistanceFormula: 'ciede2000',
      paletteQuantization: 'wuquant',
    });
  }

  const paletteColors: RGB[] = [];
  const pointArray = palette.getPointContainer().getPointArray();
  for (let i = 0; i < pointArray.length; i++) {
    const p = pointArray[i];
    paletteColors.push({ r: p.r, g: p.g, b: p.b });
  }

  return { palette: paletteColors };
};
