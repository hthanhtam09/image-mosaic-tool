/**
 * Color quantization using image-q library.
 * OPTIMIZED: Uses wuquant (Wu's quantizer) which is significantly faster than neuquant
 * while maintaining good perceptual quality. Uses euclidean distance instead of CIEDE2000
 * for the quantization step (perceptual correction happens later in the pipeline).
 */

import { buildPaletteSync, utils } from 'image-q';
import type { RGB } from './utils';

export const quantizeImage = (
  imageData: ImageData,
  colorCount: number
): { palette: RGB[] } => {
  const pointContainer = utils.PointContainer.fromImageData(imageData);

  // wuquant is ~5-10x faster than neuquant with good quality
  // euclidean distance is much faster than ciede2000 and sufficient for quantization
  // (perceptual correction is done later via deltaE2000 in palette matching)
  const palette = buildPaletteSync([pointContainer], {
    colors: colorCount,
    colorDistanceFormula: 'euclidean',
    paletteQuantization: 'wuquant',
  });

  const paletteColors: RGB[] = [];
  const pointArray = palette.getPointContainer().getPointArray();
  for (let i = 0; i < pointArray.length; i++) {
    const p = pointArray[i];
    paletteColors.push({ r: p.r, g: p.g, b: p.b });
  }

  return { palette: paletteColors };
};
