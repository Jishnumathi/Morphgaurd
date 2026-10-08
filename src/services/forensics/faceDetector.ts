/**
 * MorphGuard AI — Facial Region & Landmark Detection Engine
 * Performs biometric face localization, skin-luma segmentation,
 * landmark candidate locating, and facial symmetry extraction.
 */

import { DecodedImage } from './decoder.js';
import { FaceDetectionResult, FacialLandmarks } from '../../types.js';

export function detectFace(img: DecodedImage): FaceDetectionResult {
  const { width, height, data, grayscale } = img;

  // Step 1: Detect skin-colored pixels in YCbCr & RGB space
  // Standard Kovac skin model: R > 95, G > 40, B > 20, max(R,G,B) - min(R,G,B) > 15, |R - G| > 15, R > G, R > B
  // YCbCr: Y in [80, 240], Cb in [77, 127], Cr in [133, 173]
  const skinMask = new Uint8Array(width * height);
  let totalSkinPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // YCbCr conversion
      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isRgbSkin = r > 70 && g > 35 && b > 20 && Math.abs(r - g) > 12 && r > g && r > b;
      const isYCbCrSkin = Y > 50 && Y < 240 && Cb >= 75 && Cb <= 135 && Cr >= 130 && Cr <= 180;

      if (isRgbSkin || isYCbCrSkin) {
        skinMask[y * width + x] = 1;
        totalSkinPixels++;
      }
    }
  }

  const skinRatio = totalSkinPixels / (width * height);

  // If skin pixel density is negligible, no face is present
  if (skinRatio < 0.03 || totalSkinPixels < 200) {
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

  // Step 2: Find connected skin bounding box (center-weighted to avoid background hands/shoulders)
  // Compute horizontal and vertical skin projections
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

  // Find dominant peak intervals (face region)
  const maxHoriz = Math.max(...horizProj);
  const maxVert = Math.max(...vertProj);

  if (maxHoriz < 15 || maxVert < 15) {
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

  // Find face bounds with threshold (30% of peak)
  let minX = 0;
  let maxX = width - 1;
  let minY = 0;
  let maxY = height - 1;

  for (let x = 0; x < width; x++) {
    if (horizProj[x] > maxHoriz * 0.3) {
      minX = x;
      break;
    }
  }
  for (let x = width - 1; x >= 0; x--) {
    if (horizProj[x] > maxHoriz * 0.3) {
      maxX = x;
      break;
    }
  }
  for (let y = 0; y < height; y++) {
    if (vertProj[y] > maxVert * 0.3) {
      minY = y;
      break;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (vertProj[y] > maxVert * 0.3) {
      maxY = y;
      break;
    }
  }

  const faceW = Math.max(20, maxX - minX);
  const faceH = Math.max(20, maxY - minY);

  // Validate face aspect ratio (faces typically have height/width ratio between 1.0 and 1.8)
  const aspectRatio = faceH / faceW;
  if (aspectRatio < 0.6 || aspectRatio > 2.8) {
    return {
      faceCount: 0,
      detected: false,
      confidence: 0.2,
      landmarksAvailable: false,
      eyeAlignmentAngleDeg: 0,
      facialSymmetryIndex: 0,
      interOcularDistancePx: 0,
    };
  }

  // Step 3: Biometric Landmark Extraction in face ROI
  // Expected biometric zones relative to face bounding box:
  // Eyes: y in [0.28 * faceH, 0.45 * faceH], left eye x in [0.18 * faceW, 0.42 * faceW], right eye x in [0.58 * faceW, 0.82 * faceW]
  // Nose: y in [0.45 * faceH, 0.65 * faceH], x in [0.40 * faceW, 0.60 * faceW]
  // Mouth: y in [0.65 * faceH, 0.85 * faceH], x in [0.30 * faceW, 0.70 * faceW]

  // Find darkest local clusters in eye zones (pupils / iris)
  const findDarkestPoint = (x0: number, x1: number, y0: number, y1: number) => {
    let minVal = 256;
    let bestX = Math.round((x0 + x1) / 2);
    let bestY = Math.round((y0 + y1) / 2);

    for (let y = Math.max(0, y0); y <= Math.min(height - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(width - 1, x1); x++) {
        const val = grayscale[y * width + x];
        if (val < minVal) {
          minVal = val;
          bestX = x;
          bestY = y;
        }
      }
    }
    return { x: bestX, y: bestY };
  };

  const leftEyeZone = {
    x0: Math.round(minX + faceW * 0.18),
    x1: Math.round(minX + faceW * 0.42),
    y0: Math.round(minY + faceH * 0.28),
    y1: Math.round(minY + faceH * 0.45),
  };

  const rightEyeZone = {
    x0: Math.round(minX + faceW * 0.58),
    x1: Math.round(minX + faceW * 0.82),
    y0: Math.round(minY + faceH * 0.28),
    y1: Math.round(minY + faceH * 0.45),
  };

  const leftEye = findDarkestPoint(leftEyeZone.x0, leftEyeZone.x1, leftEyeZone.y0, leftEyeZone.y1);
  const rightEye = findDarkestPoint(rightEyeZone.x0, rightEyeZone.x1, rightEyeZone.y0, rightEyeZone.y1);

  const noseTip = {
    x: Math.round(minX + faceW * 0.5),
    y: Math.round(minY + faceH * 0.55),
  };

  const mouthCenter = {
    x: Math.round(minX + faceW * 0.5),
    y: Math.round(minY + faceH * 0.76),
  };

  const leftMouthCorner = {
    x: Math.round(minX + faceW * 0.35),
    y: Math.round(minY + faceH * 0.76),
  };

  const rightMouthCorner = {
    x: Math.round(minX + faceW * 0.65),
    y: Math.round(minY + faceH * 0.76),
  };

  const chin = {
    x: Math.round(minX + faceW * 0.5),
    y: Math.round(minY + faceH * 0.95),
  };

  const landmarks: FacialLandmarks = {
    leftEye,
    rightEye,
    noseTip,
    mouthCenter,
    leftMouthCorner,
    rightMouthCorner,
    chin,
  };

  // Step 4: Biometric Metrics Calculation
  const deltaX = rightEye.x - leftEye.x;
  const deltaY = rightEye.y - leftEye.y;
  const interOcularDistancePx = Math.round(Math.sqrt(deltaX * deltaX + deltaY * deltaY));
  const eyeAlignmentAngleDeg = parseFloat(((Math.atan2(deltaY, deltaX) * 180) / Math.PI).toFixed(2));

  // Facial Symmetry Index (comparing left hemisphere to right hemisphere around central vertical axis)
  const midX = Math.round(minX + faceW / 2);
  let diffSum = 0;
  let sampleCount = 0;

  for (let y = minY; y < maxY; y += 4) {
    for (let dx = 4; dx < faceW / 2 - 4; dx += 4) {
      const leftPixel = grayscale[y * width + (midX - dx)];
      const rightPixel = grayscale[y * width + (midX + dx)];
      if (leftPixel !== undefined && rightPixel !== undefined) {
        diffSum += Math.abs(leftPixel - rightPixel);
        sampleCount++;
      }
    }
  }

  const avgDiff = sampleCount > 0 ? diffSum / sampleCount : 30;
  // Normalized symmetry score between 0.0 (distorted) and 1.0 (ideal symmetry)
  const facialSymmetryIndex = parseFloat(Math.max(0.1, Math.min(1.0, 1.0 - avgDiff / 100)).toFixed(3));

  // Compute confidence based on bounding box size and symmetry
  const sizeFactor = Math.min(1.0, (faceW * faceH) / (120 * 120));
  const confidence = parseFloat((0.75 + 0.2 * sizeFactor + 0.05 * facialSymmetryIndex).toFixed(2));

  return {
    faceCount: 1,
    detected: true,
    boundingBox: {
      x: minX,
      y: minY,
      width: faceW,
      height: faceH,
    },
    confidence,
    landmarksAvailable: true,
    landmarks,
    eyeAlignmentAngleDeg,
    facialSymmetryIndex,
    interOcularDistancePx,
  };
}
