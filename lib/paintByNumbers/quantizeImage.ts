import { buildPaletteSync, applyPaletteSync, utils } from "image-q";
import type { PaletteQuantization } from "image-q";

export interface QuantizedResult {
  /** Array of palette colors as [r, g, b] */
  palette: [number, number, number][];
  /** Flat array: for each pixel, the index into palette (0..N-1) */
  pixelColorIndex: Uint8Array;
  /** The quantized ImageData (same dimensions as input) */
  quantizedImageData: ImageData;
}

export type AlgorithmType = PaletteQuantization;

/**
 * Quantize an image to N colors using image-q library.
 * Returns the palette, per-pixel color index, and quantized ImageData.
 */
export function quantizeImage(
  imageData: ImageData,
  numColors: number,
  algorithm: AlgorithmType = "rgbquant"
): QuantizedResult {
  const pointContainer = utils.PointContainer.fromImageData(imageData);

  // Build palette
  const paletteResult = buildPaletteSync([pointContainer], {
    colors: numColors,
    colorDistanceFormula: "euclidean",
    paletteQuantization: algorithm,
  });

  // Apply palette to get quantized image
  const outPointContainer = applyPaletteSync(pointContainer, paletteResult, {
    colorDistanceFormula: "euclidean",
  });

  // Extract palette colors
  const palettePoints = paletteResult.getPointContainer().getPointArray();
  const palette: [number, number, number][] = palettePoints.map((p) => [p.r, p.g, p.b]);

  // Build a map for fast palette lookup
  const paletteMap = new Map<string, number>();
  palette.forEach((c, i) => {
    paletteMap.set(`${c[0]},${c[1]},${c[2]}`, i);
  });

  // Build pixel color index mapping from quantized output
  const outPoints = outPointContainer.getPointArray();
  const pixelColorIndex = new Uint8Array(outPoints.length);

  // Build quantized ImageData
  const quantizedImageData = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < outPoints.length; i++) {
    const p = outPoints[i];
    const key = `${p.r},${p.g},${p.b}`;
    let colorIdx = paletteMap.get(key);

    if (colorIdx === undefined) {
      // Nearest palette color fallback (shouldn't happen often)
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < palette.length; j++) {
        const dr = p.r - palette[j][0];
        const dg = p.g - palette[j][1];
        const db = p.b - palette[j][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }
      colorIdx = bestIdx;
    }

    pixelColorIndex[i] = colorIdx;
    quantizedImageData.data[i * 4] = palette[colorIdx][0];
    quantizedImageData.data[i * 4 + 1] = palette[colorIdx][1];
    quantizedImageData.data[i * 4 + 2] = palette[colorIdx][2];
    quantizedImageData.data[i * 4 + 3] = 255;
  }

  return { palette, pixelColorIndex, quantizedImageData };
}
