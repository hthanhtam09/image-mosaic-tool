export interface Region {
  id: number;
  colorIndex: number;
  pixelCount: number;
  centroidX: number;
  centroidY: number;
}

export interface RegionDetectionResult {
  /** For each pixel, which region it belongs to (-1 if filtered out) */
  regionMap: Int32Array;
  /** Array of detected regions with centroids */
  regions: Region[];
}

/**
 * Smooth an array of labels (e.g., color indices or region IDs) to create organic curved boundaries.
 * Applies a simple circular mode filter.
 */
export function smoothLabels(
  labels: Int32Array | Uint8Array,
  width: number,
  height: number,
  radius: number = 2,
  iterations: number = 2
): void {
  // Pre-allocate frequency array assuming max label value < 256 (for pixelColorIndex) or max regions < 100000.
  // We'll use a dynamic approach but reuse the same array to avoid GC.
  let maxLabelValue = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] > maxLabelValue) maxLabelValue = labels[i];
  }
  const counts = new Int32Array(maxLabelValue + 1);

  for (let iter = 0; iter < iterations; iter++) {
    const newLabels = new (labels.constructor as any)(labels.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxCount = 0;
        let modeId = labels[y * width + x];

        // Reset counts for the neighbors we are about to check
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              counts[labels[ny * width + nx]] = 0; // Quick zeroing
            }
          }
        }

        // Now count properly
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue; // Circular kernel

            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const id = labels[ny * width + nx];
              const c = counts[id] + 1;
              counts[id] = c;
              if (c > maxCount) {
                maxCount = c;
                modeId = id;
              }
            }
          }
        }
        newLabels[y * width + x] = modeId;
      }
    }

    labels.set(newLabels);
  }
}

/**
 * Detect contiguous same-color regions using BFS flood-fill.
 * Filters out regions smaller than minRegionSize.
 * Returns region map and region info (centroids, color indices).
 */
export function detectRegions(
  pixelColorIndex: Uint8Array,
  width: number,
  height: number,
  minRegionSize: number = 50
): RegionDetectionResult {
  const totalPixels = width * height;
  const regionMap = new Int32Array(totalPixels).fill(-1);
  const allRegions: Region[] = [];
  let regionId = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (regionMap[i] !== -1) continue;

    const colorIndex = pixelColorIndex[i];
    const queue: number[] = [i];
    const regionPixels: number[] = [];

    // BFS flood-fill
    while (queue.length > 0) {
      const px = queue.pop()!;
      if (regionMap[px] !== -1) continue;
      if (pixelColorIndex[px] !== colorIndex) continue;

      regionMap[px] = regionId;
      regionPixels.push(px);

      const x = px % width;
      const y = Math.floor(px / width);

      // 4-connected neighbors
      if (x > 0) queue.push(px - 1);
      if (x < width - 1) queue.push(px + 1);
      if (y > 0) queue.push(px - width);
      if (y < height - 1) queue.push(px + width);
    }

    if (regionPixels.length >= minRegionSize) {
      // Calculate centroid
      let sumX = 0;
      let sumY = 0;
      for (const px of regionPixels) {
        sumX += px % width;
        sumY += Math.floor(px / width);
      }
      const cx = Math.round(sumX / regionPixels.length);
      const cy = Math.round(sumY / regionPixels.length);

      // Make sure centroid is actually inside the region
      // If not, find the nearest point inside the region
      const centroidIdx = cy * width + cx;
      let finalCx = cx;
      let finalCy = cy;
      if (regionMap[centroidIdx] !== regionId) {
        // Find the closest region pixel to the calculated centroid
        let bestDist = Infinity;
        for (const px of regionPixels) {
          const px_x = px % width;
          const px_y = Math.floor(px / width);
          const dist = (px_x - cx) ** 2 + (px_y - cy) ** 2;
          if (dist < bestDist) {
            bestDist = dist;
            finalCx = px_x;
            finalCy = px_y;
          }
        }
      }

      allRegions.push({
        id: regionId,
        colorIndex,
        pixelCount: regionPixels.length,
        centroidX: finalCx,
        centroidY: finalCy,
      });
    } else {
      // Mark small regions as filtered (set to -1)
      for (const px of regionPixels) {
        regionMap[px] = -1;
      }
    }

    regionId++;
  }

  // Re-index regions to be contiguous 0..N-1
  const validRegions: Region[] = [];
  const idRemap = new Map<number, number>();
  for (let i = 0; i < allRegions.length; i++) {
    idRemap.set(allRegions[i].id, i);
    validRegions.push({ ...allRegions[i], id: i });
  }

  // Update regionMap with new IDs
  for (let i = 0; i < totalPixels; i++) {
    if (regionMap[i] !== -1) {
      const newId = idRemap.get(regionMap[i]);
      regionMap[i] = newId !== undefined ? newId : -1;
    }
  }

  return { regionMap, regions: validRegions };
}

/**
 * Merge small/filtered regions into their nearest neighbor.
 * This ensures no "holes" in the output.
 */
export function mergeSmallRegions(
  regionMap: Int32Array,
  width: number,
  height: number
): void {
  const totalPixels = width * height;
  let changed = true;

  // Iteratively assign unassigned pixels to their nearest assigned neighbor
  while (changed) {
    changed = false;
    for (let i = 0; i < totalPixels; i++) {
      if (regionMap[i] !== -1) continue;

      const x = i % width;
      const y = Math.floor(i / width);

      // Check 4-connected neighbors
      const neighbors = [];
      if (x > 0 && regionMap[i - 1] !== -1) neighbors.push(regionMap[i - 1]);
      if (x < width - 1 && regionMap[i + 1] !== -1) neighbors.push(regionMap[i + 1]);
      if (y > 0 && regionMap[i - width] !== -1) neighbors.push(regionMap[i - width]);
      if (y < height - 1 && regionMap[i + width] !== -1) neighbors.push(regionMap[i + width]);

      if (neighbors.length > 0) {
        // Assign to most common neighbor
        const counts = new Map<number, number>();
        for (const n of neighbors) {
          counts.set(n, (counts.get(n) || 0) + 1);
        }
        let bestRegion = neighbors[0];
        let bestCount = 0;
        for (const [region, count] of counts) {
          if (count > bestCount) {
            bestCount = count;
            bestRegion = region;
          }
        }
        regionMap[i] = bestRegion;
        changed = true;
      }
    }
  }
}

/**
 * Splits regions that are too large by carving them into smaller pieces.
 * Helps prevent massive blank areas with no numbers.
 */
export function splitLargeRegions(
  regionMap: Int32Array,
  regions: Region[],
  width: number,
  height: number,
  maxRegionArea: number
): Region[] {
  let nextRegionId = regions.length;
  let splitting = true;

  while (splitting) {
    splitting = false;
    const currentRegionsCount = regions.length;

    for (let i = 0; i < currentRegionsCount; i++) {
      const region = regions[i];
      if (region.pixelCount > maxRegionArea) {
        splitting = true;
        // Bounding box
        let minX = width, maxX = 0, minY = height, maxY = 0;
        for (let p = 0; p < regionMap.length; p++) {
          if (regionMap[p] === region.id) {
            const x = p % width;
            const y = Math.floor(p / width);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        const bbWidth = maxX - minX;
        const bbHeight = maxY - minY;
        const newId = nextRegionId++;
        let count1 = 0;
        let count2 = 0;
        
        // Randomly jitter the line to make it slightly more organic instead of perfectly center
        const splitRatio = 0.4 + Math.random() * 0.2; // 0.4 to 0.6

        if (bbWidth > bbHeight) {
          // split vertically
          const midX = minX + bbWidth * splitRatio;
          for (let p = 0; p < regionMap.length; p++) {
            if (regionMap[p] === region.id) {
              if (p % width > midX) {
                regionMap[p] = newId;
                count2++;
              } else {
                count1++;
              }
            }
          }
        } else {
          // split horizontally
          const midY = minY + bbHeight * splitRatio;
          for (let p = 0; p < regionMap.length; p++) {
            if (regionMap[p] === region.id) {
              if (Math.floor(p / width) > midY) {
                regionMap[p] = newId;
                count2++;
              } else {
                count1++;
              }
            }
          }
        }

        region.pixelCount = count1;
        regions.push({
          id: newId,
          colorIndex: region.colorIndex,
          pixelCount: count2,
          centroidX: 0,
          centroidY: 0
        });
      }
    }
  }
  
  return regions;
}

/**
 * Calculates the exact Pole of Inaccessibility for each region using a Manhattan distance transform.
 * Ensures the placed text is as far away from boundaries as possible.
 */
export function calculateRegionCenters(
  regionMap: Int32Array,
  width: number,
  height: number,
  regions: Region[]
): void {
  const totalPixels = width * height;
  const dist = new Int32Array(totalPixels).fill(0);
  
  // Pass 1: find edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const r = regionMap[i];
      let isEdge = false;
      if (x > 0 && regionMap[i - 1] !== r) isEdge = true;
      else if (x < width - 1 && regionMap[i + 1] !== r) isEdge = true;
      else if (y > 0 && regionMap[i - width] !== r) isEdge = true;
      else if (y < height - 1 && regionMap[i + width] !== r) isEdge = true;
      
      if (isEdge) {
        dist[i] = 0;
      } else {
        dist[i] = 1000000;
      }
    }
  }

  // Pass 2: Forward pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (dist[i] === 0) continue;
      let p1 = 1000000, p2 = 1000000;
      if (x > 0) p1 = dist[i - 1] + 1;
      if (y > 0) p2 = dist[i - width] + 1;
      dist[i] = Math.min(dist[i], Math.min(p1, p2));
    }
  }

  // Pass 3: Backward pass
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      let p1 = 1000000, p2 = 1000000;
      if (x < width - 1) p1 = dist[i + 1] + 1;
      if (y < height - 1) p2 = dist[i + width] + 1;
      dist[i] = Math.min(dist[i], Math.min(p1, p2));
    }
  }

  // Find max dist for each region
  const bestDist = new Int32Array(regions.length).fill(-1);
  const bestIdx = new Int32Array(regions.length).fill(0);

  for (let i = 0; i < totalPixels; i++) {
    const r = regionMap[i];
    if (r >= 0 && r < regions.length) {
      if (dist[i] > bestDist[r]) {
        bestDist[r] = dist[i];
        bestIdx[r] = i;
      }
    }
  }

  // Update regions with Pole of Inaccessibility (optimal text placement)
  for (let i = 0; i < regions.length; i++) {
    const idx = bestIdx[i];
    regions[i].centroidX = idx % width;
    regions[i].centroidY = Math.floor(idx / width);
  }
}

/**
 * Generates an organic, arbitrary interlocking region map (Spiroglyphic / shattered mosaic style).
 * Ignoring the original image contours, drawing random shapes, and assigning them the dominant color.
 */
export function generateMysteryRegions(
  pixelColorIndex: Uint8Array,
  width: number,
  height: number,
  approxNumRegions: number
): RegionDetectionResult {
  const totalPixels = width * height;
  const regionMap = new Int32Array(totalPixels);
  
  // Calculate grid dimensions
  const aspectRatio = width / height;
  const cols = Math.floor(Math.sqrt(approxNumRegions * aspectRatio));
  const rows = Math.floor(approxNumRegions / cols);
  
  const actualRegions = cols * rows;
  const cellW = width / cols;
  const cellH = height / rows;
  
  // Generate random seeds within each cell
  const seedsX = new Float32Array(actualRegions);
  const seedsY = new Float32Array(actualRegions);
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      // Add random jitter so they aren't perfectly aligned
      seedsX[idx] = (c + 0.1 + Math.random() * 0.8) * cellW;
      seedsY[idx] = (r + 0.1 + Math.random() * 0.8) * cellH;
    }
  }

  // Wavy distortion parameters to create stained-glass/organic look
  // Increasing amplitude creates more squiggles
  const waveAmpX = cellW * 0.8;
  const waveAmpY = cellH * 0.8;
  const waveFreq = 0.08;

  // Build the region map (Voronoi with distorted coordinates space)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wx = x + Math.sin(y * waveFreq) * waveAmpX + Math.sin(x * waveFreq * 1.3) * waveAmpX * 0.5;
      const wy = y + Math.cos(x * waveFreq) * waveAmpY + Math.cos(y * waveFreq * 1.3) * waveAmpY * 0.5;

      const gridC = Math.max(0, Math.min(cols - 1, Math.floor(wx / cellW)));
      const gridR = Math.max(0, Math.min(rows - 1, Math.floor(wy / cellH)));

      let bestDistSq = Infinity;
      let bestSeed = 0;

      // Check 3x3 neighborhood
      for (let nr = Math.max(0, gridR - 1); nr <= Math.min(rows - 1, gridR + 1); nr++) {
        for (let nc = Math.max(0, gridC - 1); nc <= Math.min(cols - 1, gridC + 1); nc++) {
          const sIdx = nr * cols + nc;
          const sx = seedsX[sIdx];
          const sy = seedsY[sIdx];
          const distSq = (wx - sx) ** 2 + (wy - sy) ** 2;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestSeed = sIdx;
          }
        }
      }

      regionMap[y * width + x] = bestSeed;
    }
  }

  // Aggregate color votes and calculate centroids
  const colorVotes = new Int32Array(actualRegions * 256);
  const maxColors = new Int32Array(actualRegions).fill(-1);
  const pixelCounts = new Int32Array(actualRegions).fill(0);
  const sumX = new Float64Array(actualRegions).fill(0);
  const sumY = new Float64Array(actualRegions).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const rId = regionMap[idx];
      const color = pixelColorIndex[idx];

      const voteIdx = rId * 256 + color;
      colorVotes[voteIdx]++;

      if (maxColors[rId] === -1 || colorVotes[voteIdx] > colorVotes[rId * 256 + maxColors[rId]]) {
        maxColors[rId] = color;
      }

      pixelCounts[rId]++;
      sumX[rId] += x;
      sumY[rId] += y;
    }
  }

  const regions: Region[] = [];
  for (let i = 0; i < actualRegions; i++) {
    if (pixelCounts[i] > 0) {
      regions.push({
        id: i,
        colorIndex: maxColors[i],
        pixelCount: pixelCounts[i],
        centroidX: Math.round(sumX[i] / pixelCounts[i]),
        centroidY: Math.round(sumY[i] / pixelCounts[i]),
      });
    }
  }

  return { regionMap, regions };
}
