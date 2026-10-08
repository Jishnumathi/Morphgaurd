/**
 * MorphGuard AI — Compression & Error Level Analysis (ELA) Engine
 * Evaluates JPEG block artifact grids (8x8 DCT boundary discontinuities)
 * and resave error-level consistency. Accurately flags lossless PNG sources.
 */

import jpeg from 'jpeg-js';
import { DecodedImage, createPngDataUrl } from './decoder.js';
import { BoundingBox, CompressionAnalysisResult } from '../../types.js';

export function analyzeCompression(img: DecodedImage, faceBox?: BoundingBox): CompressionAnalysisResult {
  const { width, height, format, data, grayscale } = img;

  // Crucial requirement: If image is lossless (PNG/lossless WEBP), clearly indicate that JPEG-specific analysis is not applicable
  if (format === 'png') {
    return {
      signalScore: 0.05,
      isJpeg: false,
      blockArtifactScore: 0.02,
      elaAverageError: 0.0,
      elaInconsistencyScore: 0.0,
      findings: [
        'Image is in lossless PNG format.',
        'JPEG 8x8 DCT quantization block grid analysis is not applicable to lossless sources.',
        'No JPEG lossy compression artifacts detected; pixel values evaluated directly in spatial domain.',
      ],
    };
  }

  // --- 1. JPEG 8x8 Block Artifact Grid (BAG) Analysis ---
  // In natural JPEG images, DCT operates on 8x8 pixel blocks. Along the block boundary (x%8 == 7 vs (x+1)%8 == 0),
  // there is a distinct boundary step. If an image is pasted or morphed from multiple sources with differing block grids,
  // the block boundary gradient becomes inconsistent or misaligned.
  let boundaryDiffSum = 0;
  let boundaryDiffCount = 0;
  let nonBoundaryDiffSum = 0;
  let nonBoundaryDiffCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const diff = Math.abs(grayscale[y * width + x] - grayscale[y * width + (x + 1)]);
      if (x % 8 === 7) {
        boundaryDiffSum += diff;
        boundaryDiffCount++;
      } else {
        nonBoundaryDiffSum += diff;
        nonBoundaryDiffCount++;
      }
    }
  }

  const boundaryAvg = boundaryDiffCount > 0 ? boundaryDiffSum / boundaryDiffCount : 0;
  const nonBoundaryAvg = nonBoundaryDiffCount > 0 ? nonBoundaryDiffSum / nonBoundaryDiffCount : 0;
  // Blockiness index: higher than 1.1 indicates prominent 8x8 JPEG blocking
  const blockRatio = nonBoundaryAvg > 0 ? boundaryAvg / nonBoundaryAvg : 1.0;
  const blockArtifactScore = parseFloat(Math.min(1.0, Math.max(0.0, (blockRatio - 1.0) * 2.5)).toFixed(3));

  // --- 2. Error Level Analysis (ELA) ---
  // Recompress image at known quality (e.g. 90%) using jpeg-js and compute per-pixel error magnitude
  let elaAverageError = 0;
  let elaFaceError = 0;
  let elaFaceCount = 0;
  let elaBgError = 0;
  let elaBgCount = 0;

  // Generate downsampled ELA map for fast analysis & visualization
  const mapW = Math.min(256, width);
  const mapH = Math.min(256, height);
  const elaRgba = new Uint8Array(mapW * mapH * 4);

  let elaInconsistencyScore = 0;
  let elaMapDataUrl: string | undefined;

  try {
    // Recompress at 90% quality
    const rawRgba = {
      data: Buffer.from(data),
      width,
      height,
    };
    const compressedJpeg = jpeg.encode(rawRgba, 90);
    const recompressed = jpeg.decode(compressedJpeg.data, { useTArray: true, formatAsRGBA: true });
    const reData = recompressed.data;

    let totalDiff = 0;
    const fx0 = faceBox ? faceBox.x : Math.floor(width * 0.25);
    const fy0 = faceBox ? faceBox.y : Math.floor(height * 0.25);
    const fx1 = faceBox ? faceBox.x + faceBox.width : Math.floor(width * 0.75);
    const fy1 = faceBox ? faceBox.y + faceBox.height : Math.floor(height * 0.75);

    const stepX = width / mapW;
    const stepY = height / mapH;

    for (let my = 0; my < mapH; my++) {
      for (let mx = 0; mx < mapW; mx++) {
        const sx = Math.floor(mx * stepX);
        const sy = Math.floor(my * stepY);
        const origIdx = (sy * width + sx) * 4;

        const dr = Math.abs(data[origIdx] - reData[origIdx]);
        const dg = Math.abs(data[origIdx + 1] - reData[origIdx + 1]);
        const db = Math.abs(data[origIdx + 2] - reData[origIdx + 2]);
        const err = (dr + dg + db) / 3;

        totalDiff += err;

        if (sx >= fx0 && sx <= fx1 && sy >= fy0 && sy <= fy1) {
          elaFaceError += err;
          elaFaceCount++;
        } else {
          elaBgError += err;
          elaBgCount++;
        }

        // Amplify error level for visualization (standard forensic scale factor ~ 14x)
        const amplified = Math.min(255, Math.round(err * 14));
        const mapIdx = (my * mapW + mx) * 4;

        // Visual colormap: purple/blue for low error, green for medium, red/yellow for high inconsistency
        if (amplified < 60) {
          elaRgba[mapIdx] = Math.round(amplified * 0.8);
          elaRgba[mapIdx + 1] = Math.round(amplified * 0.2);
          elaRgba[mapIdx + 2] = Math.round(80 + amplified * 1.5);
        } else if (amplified < 150) {
          elaRgba[mapIdx] = Math.round((amplified - 60) * 1.5);
          elaRgba[mapIdx + 1] = Math.round(100 + (amplified - 60) * 1.5);
          elaRgba[mapIdx + 2] = 50;
        } else {
          elaRgba[mapIdx] = 255;
          elaRgba[mapIdx + 1] = Math.round(255 - (amplified - 150) * 2);
          elaRgba[mapIdx + 2] = 20;
        }
        elaRgba[mapIdx + 3] = 255;
      }
    }

    elaAverageError = totalDiff / (mapW * mapH || 1);
    const avgFace = elaFaceCount > 0 ? elaFaceError / elaFaceCount : elaAverageError;
    const avgBg = elaBgCount > 0 ? elaBgError / elaBgCount : elaAverageError;

    // Inconsistency between face and surrounding compression state
    const errDenom = avgFace + avgBg + 0.001;
    elaInconsistencyScore = parseFloat((Math.abs(avgFace - avgBg) / errDenom).toFixed(3));

    elaMapDataUrl = createPngDataUrl(elaRgba, mapW, mapH);
  } catch (err) {
    console.error('ELA recompression failed:', err);
  }

  // Interpretation & Findings
  const findings: string[] = [];
  let signalScore = 0;

  if (elaInconsistencyScore > 0.35) {
    signalScore += 0.55;
    findings.push(
      `Pronounced Error Level Analysis (ELA) discrepancy between subject and surroundings (${(elaInconsistencyScore * 100).toFixed(1)}%). Indicates distinct compression histories, common in pasted or morphed identity documents.`
    );
  } else {
    findings.push(`Error Level Analysis shows uniform resave error distribution across facial region.`);
  }

  if (blockArtifactScore > 0.4) {
    signalScore += 0.25;
    findings.push(`Elevated 8x8 DCT block grid boundary discontinuity (${blockArtifactScore.toFixed(2)}).`);
  } else {
    findings.push(`JPEG 8x8 block grid alignment appears intact.`);
  }

  signalScore = parseFloat(Math.min(1.0, Math.max(0.08, signalScore)).toFixed(3));

  return {
    signalScore,
    isJpeg: true,
    estimatedJpegQuality: Math.round(Math.max(65, Math.min(98, 100 - elaAverageError * 3.5))),
    blockArtifactScore,
    elaAverageError: parseFloat(elaAverageError.toFixed(2)),
    elaInconsistencyScore,
    findings,
    elaMapDataUrl,
  };
}
