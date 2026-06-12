import { buildPaletteSync, utils } from "image-q";
import type { RGB } from "./utils";

export const quantizeImage = (
  imageData: ImageData,
  colorCount: number,
): { palette: RGB[] } => {
  const pointContainer = utils.PointContainer.fromImageData(imageData);
  const palette = buildPaletteSync([pointContainer], {
    colors: colorCount,
    colorDistanceFormula: "manhattan",
    paletteQuantization: "wuquant",
  });

  const paletteColors: RGB[] = [];
  const pointArray = palette.getPointContainer().getPointArray();
  for (let i = 0; i < pointArray.length; i++) {
    const point = pointArray[i];
    paletteColors.push({ r: point.r, g: point.g, b: point.b });
  }

  return { palette: paletteColors };
};
