/**
 * MorphGuard AI — Color & Edge Forensic Engines
 * Analyzes skin color chromatic consistency, illuminant gradients,
 * and Sobel boundary transition discontinuities (jawline, hairline, neck seams).
 */

import { DecodedImage, createPngDataUrl } from './decoder.js';
import { BoundingBox, ColorAnalysisResult, EdgeAnalysisResult } from '../../types.js';

export function analyzeColor(img: DecodedImage, faceBox?: BoundingBox): ColorAnalysisResult {
  const { width, height, data } = img;
  const fx0 = faceBox ? Math.max(0, faceBox.x) : Math.floor(width * 0.25);
  const fy0 = faceBox ? Math.max(0, faceBox.y) : Math.floor(height * 0.25);
  const fx1 = faceBox ? Math.min(width, faceBox.x + faceBox.width) : Math.floor(width * 0.75);
  const fy1 = faceBox ? Math.min(height, faceBox.y + faceBox.height) : Math.floor(height * 0.75);

  let skinPixels = 0;
  let sumCb = 0;
  let sumCr = 0;
  let sumSqCb = 0;
  let sumSqCr = 0;

  // Split face into left and right halves to test bilateral illumination/chroma consistency
  const midX = Math.floor((fx0 + fx1) / 2);
  let leftCr = 0;
  let leftCount = 0;
  let rightCr = 0;
  let rightCount = 0;

  for (let y = fy0; y < fy1; y++) {
    for (let x = fx0; x < fx1; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Filter to skin zone
      if (Cb >= 70 && Cb <= 140 && Cr >= 125 && Cr <= 185) {
        skinPixels++;
        sumCb += Cb;
        sumCr += Cr;
        sumSqCb += Cb * Cb;
        sumSqCr += Cr * Cr;

        if (x < midX) {
          leftCr += Cr;
          leftCount++;
        } else {
          rightCr += Cr;
          rightCount++;
        }
      }
    }
  }

  const meanCb = sumCb / (skinPixels || 1);
  const meanCr = sumCr / (skinPixels || 1);
  const stdCb = Math.sqrt(Math.max(0, sumSqCb / (skinPixels || 1) - meanCb * meanCb));
  const stdCr = Math.sqrt(Math.max(0, sumSqCr / (skinPixels || 1) - meanCr * meanCr));

  const leftAvgCr = leftCount > 0 ? leftCr / leftCount : meanCr;
  const rightAvgCr = rightCount > 0 ? rightCr / rightCount : meanCr;
  const chromaticDiscontinuity = parseFloat((Math.abs(leftAvgCr - rightAvgCr) / (meanCr + 1e-4)).toFixed(3));

  const findings: string[] = [];
  let signalScore = 0;

  if (chromaticDiscontinuity > 0.14) {
    signalScore += 0.45;
    findings.push(
      `Bilateral chromatic discontinuity detected (${(chromaticDiscontinuity * 100).toFixed(1)}%). Differential color cast between facial halves suggests composite donor sources.`
    );
  } else {
    findings.push(`Facial chrominance is uniform across both facial hemispheres.`);
  }

  if (stdCr > 18 || stdCb > 18) {
    signalScore += 0.3;
    findings.push(`Elevated color channel variance in skin regions, possible artifacts from uneven color transfer or blending.`);
  } else {
    findings.push(`Skin-tone distribution is consistent with single-source natural illumination.`);
  }

  signalScore = parseFloat(Math.min(1.0, Math.max(0.05, signalScore)).toFixed(3));

  return {
    signalScore,
    skinRegionUniformity: parseFloat(Math.max(0, 1 - (stdCb + stdCr) / 40).toFixed(2)),
    chromaticDiscontinuity,
    illuminationGradientConsistency: parseFloat(Math.max(0, 1 - chromaticDiscontinuity * 3).toFixed(2)),
    findings,
  };
}

export function analyzeEdges(img: DecodedImage, faceBox?: BoundingBox): EdgeAnalysisResult {
  const { width, height, grayscale } = img;

  // 3x3 Sobel operator for gradient magnitude:
  // Gx = [-1 0 1, -2 0 2, -1 0 1]
  // Gy = [-1 -2 -1, 0 0 0, 1 2 1]
  const gradMag = new Float32Array(width * height);
  let totalGrad = 0;
  let boundaryGradSum = 0;
  let boundaryGradCount = 0;
  let interiorGradSum = 0;
  let interiorGradCount = 0;

  const fx0 = faceBox ? faceBox.x : Math.floor(width * 0.2);
  const fy0 = faceBox ? faceBox.y : Math.floor(height * 0.2);
  const fx1 = faceBox ? faceBox.x + faceBox.width : Math.floor(width * 0.8);
  const fy1 = faceBox ? faceBox.y + faceBox.height : Math.floor(height * 0.8);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p00 = grayscale[(y - 1) * width + (x - 1)];
      const p01 = grayscale[(y - 1) * width + x];
      const p02 = grayscale[(y - 1) * width + (x + 1)];
      const p10 = grayscale[y * width + (x - 1)];
      const p12 = grayscale[y * width + (x + 1)];
      const p20 = grayscale[(y + 1) * width + (x - 1)];
      const p21 = grayscale[(y + 1) * width + x];
      const p22 = grayscale[(y + 1) * width + (x + 1)];

      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;
      const mag = Math.sqrt(gx * gx + gy * gy);

      gradMag[y * width + x] = mag;
      totalGrad += mag;

      // Check if pixel is along the face boundary contour (within 8 pixels of perimeter)
      const nearBorder =
        (Math.abs(x - fx0) <= 8 || Math.abs(x - fx1) <= 8) && y >= fy0 && y <= fy1 ||
        (Math.abs(y - fy0) <= 8 || Math.abs(y - fy1) <= 8) && x >= fx0 && x <= fx1;

      if (nearBorder) {
        boundaryGradSum += mag;
        boundaryGradCount++;
      } else if (x > fx0 + 10 && x < fx1 - 10 && y > fy0 + 10 && y < fy1 - 10) {
        interiorGradSum += mag;
        interiorGradCount++;
      }
    }
  }

  const avgBoundaryGrad = boundaryGradCount > 0 ? boundaryGradSum / boundaryGradCount : 0;
  const avgInteriorGrad = interiorGradCount > 0 ? interiorGradSum / interiorGradCount : 0;

  // If face was pasted or cut with feathering, the boundary gradient is either unnaturally abrupt (hard splice) or abnormally suppressed (ghost blur)
  const boundaryRatio = avgInteriorGrad > 0 ? avgBoundaryGrad / avgInteriorGrad : 1.0;
  let boundaryGradientDiscontinuity = 0;
  if (boundaryRatio > 2.8) {
    // Sharp splicing halo
    boundaryGradientDiscontinuity = Math.min(1.0, (boundaryRatio - 2.8) * 0.4 + 0.3);
  } else if (boundaryRatio < 0.6) {
    // Artificial feather blur
    boundaryGradientDiscontinuity = Math.min(1.0, (0.6 - boundaryRatio) * 1.5 + 0.25);
  }

  // Generate visual edge map
  const mapW = Math.min(256, width);
  const mapH = Math.min(256, height);
  const edgeRgba = new Uint8Array(mapW * mapH * 4);

  const stepX = width / mapW;
  const stepY = height / mapH;

  for (let my = 0; my < mapH; my++) {
    for (let mx = 0; mx < mapW; mx++) {
      const sx = Math.floor(mx * stepX);
      const sy = Math.floor(my * stepY);
      const mag = gradMag[sy * width + sx];
      const intensity = Math.min(255, Math.round(mag * 0.8));
      const idx = (my * mapW + mx) * 4;

      edgeRgba[idx] = intensity;
      edgeRgba[idx + 1] = Math.min(255, Math.round(intensity * 0.9));
      edgeRgba[idx + 2] = Math.min(255, Math.round(intensity * 1.1));
      edgeRgba[idx + 3] = 255;
    }
  }

  let edgeMapDataUrl: string | undefined;
  try {
    edgeMapDataUrl = createPngDataUrl(edgeRgba, mapW, mapH);
  } catch (err) {
    console.error('Failed to create edge map image:', err);
  }

  const findings: string[] = [];
  let signalScore = 0;

  if (boundaryGradientDiscontinuity > 0.4) {
    signalScore = 0.75;
    findings.push(
      `Boundary gradient anomaly along perimeter seam (${(boundaryGradientDiscontinuity * 100).toFixed(1)}%). Indicates edge blending, feathering, or splice insertion.`
    );
  } else {
    signalScore = 0.1;
    findings.push(`Edge gradient across facial boundary demonstrates smooth, continuous anatomical transitions.`);
  }

  return {
    signalScore: parseFloat(signalScore.toFixed(3)),
    boundaryGradientDiscontinuity: parseFloat(boundaryGradientDiscontinuity.toFixed(3)),
    contourBlurAnomaly: parseFloat((boundaryRatio < 0.8 ? 0.8 - boundaryRatio : 0).toFixed(2)),
    findings,
    edgeMapDataUrl,
  };
}
