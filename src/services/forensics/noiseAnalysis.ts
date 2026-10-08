/**
 * MorphGuard AI — Noise Forensics Engine
 * Computes high-pass noise residuals, local variance, and inter-region noise consistency.
 */

import { DecodedImage, createPngDataUrl } from './decoder.js';
import { BoundingBox, NoiseAnalysisResult } from '../../types.js';

export function analyzeNoise(img: DecodedImage, faceBox?: BoundingBox): NoiseAnalysisResult {
  const { width, height, grayscale } = img;

  // Step 1: Extract noise residual using 3x3 Laplacian high-pass filter:
  // [ 0  -1   0 ]
  // [-1   4  -1 ]
  // [ 0  -1   0 ]
  const residual = new Float32Array(width * height);
  let globalSum = 0;
  let globalSqSum = 0;
  let globalCount = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = grayscale[y * width + x];
      const top = grayscale[(y - 1) * width + x];
      const bottom = grayscale[(y + 1) * width + x];
      const left = grayscale[y * width + (x - 1)];
      const right = grayscale[y * width + (x + 1)];

      const resVal = 4 * center - (top + bottom + left + right);
      residual[y * width + x] = resVal;

      globalSum += resVal;
      globalSqSum += resVal * resVal;
      globalCount++;
    }
  }

  const globalMean = globalSum / (globalCount || 1);
  const globalNoiseStdDev = Math.sqrt(Math.max(0, globalSqSum / (globalCount || 1) - globalMean * globalMean));

  // Step 2: Regional Noise Statistics (Face interior vs Background)
  const fx0 = faceBox ? Math.max(1, faceBox.x + Math.floor(faceBox.width * 0.15)) : Math.floor(width * 0.3);
  const fy0 = faceBox ? Math.max(1, faceBox.y + Math.floor(faceBox.height * 0.15)) : Math.floor(height * 0.3);
  const fx1 = faceBox ? Math.min(width - 2, faceBox.x + Math.floor(faceBox.width * 0.85)) : Math.floor(width * 0.7);
  const fy1 = faceBox ? Math.min(height - 2, faceBox.y + Math.floor(faceBox.height * 0.85)) : Math.floor(height * 0.7);

  let faceSum = 0;
  let faceSqSum = 0;
  let faceCount = 0;

  let bgSum = 0;
  let bgSqSum = 0;
  let bgCount = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const val = residual[y * width + x];
      const inFace = x >= fx0 && x <= fx1 && y >= fy0 && y <= fy1;

      if (inFace) {
        faceSum += val;
        faceSqSum += val * val;
        faceCount++;
      } else if (
        !faceBox ||
        x < faceBox.x - 10 ||
        x > faceBox.x + faceBox.width + 10 ||
        y < faceBox.y - 10 ||
        y > faceBox.y + faceBox.height + 10
      ) {
        bgSum += val;
        bgSqSum += val * val;
        bgCount++;
      }
    }
  }

  const faceMean = faceSum / (faceCount || 1);
  const faceNoiseStdDev = Math.sqrt(Math.max(0, faceSqSum / (faceCount || 1) - faceMean * faceMean));

  const bgMean = bgSum / (bgCount || 1);
  const bgNoiseStdDev = Math.sqrt(Math.max(0, bgSqSum / (bgCount || 1) - bgMean * bgMean));

  // Step 3: Regional Noise Inconsistency Ratio
  // Ratio = |face_noise - bg_noise| / (face_noise + bg_noise + 1e-4)
  const denom = faceNoiseStdDev + bgNoiseStdDev + 0.0001;
  const noiseInconsistencyRatio = parseFloat((Math.abs(faceNoiseStdDev - bgNoiseStdDev) / denom).toFixed(3));

  const isNoiseUniform = noiseInconsistencyRatio < 0.28;

  // Step 4: Generate Visual Noise Residual Map (Downsampled for speed & high visual contrast)
  // We amplify the residual (absolute deviation * 4, clamped to 255)
  const mapWidth = Math.min(256, width);
  const mapHeight = Math.min(256, height);
  const mapRgba = new Uint8Array(mapWidth * mapHeight * 4);

  const stepX = width / mapWidth;
  const stepY = height / mapHeight;

  for (let my = 0; my < mapHeight; my++) {
    for (let mx = 0; mx < mapWidth; mx++) {
      const srcX = Math.floor(mx * stepX);
      const srcY = Math.floor(my * stepY);
      const res = Math.abs(residual[srcY * width + srcX]);

      // Normalize into high-visibility forensic thermal/gray map
      const intensity = Math.min(255, Math.round(res * 5.5));
      const idx = (my * mapWidth + mx) * 4;

      // Forensic blue-to-white or gray
      mapRgba[idx] = intensity; // R
      mapRgba[idx + 1] = intensity; // G
      mapRgba[idx + 2] = Math.min(255, intensity + 30); // B (subtle cold tint)
      mapRgba[idx + 3] = 255; // Alpha
    }
  }

  let residualMapDataUrl: string | undefined;
  try {
    residualMapDataUrl = createPngDataUrl(mapRgba, mapWidth, mapHeight);
  } catch (err) {
    console.error('Failed to create noise residual map image:', err);
  }

  // Step 5: Interpretation & Findings
  const findings: string[] = [];
  let signalScore = 0;

  if (noiseInconsistencyRatio > 0.45) {
    signalScore = 0.85;
    findings.push(
      `Severe regional noise divergence (${(noiseInconsistencyRatio * 100).toFixed(1)}%). Face region noise (${faceNoiseStdDev.toFixed(1)}) conflicts significantly with background sensor profile (${bgNoiseStdDev.toFixed(1)}).`
    );
  } else if (noiseInconsistencyRatio > 0.28) {
    signalScore = 0.55;
    findings.push(
      `Moderate noise variance discrepancy between subject and surroundings (${(noiseInconsistencyRatio * 100).toFixed(1)}%). May indicate multi-source composition or localized post-processing.`
    );
  } else {
    signalScore = 0.12;
    findings.push(
      `Consistent sensor noise residual distribution (${(noiseInconsistencyRatio * 100).toFixed(1)}% variance). No significant splicing mismatch detected.`
    );
  }

  return {
    signalScore: parseFloat(signalScore.toFixed(3)),
    globalNoiseStdDev: parseFloat(globalNoiseStdDev.toFixed(2)),
    faceInteriorNoiseStdDev: parseFloat(faceNoiseStdDev.toFixed(2)),
    backgroundNoiseStdDev: parseFloat(bgNoiseStdDev.toFixed(2)),
    noiseInconsistencyRatio,
    isNoiseUniform,
    findings,
    residualMapDataUrl,
  };
}
