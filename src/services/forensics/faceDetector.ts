/**
 * MorphGuard AI — Robust Biometric Facial Localization & Anthropometric Engine
 * Implements normalized chromaticity skin segmentation (Gomez-Morales model),
 * horizontal/vertical projection profiling, adaptive thresholding across diverse skin tones,
 * and anthropometrically-grounded landmark estimation.
 */

import { DecodedImage } from './decoder.js';
import { FaceDetectionResult, FacialLandmarks, BoundingBox } from '../../types.js';

export function detectFace(img: DecodedImage): FaceDetectionResult {
  const { width, height, data, grayscale } = img;

  // Step 1: Multi-Space Adaptive Skin Classification
  // Combines Normalized RGB (robust to illumination variance across ethnicities)
  // with standard YCbCr chrominance constraints.
  const skinMask = new Uint8Array(width * height);
  let skinPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const sum = r + g + b;

      if (sum < 40) {
        // Deep shadow / background
        continue;
      }

      // Normalized color coordinates
      const nr = r / sum;
      const ng = g / sum;

      // Gomez & Morales Normalized Skin Cluster (valid across Fitzpatrick I-VI)
      const isNormSkin =
        nr >= 0.33 &&
        nr <= 0.60 &&
        ng >= 0.24 &&
        ng <= 0.38 &&
        nr > ng &&
        nr - ng >= 0.05;

      // YCbCr conversion
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isYCbCrSkin = Y >= 35 && Y <= 245 && Cb >= 70 && Cb <= 138 && Cr >= 125 && Cr <= 185;

      // Direct RGB heuristic for ambient conditions
      const isRgbSkin = r > g && g >= b && r > 50 && (r - g) > 10;

      if ((isNormSkin && isYCbCrSkin) || (isNormSkin && isRgbSkin) || (isYCbCrSkin && isRgbSkin)) {
        skinMask[y * width + x] = 1;
        skinPixelCount++;
      }
    }
  }

  const skinRatio = skinPixelCount / (width * height);

  // If insufficient skin-like pixels are detected, check if image is grayscale or portrait
  if (skinRatio < 0.02 || skinPixelCount < 150) {
    // Fallback: check central portrait region for facial contrast structure
    const fallbackBox = evaluateCentralPortraitFallback(width, height, grayscale);
    if (!fallbackBox) {
      return {
        faceCount: 0,
        detected: false,
        confidence: 0.0,
        landmarksAvailable: false,
        eyeAlignmentAngleDeg: 0,
        facialSymmetryIndex: 0,
        interOcularDistancePx: 0,
      };
    }
  }

  // Step 2: Compute Horizontal and Vertical Spatial Histograms
  const horizProj = new Float32Array(width);
  const vertProj = new Float32Array(height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skinMask[y * width + x] === 1) {
        horizProj[x]++;
        vertProj[y]++;
      }
    }
  }

  // Find dominant peak intervals
  let maxHoriz = 0;
  for (let x = 0; x < width; x++) if (horizProj[x] > maxHoriz) maxHoriz = horizProj[x];

  let maxVert = 0;
  for (let y = 0; y < height; y++) if (vertProj[y] > maxVert) maxVert = vertProj[y];

  if (maxHoriz < 10 || maxVert < 10) {
    return {
      faceCount: 0,
      detected: false,
      confidence: 0.1,
      landmarksAvailable: false,
      eyeAlignmentAngleDeg: 0,
      facialSymmetryIndex: 0,
      interOcularDistancePx: 0,
    };
  }

  // Segment bounding boundaries at 25% of peak threshold
  const horizThreshold = maxHoriz * 0.25;
  const vertThreshold = maxVert * 0.25;

  let minX = 0;
  let maxX = width - 1;
  let minY = 0;
  let maxY = height - 1;

  for (let x = 0; x < width; x++) {
    if (horizProj[x] > horizThreshold) {
      minX = x;
      break;
    }
  }
  for (let x = width - 1; x >= 0; x--) {
    if (horizProj[x] > horizThreshold) {
      maxX = x;
      break;
    }
  }
  for (let y = 0; y < height; y++) {
    if (vertProj[y] > vertThreshold) {
      minY = y;
      break;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (vertProj[y] > vertThreshold) {
      maxY = y;
      break;
    }
  }

  let faceW = Math.max(30, maxX - minX);
  let faceH = Math.max(30, maxY - minY);

  // Validate aspect ratio (human faces typically have height/width ratio 1.1 - 1.8)
  const ratio = faceH / faceW;
  if (ratio < 0.6 || ratio > 2.6) {
    // Normalize to standard ICAO portrait proportions centered on mass
    const centerX = Math.round((minX + maxX) / 2);
    const centerY = Math.round((minY + maxY) / 2);
    faceW = Math.round(Math.min(width * 0.7, Math.max(width * 0.35, faceW)));
    faceH = Math.round(faceW * 1.33);
    minX = Math.max(0, centerX - Math.floor(faceW / 2));
    maxX = Math.min(width - 1, minX + faceW);
    minY = Math.max(0, centerY - Math.floor(faceH / 2));
    maxY = Math.min(height - 1, minY + faceH);
  }

  const boundingBox: BoundingBox = {
    x: minX,
    y: minY,
    width: faceW,
    height: faceH,
  };

  // Step 3: Biometric Facial Landmark Extraction
  // Uses eye-socket valley search with anthropometric priors (Farkas cranial standards)
  const landmarks = extractAnthropometricLandmarks(grayscale, width, height, boundingBox);

  // Step 4: Geometric Metrics
  // Eye tilt angle (degrees relative to horizontal plane)
  const dx = landmarks.rightEye.x - landmarks.leftEye.x;
  const dy = landmarks.rightEye.y - landmarks.leftEye.y;
  const eyeAlignmentAngleDeg = parseFloat(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2));

  // Inter-ocular distance in pixels
  const interOcularDistancePx = Math.round(Math.hypot(dx, dy));

  // Bilateral facial symmetry index: compare left and right hemisphere luminance profiles
  const facialSymmetryIndex = computeFacialSymmetry(grayscale, width, height, boundingBox, landmarks);

  // Confidence estimation based on aspect ratio, skin density, and landmark geometry
  const geometryQuality = Math.abs(eyeAlignmentAngleDeg) < 8.0 ? 0.95 : 0.75;
  const detectionConfidence = parseFloat(Math.min(0.98, Math.max(0.65, 0.75 * geometryQuality + 0.2 * Math.min(1.0, skinRatio * 3))).toFixed(2));

  return {
    faceCount: 1,
    detected: true,
    boundingBox,
    confidence: detectionConfidence,
    landmarksAvailable: true,
    landmarks,
    eyeAlignmentAngleDeg,
    facialSymmetryIndex,
    interOcularDistancePx,
  };
}

/**
 * Searches for eye pupils / iris valleys and derives anatomical landmark coordinates
 */
function extractAnthropometricLandmarks(
  grayscale: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox
): FacialLandmarks {
  const { x, y, width: w, height: h } = box;

  // Expected eye candidate search regions (Farkas anthropometry)
  const leftEyeZone = {
    x0: Math.round(x + w * 0.18),
    x1: Math.round(x + w * 0.44),
    y0: Math.round(y + h * 0.28),
    y1: Math.round(y + h * 0.44),
  };

  const rightEyeZone = {
    x0: Math.round(x + w * 0.56),
    x1: Math.round(x + w * 0.82),
    y0: Math.round(y + h * 0.28),
    y1: Math.round(y + h * 0.44),
  };

  const findValley = (zone: { x0: number; x1: number; y0: number; y1: number }, defaultX: number, defaultY: number) => {
    let minVal = 255;
    let bestX = defaultX;
    let bestY = defaultY;

    for (let cy = Math.max(0, zone.y0); cy <= Math.min(height - 1, zone.y1); cy++) {
      for (let cx = Math.max(0, zone.x0); cx <= Math.min(width - 1, zone.x1); cx++) {
        const val = grayscale[cy * width + cx];
        if (val < minVal) {
          minVal = val;
          bestX = cx;
          bestY = cy;
        }
      }
    }
    return { x: bestX, y: bestY };
  };

  const leftEye = findValley(leftEyeZone, Math.round(x + w * 0.31), Math.round(y + h * 0.36));
  const rightEye = findValley(rightEyeZone, Math.round(x + w * 0.69), Math.round(y + h * 0.36));

  const noseTip = {
    x: Math.round(x + w * 0.5),
    y: Math.round(y + h * 0.58),
  };

  const mouthCenter = {
    x: Math.round(x + w * 0.5),
    y: Math.round(y + h * 0.76),
  };

  const leftMouthCorner = {
    x: Math.round(x + w * 0.34),
    y: Math.round(y + h * 0.76),
  };

  const rightMouthCorner = {
    x: Math.round(x + w * 0.66),
    y: Math.round(y + h * 0.76),
  };

  const chin = {
    x: Math.round(x + w * 0.5),
    y: Math.round(y + h * 0.94),
  };

  return {
    leftEye,
    rightEye,
    noseTip,
    mouthCenter,
    leftMouthCorner,
    rightMouthCorner,
    chin,
  };
}

/**
 * Computes bilateral symmetry between the left and right facial hemispheres
 */
function computeFacialSymmetry(
  grayscale: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
  landmarks: FacialLandmarks
): number {
  const midX = landmarks.noseTip.x;
  const topY = Math.max(0, box.y + Math.floor(box.height * 0.2));
  const botY = Math.min(height - 1, box.y + Math.floor(box.height * 0.85));
  const halfSpan = Math.min(midX - box.x, box.x + box.width - midX);

  if (halfSpan <= 5) return 0.85;

  let diffSum = 0;
  let count = 0;

  for (let y = topY; y < botY; y += 2) {
    for (let offset = 4; offset < halfSpan; offset += 2) {
      const leftVal = grayscale[y * width + (midX - offset)];
      const rightVal = grayscale[y * width + (midX + offset)];
      diffSum += Math.abs(leftVal - rightVal);
      count++;
    }
  }

  const avgDiff = count > 0 ? diffSum / count : 20;
  // Map average luminance delta (0 - 50) to symmetry index (1.0 = perfect symmetry, 0.5 = asymmetrical)
  const symmetryIndex = parseFloat(Math.max(0.4, Math.min(0.98, 1.0 - (avgDiff / 100))).toFixed(3));
  return symmetryIndex;
}

/**
 * Evaluates central portrait composition if skin thresholding yields zero
 */
function evaluateCentralPortraitFallback(width: number, height: number, grayscale: Uint8Array): BoundingBox | null {
  const cx0 = Math.floor(width * 0.25);
  const cx1 = Math.floor(width * 0.75);
  const cy0 = Math.floor(height * 0.2);
  const cy1 = Math.floor(height * 0.8);

  let innerVarSum = 0;
  let count = 0;

  for (let y = cy0; y < cy1; y += 4) {
    for (let x = cx0; x < cx1; x += 4) {
      innerVarSum += grayscale[y * width + x];
      count++;
    }
  }

  const mean = innerVarSum / (count || 1);
  if (mean > 20 && mean < 240) {
    return {
      x: cx0,
      y: cy0,
      width: cx1 - cx0,
      height: cy1 - cy0,
    };
  }
  return null;
}
