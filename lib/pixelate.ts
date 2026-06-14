import type { RGB } from "./utils";

type Lab = { L: number; a: number; b: number };

export interface MosaicBlock {
  x: number;
  y: number;
  paletteIndex: number;
  color: RGB;
  avgColor?: RGB;
  isTransparent?: boolean;
}

const toLinear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};

export const rgbToLab = (rgb: RGB): Lab => {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const lmsL = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lmsM = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lmsS = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l = Math.cbrt(lmsL);
  const m = Math.cbrt(lmsM);
  const s = Math.cbrt(lmsS);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};

export const deltaE2000 = (lab1: Lab, lab2: Lab): number => {
  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;
  // Weight lightness difference less in OKLab space (dL^2 * 0.3) so hue and chroma dominate.
  // This prevents colorful pixels from being incorrectly matched to gray or merged with neutral colors.
  return Math.sqrt(dL * dL * 0.3 + da * da + db * db);
};

export const isNearWhite = (color: RGB): boolean =>
  color.r >= 225 && color.g >= 225 && color.b >= 225;

export const removeBackgroundBlocks = (
  blocks: MosaicBlock[],
  cols: number,
  rows: number,
  blockSize: number,
): MosaicBlock[] => {
  if (blocks.length === 0) return blocks;

  const grid = new Array(rows)
    .fill(null)
    .map(() => new Array<MosaicBlock | null>(cols).fill(null));

  blocks.forEach((block) => {
    const gy = Math.round(block.y / blockSize);
    const gx = Math.round(block.x / blockSize);
    if (gy >= 0 && gy < rows && gx >= 0 && gx < cols) grid[gy][gx] = block;
  });

  const isBackground = new Array(rows)
    .fill(null)
    .map(() => new Array<boolean>(cols).fill(false));
  const queue: { r: number; c: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r !== 0 && r !== rows - 1 && c !== 0 && c !== cols - 1) continue;
      const block = grid[r][c];
      if (block && isNearWhite(block.color)) {
        isBackground[r][c] = true;
        queue.push({ r, c });
      }
    }
  }

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || isBackground[nr][nc]) continue;
      const block = grid[nr][nc];
      if (block && isNearWhite(block.color)) {
        isBackground[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }

  return blocks.filter((block) => {
    const gy = Math.round(block.y / blockSize);
    const gx = Math.round(block.x / blockSize);
    return gy < 0 || gy >= rows || gx < 0 || gx >= cols || !isBackground[gy][gx];
  });
};

const findPaletteIndexFromLab = (lab: Lab, paletteLab: Lab[]): number => {
  let minDistance = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < paletteLab.length; i++) {
    const distance = deltaE2000(lab, paletteLab[i]);
    if (distance < minDistance) {
      minDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
};

const blockPixelLabs = (
  pixelLabs: Lab[],
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  blockSize: number,
): Lab[] => {
  const labs: Lab[] = [];
  for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
    for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
      labs.push(pixelLabs[(blockY + dy) * width + (blockX + dx)]);
    }
  }
  return labs;
};

const labHueDeg = (lab: Lab): number => (Math.atan2(lab.b, lab.a) * 180) / Math.PI;

const hueDistanceDeg = (h1: number, h2: number): number => {
  const distance = Math.abs(h1 - h2);
  return distance > 180 ? 360 - distance : distance;
};

const bestPaletteIndexByMinTotalError = (
  pixelLabs: Lab[],
  paletteLab: Lab[],
): number => {
  if (pixelLabs.length === 0) return 0;

  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  let totalWeight = 0;

  for (const { L, a, b } of pixelLabs) {
    const chroma = Math.sqrt(a * a + b * b);
    const weight = 1 + 2 * Math.min(1, chroma / 0.1);
    sumL += L * weight;
    sumA += a * weight;
    sumB += b * weight;
    totalWeight += weight;
  }

  const averageLab: Lab = {
    L: sumL / totalWeight,
    a: sumA / totalWeight,
    b: sumB / totalWeight,
  };
  const blockHue = labHueDeg(averageLab);

  let bestIndex = 0;
  let minDistance = Infinity;
  let secondIndex = 0;
  let secondDistance = Infinity;

  for (let index = 0; index < paletteLab.length; index++) {
    const distance = deltaE2000(averageLab, paletteLab[index]);
    if (distance < minDistance) {
      secondDistance = minDistance;
      secondIndex = bestIndex;
      minDistance = distance;
      bestIndex = index;
    } else if (distance < secondDistance) {
      secondDistance = distance;
      secondIndex = index;
    }
  }

  const blockChroma = Math.sqrt(
    averageLab.a * averageLab.a + averageLab.b * averageLab.b,
  );
  if (
    secondDistance <= minDistance * 1.05 &&
    secondDistance < Infinity &&
    blockChroma >= 0.03
  ) {
    const bestHue = labHueDeg(paletteLab[bestIndex]);
    const secondHue = labHueDeg(paletteLab[secondIndex]);
    if (hueDistanceDeg(blockHue, secondHue) < hueDistanceDeg(blockHue, bestHue)) {
      return secondIndex;
    }
  }

  return bestIndex;
};

export const createMosaicBlocks = (
  imageData: ImageData,
  palette: readonly RGB[],
  blockSize: number,
  useDithering = true,
  useBlockAverage = false,
  gridType?: string,
): MosaicBlock[] => {
  void useDithering;

  const { width, height, data } = imageData;
  const paletteLab = palette.map((color) => rgbToLab(color));
  const blocks: MosaicBlock[] = [];
  const cols = Math.ceil(width / blockSize);
  const rows = Math.ceil(height / blockSize);

  const pixelLabs: Lab[] = new Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    pixelLabs[i] = rgbToLab({ r: data[j], g: data[j + 1], b: data[j + 2] });
  }

  const isStaggered =
    gridType === "hexagon-mark" ||
    gridType === "honeycomb" ||
    gridType === "diamond" ||
    gridType === "pentagon" ||
    gridType === "fish-scale";

  if (useBlockAverage) {
    for (let row = 0; row < rows; row++) {
      const rowOffset = isStaggered && row % 2 === 1 ? Math.round(blockSize / 2) : 0;
      for (let col = 0; col < cols; col++) {
        const blockX = col * blockSize + rowOffset;
        const blockY = row * blockSize;
        let opaqueCount = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let totalRgbWeight = 0;

        for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
          for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
            const pixelIndex = (blockY + dy) * width + (blockX + dx);
            const alpha = data[pixelIndex * 4 + 3] ?? 255;
            if (alpha < 128) continue;

            opaqueCount++;
            const i = pixelIndex * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            const weight = 1 + Math.min(2, chroma / 42);
            sumR += r * weight;
            sumG += g * weight;
            sumB += b * weight;
            totalRgbWeight += weight;
          }
        }

        const labs = blockPixelLabs(pixelLabs, width, height, blockX, blockY, blockSize);
        const bestIndex =
          labs.length > 0 && opaqueCount > 0
            ? bestPaletteIndexByMinTotalError(labs, paletteLab)
            : 0;

        blocks.push({
          x: blockX,
          y: blockY,
          paletteIndex: bestIndex,
          color: palette[bestIndex],
          avgColor:
            totalRgbWeight > 0
               ? {
                  r: Math.round(sumR / totalRgbWeight),
                  g: Math.round(sumG / totalRgbWeight),
                  b: Math.round(sumB / totalRgbWeight),
                }
              : palette[bestIndex],
          isTransparent: opaqueCount === 0,
        });
      }
    }

    return blocks;
  }

  for (let row = 0; row < rows; row++) {
    const rowOffset = isStaggered && row % 2 === 1 ? Math.round(blockSize / 2) : 0;
    for (let col = 0; col < cols; col++) {
      const blockX = col * blockSize + rowOffset;
      const blockY = row * blockSize;
      const votes = new Array<number>(palette.length).fill(0);

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const px = blockX + dx;
          const py = blockY + dy;
          const index = py * width + px;
          const alpha = data[index * 4 + 3] ?? 255;
          if (alpha < 128) continue;
          votes[findPaletteIndexFromLab(pixelLabs[index], paletteLab)]++;
        }
      }

      let bestIndex = 0;
      let maxVotes = 0;
      let opaqueCount = 0;

      for (let index = 0; index < votes.length; index++) {
        if (votes[index] > maxVotes) {
          maxVotes = votes[index];
          bestIndex = index;
        }
        opaqueCount += votes[index];
      }

      blocks.push({
        x: blockX,
        y: blockY,
        paletteIndex: bestIndex,
        color: palette[bestIndex],
        isTransparent: opaqueCount === 0,
      });
    }
  }

  return blocks;
};

export const reduceToUsedPalette = (
  blocks: MosaicBlock[],
  fullPalette: readonly RGB[],
): { palette: RGB[]; blocks: MosaicBlock[]; fixedIndices: number[] } => {
  const usedIndices = new Set<number>();
  for (const block of blocks) usedIndices.add(block.paletteIndex);

  const sorted = [...usedIndices].sort((a, b) => a - b);
  const oldToNew = new Map<number, number>();
  const palette: RGB[] = [];
  const fixedIndices: number[] = [];

  for (let index = 0; index < sorted.length; index++) {
    const oldIndex = sorted[index];
    oldToNew.set(oldIndex, index);
    palette.push({ ...fullPalette[oldIndex] });
    fixedIndices.push(oldIndex);
  }

  return {
    palette,
    fixedIndices,
    blocks: blocks.map((block) => {
      const newIndex = oldToNew.get(block.paletteIndex)!;
      return { ...block, paletteIndex: newIndex, color: palette[newIndex] };
    }),
  };
};

export const mergeMinorColors = (
  blocks: MosaicBlock[],
  palette: readonly RGB[],
  minCount: number,
): MosaicBlock[] => {
  if (blocks.length === 0 || palette.length === 0) return blocks;

  const counts = new Array<number>(palette.length).fill(0);
  for (const block of blocks) counts[block.paletteIndex]++;

  const majorIndices: number[] = [];
  const minorIndices: number[] = [];
  for (let index = 0; index < counts.length; index++) {
    if (counts[index] >= minCount) {
      majorIndices.push(index);
    } else if (counts[index] > 0) {
      minorIndices.push(index);
    }
  }

  if (majorIndices.length === 0 || minorIndices.length === 0) return blocks;

  const paletteLab = palette.map((color) => rgbToLab(color));
  const remap = new Map<number, number>();

  for (const minorIndex of minorIndices) {
    if (isNearWhite(palette[minorIndex])) continue;

    let bestMajorIndex = majorIndices[0];
    let minDifference = Infinity;
    const minorLab = paletteLab[minorIndex];

    for (const majorIndex of majorIndices) {
      const distance = deltaE2000(minorLab, paletteLab[majorIndex]);
      if (distance < minDifference) {
        minDifference = distance;
        bestMajorIndex = majorIndex;
      }
    }

    remap.set(minorIndex, bestMajorIndex);
  }

  return blocks.map((block) => {
    const newIndex = remap.get(block.paletteIndex);
    return newIndex === undefined
      ? block
      : { ...block, paletteIndex: newIndex, color: palette[newIndex] };
  });
};
