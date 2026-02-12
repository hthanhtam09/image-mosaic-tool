/**
 * Color quantization using image-q library
 */

import { buildPaletteSync, utils } from 'image-q';
import type { RGB } from './utils';

export const quantizeImage = (
  imageData: ImageData,
  colorCount: number
): { palette: RGB[] } => {
  const pointContainer = utils.PointContainer.fromImageData(imageData);
  const palette = buildPaletteSync([pointContainer], {
    colors: colorCount,
    colorDistanceFormula: 'euclidean-bt709-noalpha',
    paletteQuantization: 'rgbquant',
  });

  const paletteColors: RGB[] = [];
  const pointArray = palette.getPointContainer().getPointArray();
  for (let i = 0; i < pointArray.length; i++) {
    const p = pointArray[i];
    paletteColors.push({ r: p.r, g: p.g, b: p.b });
  }

  return { palette: paletteColors };
};
