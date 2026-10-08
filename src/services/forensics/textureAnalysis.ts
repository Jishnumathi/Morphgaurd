/**
 * MorphGuard AI — Texture Forensics Engine
 * Implements Local Binary Pattern (LBP) & Gray-Level Co-occurrence Matrix (GLCM)
 * Detects synthetic smoothing, micro-pore loss, and blending boundaries.
 */

import { DecodedImage } from './decoder.js';
import { BoundingBox, TextureAnalysisResult } from '../../types.js';

export function analyzeTexture(img: DecodedImage, faceBox?: BoundingBox): TextureAnalysisResult {
  const { width, height, grayscale } = img;

  // Define region of interest (face or central patch)
  const x0 = faceBox ? Math.max(1, faceBox.x) : Math.max(1, Math.floor(width * 0.2));
  const y0 = faceBox ? Math.max(1, faceBox.y) : Math.max(1, Math.floor(height * 0.2));
  const x1 = faceBox ? Math.min(width - 2, faceBox.x + faceBox.width) : Math.min(width - 2, Math.floor(width * 0.8));
  const y1 = faceBox ? Math.min(height - 2, faceBox.y + faceBox.height) : Math.min(height - 2, Math.floor(height * 0.8));

  // --- 1. Local Binary Pattern (LBP) ---
  // Standard 8-neighborhood LBP
  const lbpHist = new Uint32Array(256);
  let totalLbpPixels = 0;
  let uniformLbpCount = 0;

  // Helper to test if an 8-bit number is uniform (has at most 2 0/1 transitions in circular sequence)
  const isUniformLbp = (code: number) => {
    let transitions = 0;
    const bits: number[] = [];
    for (let b = 0; b < 8; b++) {
      bits.push((code >> b) & 1);
    }
    for (let b = 0; b < 8; b++) {
      if (bits[b] !== bits[(b + 1) % 8]) {
        transitions++;
      }
    }
    return transitions <= 2;
  };

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const center = grayscale[y * width + x];
      let code = 0;

      // 8 neighbors: clockwise starting from top-left (-1,-1)
      if (grayscale[(y - 1) * width + (x - 1)] >= center) code |= 1 << 0;
      if (grayscale[(y - 1) * width + x] >= center) code |= 1 << 1;
      if (grayscale[(y - 1) * width + (x + 1)] >= center) code |= 1 << 2;
      if (grayscale[y * width + (x + 1)] >= center) code |= 1 << 3;
      if (grayscale[(y + 1) * width + (x + 1)] >= center) code |= 1 << 4;
      if (grayscale[(y + 1) * width + x] >= center) code |= 1 << 5;
      if (grayscale[(y + 1) * width + (x - 1)] >= center) code |= 1 << 6;
      if (grayscale[y * width + (x - 1)] >= center) code |= 1 << 7;

      lbpHist[code]++;
      totalLbpPixels++;
      if (isUniformLbp(code)) {
        uniformLbpCount++;
      }
    }
  }

  // Calculate LBP Shannon Entropy
  let lbpEntropy = 0;
  if (totalLbpPixels > 0) {
    for (let i = 0; i < 256; i++) {
      const p = lbpHist[i] / totalLbpPixels;
      if (p > 0) {
        lbpEntropy -= p * Math.log2(p);
      }
    }
  }

  const lbpUniformityRatio = totalLbpPixels > 0 ? uniformLbpCount / totalLbpPixels : 0.8;

  // --- 2. Gray-Level Co-occurrence Matrix (GLCM) ---
  // Quantize to 16 gray levels for statistical stability and robustness
  const LEVELS = 16;
  const glcm = new Float32Array(LEVELS * LEVELS);
  let totalTransitions = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1 - 1; x++) {
      const g1 = Math.min(LEVELS - 1, Math.floor((grayscale[y * width + x] / 256) * LEVELS));
      const g2 = Math.min(LEVELS - 1, Math.floor((grayscale[y * width + (x + 1)] / 256) * LEVELS));
      glcm[g1 * LEVELS + g2]++;
      totalTransitions++;
    }
  }

  // Normalize GLCM
  for (let i = 0; i < LEVELS * LEVELS; i++) {
    if (totalTransitions > 0) {
      glcm[i] /= totalTransitions;
    }
  }

  // Calculate GLCM Statistics
  let glcmContrast = 0;
  let glcmEnergy = 0;
  let glcmHomogeneity = 0;
  let meanI = 0;
  let meanJ = 0;

  for (let i = 0; i < LEVELS; i++) {
    for (let j = 0; j < LEVELS; j++) {
      const p = glcm[i * LEVELS + j];
      glcmContrast += Math.pow(i - j, 2) * p;
      glcmEnergy += p * p;
      glcmHomogeneity += p / (1 + Math.abs(i - j));
      meanI += i * p;
      meanJ += j * p;
    }
  }

  let varI = 0;
  let varJ = 0;
  let glcmCorrelation = 0;

  for (let i = 0; i < LEVELS; i++) {
    for (let j = 0; j < LEVELS; j++) {
      const p = glcm[i * LEVELS + j];
      varI += Math.pow(i - meanI, 2) * p;
      varJ += Math.pow(j - meanJ, 2) * p;
      glcmCorrelation += (i - meanI) * (j - meanJ) * p;
    }
  }

  const stdProduct = Math.sqrt(varI * varJ);
  if (stdProduct > 0.0001) {
    glcmCorrelation /= stdProduct;
  } else {
    glcmCorrelation = 1.0;
  }

  // --- 3. Forensic Anomaly Evaluation ---
  // Natural skin has rich micro-texture: LBP entropy ~ 6.8-7.7, GLCM contrast ~ 0.5-2.5.
  // Blended / morphed faces or GAN faces suffer from oversmoothed micro-texture or abnormally low contrast/entropy.
  // We evaluate micro-texture anomaly:
  let microTextureAnomaly = 0;
  const findings: string[] = [];

  // Very low entropy (< 6.2) suggests excessive blur or synthetic smoothing
  if (lbpEntropy < 6.2) {
    microTextureAnomaly += 0.35;
    findings.push(`Low LBP texture entropy (${lbpEntropy.toFixed(2)} bits), consistent with artificial smoothing or morph interpolation.`);
  } else if (lbpEntropy > 7.7) {
    microTextureAnomaly += 0.25;
    findings.push(`Elevated LBP entropy (${lbpEntropy.toFixed(2)} bits), indicating non-uniform noise or resampled grain.`);
  } else {
    findings.push(`LBP micro-texture entropy is normal (${lbpEntropy.toFixed(2)} bits).`);
  }

  // Check GLCM homogeneity & energy
  if (glcmHomogeneity > 0.88 && glcmContrast < 0.25) {
    microTextureAnomaly += 0.35;
    findings.push(`Abnormally high GLCM homogeneity (${glcmHomogeneity.toFixed(3)}) and low contrast, characteristic of synthetic blur.`);
  } else if (glcmContrast > 4.0) {
    microTextureAnomaly += 0.2;
    findings.push(`Unusual GLCM high-frequency contrast variance (${glcmContrast.toFixed(2)}).`);
  } else {
    findings.push(`GLCM co-occurrence matrix demonstrates natural gradient continuity.`);
  }

  const signalScore = parseFloat(Math.min(1.0, Math.max(0.05, microTextureAnomaly)).toFixed(3));

  return {
    signalScore,
    lbpEntropy: parseFloat(lbpEntropy.toFixed(3)),
    lbpUniformityRatio: parseFloat(lbpUniformityRatio.toFixed(3)),
    glcmContrast: parseFloat(glcmContrast.toFixed(3)),
    glcmEnergy: parseFloat(glcmEnergy.toFixed(4)),
    glcmHomogeneity: parseFloat(glcmHomogeneity.toFixed(3)),
    glcmCorrelation: parseFloat(glcmCorrelation.toFixed(3)),
    microTextureAnomaly: parseFloat(microTextureAnomaly.toFixed(3)),
    findings,
  };
}
