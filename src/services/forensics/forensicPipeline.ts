/**
 * MorphGuard AI — Master Forensic Analysis Pipeline
 * Executes end-to-end multimodal forensics with verifiable mathematics.
 */

import { validateFileSignature } from './crypto.js';
import { decodeImage } from './decoder.js';
import { detectFace } from './faceDetector.js';
import { analyzeTexture } from './textureAnalysis.js';
import { analyzeNoise } from './noiseAnalysis.js';
import { analyzeFrequency } from './frequencyAnalysis.js';
import { analyzeCompression } from './compressionAnalysis.js';
import { analyzeGeometry } from './geometryAnalysis.js';
import { analyzeColor, analyzeEdges } from './colorEdgeAnalysis.js';
import { analyzeMetadata } from './metadataAnalysis.js';
import { fuseForensicSignals } from './fusionEngine.js';
import { ForensicAnalysisResults, ImageQualityMetrics } from '../../types.js';

export interface PipelineExecutionOptions {
  filename?: string;
  selectedFaceIndex?: number;
}

export function computeImageQuality(
  buffer: Buffer,
  format: string,
  mimeType: string,
  width: number,
  height: number,
  grayscale: Uint8Array
): ImageQualityMetrics {
  const totalPixels = width * height;

  // 1. Mean luminance & contrast (standard deviation)
  let sumLuma = 0;
  let sumSqLuma = 0;
  let shadowCount = 0;
  let highlightCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const y = grayscale[i];
    sumLuma += y;
    sumSqLuma += y * y;
    if (y < 15) shadowCount++;
    if (y > 245) highlightCount++;
  }

  const meanLuminance = sumLuma / (totalPixels || 1);
  const contrastStdDev = Math.sqrt(Math.max(0, sumSqLuma / (totalPixels || 1) - meanLuminance * meanLuminance));

  // 2. Sharpness via Laplacian Variance (standard computer vision focus metric)
  let lapSum = 0;
  let lapSqSum = 0;
  let lapCount = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const center = grayscale[y * width + x];
      const top = grayscale[(y - 1) * width + x];
      const bottom = grayscale[(y + 1) * width + x];
      const left = grayscale[y * width + (x - 1)];
      const right = grayscale[y * width + (x + 1)];

      const lap = 4 * center - (top + bottom + left + right);
      lapSum += lap;
      lapSqSum += lap * lap;
      lapCount++;
    }
  }

  const lapMean = lapSum / (lapCount || 1);
  const sharpnessLaplacianVar = Math.max(0, lapSqSum / (lapCount || 1) - lapMean * lapMean);

  const isBlurry = sharpnessLaplacianVar < 45;
  const isLowResolution = width < 200 || height < 200;
  const isUnderexposed = shadowCount / totalPixels > 0.4 || meanLuminance < 40;
  const isOverexposed = highlightCount / totalPixels > 0.4 || meanLuminance > 220;

  return {
    width,
    height,
    megapixels: parseFloat(((width * height) / 1000000).toFixed(2)),
    format,
    mimeType,
    fileSizeBytes: buffer.length,
    meanLuminance: parseFloat(meanLuminance.toFixed(1)),
    contrastStdDev: parseFloat(contrastStdDev.toFixed(1)),
    sharpnessLaplacianVar: parseFloat(sharpnessLaplacianVar.toFixed(1)),
    isBlurry,
    isLowResolution,
    isUnderexposed,
    isOverexposed,
  };
}

export async function runForensicPipeline(
  imageBuffer: Buffer,
  options: PipelineExecutionOptions = {}
): Promise<{
  sha256: string;
  results: ForensicAnalysisResults;
  executionTimeMs: number;
}> {
  const startTime = Date.now();

  // Step 1: Validate file signature & compute cryptographic SHA-256
  const fileValidation = validateFileSignature(imageBuffer);
  if (!fileValidation.valid) {
    throw new Error(fileValidation.error || 'Invalid or unverified image file format.');
  }

  // Step 2: Decode image buffer into raw pixels
  const decoded = decodeImage(imageBuffer, fileValidation.format as 'jpeg' | 'png' | 'webp');

  // Step 3: Extract image quality metrics & sharpness
  const quality = computeImageQuality(
    imageBuffer,
    fileValidation.format,
    fileValidation.mimeType,
    decoded.width,
    decoded.height,
    decoded.grayscale
  );

  // Step 4: Face Detection & Biometric Landmark Localization
  const faceDetection = detectFace(decoded);

  // Step 5: Texture Forensics (LBP & GLCM)
  const texture = analyzeTexture(decoded, faceDetection.boundingBox);

  // Step 6: Noise Residual & Sensor Inconsistency Forensics
  const noise = analyzeNoise(decoded, faceDetection.boundingBox);

  // Step 7: Frequency-Domain (2D FFT & 2D DCT) Forensics
  const frequency = analyzeFrequency(decoded, faceDetection.boundingBox);

  // Step 8: Compression & Error Level Analysis (ELA)
  const compression = analyzeCompression(decoded, faceDetection.boundingBox);

  // Step 9: Geometry & Facial Symmetry Forensics
  const geometry = analyzeGeometry(faceDetection);

  // Step 10: Color & Edge Boundary Discontinuity Forensics
  const color = analyzeColor(decoded, faceDetection.boundingBox);
  const edge = analyzeEdges(decoded, faceDetection.boundingBox);

  // Step 11: Metadata & Provenance Extraction
  const metadata = analyzeMetadata(imageBuffer);

  // Step 12: Multimodal Feature Fusion, Inconclusive Evaluation, & Heatmap Synthesis
  const results = fuseForensicSignals(
    decoded,
    quality,
    faceDetection,
    texture,
    noise,
    frequency,
    compression,
    geometry,
    color,
    edge,
    metadata
  );

  const executionTimeMs = Date.now() - startTime;

  return {
    sha256: fileValidation.sha256,
    results,
    executionTimeMs,
  };
}
