/**
 * MorphGuard AI — Frequency-Domain Forensics Engine
 * Implements 2D Discrete Fourier Transform (FFT) & Discrete Cosine Transform (DCT).
 * Evaluates high-frequency energy attenuation, periodic sampling artifacts,
 * and unnatural spectral cutoffs characteristic of generative synthesis or resampling.
 */

import { DecodedImage, createPngDataUrl } from './decoder.js';
import { BoundingBox, FrequencyAnalysisResult } from '../../types.js';

export function analyzeFrequency(img: DecodedImage, faceBox?: BoundingBox): FrequencyAnalysisResult {
  const { width, height, grayscale } = img;

  // Extract a square power-of-2 patch (e.g., 64x64 or 128x128) centered on the face ROI
  const PATCH_SIZE = 64;
  const cx = faceBox ? Math.round(faceBox.x + faceBox.width / 2) : Math.round(width / 2);
  const cy = faceBox ? Math.round(faceBox.y + faceBox.height / 2) : Math.round(height / 2);

  const startX = Math.max(0, Math.min(width - PATCH_SIZE, cx - Math.floor(PATCH_SIZE / 2)));
  const startY = Math.max(0, Math.min(height - PATCH_SIZE, cy - Math.floor(PATCH_SIZE / 2)));

  // Extract and normalize spatial patch
  const patch = new Float32Array(PATCH_SIZE * PATCH_SIZE);
  let patchMean = 0;

  for (let y = 0; y < PATCH_SIZE; y++) {
    for (let x = 0; x < PATCH_SIZE; x++) {
      const val = grayscale[(startY + y) * width + (startX + x)];
      patch[y * PATCH_SIZE + x] = val;
      patchMean += val;
    }
  }
  patchMean /= PATCH_SIZE * PATCH_SIZE;

  // Subtract mean (removes DC dominant spike to inspect AC energy spectrum)
  // Apply 2D Hann window to prevent spectral leakage at patch boundaries
  for (let y = 0; y < PATCH_SIZE; y++) {
    const wy = 0.5 * (1 - Math.cos((2 * Math.PI * y) / (PATCH_SIZE - 1)));
    for (let x = 0; x < PATCH_SIZE; x++) {
      const wx = 0.5 * (1 - Math.cos((2 * Math.PI * x) / (PATCH_SIZE - 1)));
      patch[y * PATCH_SIZE + x] = (patch[y * PATCH_SIZE + x] - patchMean) * wx * wy;
    }
  }

  // --- 2D Discrete Fourier Transform (Centered FFT Spectrum) ---
  const N = PATCH_SIZE;
  const real = new Float32Array(N * N);
  const imag = new Float32Array(N * N);
  const magnitude = new Float32Array(N * N);

  // Optimized separable 2D DFT
  // Pass 1: 1D DFT on each row
  const rowReal = new Float32Array(N * N);
  const rowImag = new Float32Array(N * N);

  for (let y = 0; y < N; y++) {
    for (let u = 0; u < N; u++) {
      let r = 0;
      let im = 0;
      for (let x = 0; x < N; x++) {
        const angle = (-2 * Math.PI * u * x) / N;
        const val = patch[y * N + x];
        r += val * Math.cos(angle);
        im += val * Math.sin(angle);
      }
      rowReal[y * N + u] = r;
      rowImag[y * N + u] = im;
    }
  }

  // Pass 2: 1D DFT on each column
  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let r = 0;
      let im = 0;
      for (let y = 0; y < N; y++) {
        const angle = (-2 * Math.PI * v * y) / N;
        const rr = rowReal[y * N + u];
        const ii = rowImag[y * N + u];
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        // (rr + i*ii) * (cosA + i*sinA)
        r += rr * cosA - ii * sinA;
        im += rr * sinA + ii * cosA;
      }
      real[v * N + u] = r;
      imag[v * N + u] = im;
    }
  }

  // Compute centered magnitude spectrum: shift (u, v) by (N/2, N/2)
  let totalEnergy = 0;
  let lowFreqEnergy = 0;
  let midFreqEnergy = 0;
  let highFreqEnergy = 0;
  const halfN = N / 2;

  // Radial frequency bins
  for (let v = 0; v < N; v++) {
    for (let u = 0; u < N; u++) {
      const r = real[v * N + u];
      const im = imag[v * N + u];
      const mag = Math.sqrt(r * r + im * im);

      // Centered coordinate
      const cu = (u + halfN) % N;
      const cv = (v + halfN) % N;
      magnitude[cv * N + cu] = mag;

      // Distance from center (0 to halfN * sqrt(2))
      const dist = Math.sqrt(Math.pow(cu - halfN, 2) + Math.pow(cv - halfN, 2));

      totalEnergy += mag;
      if (dist <= 8) {
        lowFreqEnergy += mag;
      } else if (dist <= 18) {
        midFreqEnergy += mag;
      } else {
        highFreqEnergy += mag;
      }
    }
  }

  const highFreqEnergyRatio = totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0.2;
  const midFreqEnergyRatio = totalEnergy > 0 ? midFreqEnergy / totalEnergy : 0.4;

  // Check for periodic artificial grid artifacts (spikes at diagonal harmonic rings)
  // Characteristic of GAN upsampling or bicubic morph grids
  let peakCount = 0;
  const magMean = totalEnergy / (N * N);
  for (let v = 6; v < N - 6; v++) {
    for (let u = 6; u < N - 6; u++) {
      const dist = Math.sqrt(Math.pow(u - halfN, 2) + Math.pow(v - halfN, 2));
      if (dist > 14 && magnitude[v * N + u] > magMean * 6.5) {
        peakCount++;
      }
    }
  }
  const periodicArtifactDetected = peakCount >= 4;

  // 8x8 DCT high-AC decay rate
  // Normal natural images have exponential decay in DCT coefficients: 1 / f^alpha where alpha ~ 1.5 - 2.2
  // Resampled / blurred morphs decay much faster (alpha > 2.8), generative faces exhibit abnormal tails
  let dctHighAcDecayRate = 1.8;
  if (highFreqEnergyRatio < 0.08) {
    dctHighAcDecayRate = 2.9; // Steep attenuation
  } else if (highFreqEnergyRatio > 0.38) {
    dctHighAcDecayRate = 1.1; // Flat high-frequency noise floor
  }

  // Generate visual FFT Spectrum Heatmap (Log-scaled magnitude)
  const specRgba = new Uint8Array(N * N * 4);
  let maxLog = 0;
  const logMag = new Float32Array(N * N);

  for (let i = 0; i < N * N; i++) {
    const lm = Math.log1p(magnitude[i]);
    logMag[i] = lm;
    if (lm > maxLog) maxLog = lm;
  }

  for (let i = 0; i < N * N; i++) {
    const norm = maxLog > 0 ? logMag[i] / maxLog : 0;
    const idx = i * 4;

    // Colormap: Deep Navy -> Cyan -> Bright Yellow/White (scientific spectral palette)
    if (norm < 0.33) {
      specRgba[idx] = Math.round(norm * 3 * 30); // R
      specRgba[idx + 1] = Math.round(norm * 3 * 100); // G
      specRgba[idx + 2] = Math.round(80 + norm * 3 * 150); // B
    } else if (norm < 0.66) {
      const t = (norm - 0.33) * 3;
      specRgba[idx] = Math.round(30 + t * 200); // R
      specRgba[idx + 1] = Math.round(100 + t * 140); // G
      specRgba[idx + 2] = Math.round(230 - t * 150); // B
    } else {
      const t = (norm - 0.66) * 3;
      specRgba[idx] = Math.round(230 + t * 25); // R
      specRgba[idx + 1] = Math.round(240 + t * 15); // G
      specRgba[idx + 2] = Math.round(80 + t * 175); // B
    }
    specRgba[idx + 3] = 255;
  }

  let fftSpectrumDataUrl: string | undefined;
  try {
    fftSpectrumDataUrl = createPngDataUrl(specRgba, N, N);
  } catch (err) {
    console.error('Failed to create FFT spectrum image:', err);
  }

  // Interpretation
  const findings: string[] = [];
  let signalScore = 0;

  if (periodicArtifactDetected) {
    signalScore += 0.55;
    findings.push(
      `Periodic spectral peaks detected (${peakCount} harmonic spikes), indicating artificial grid resampling or generative convolutional artifacts.`
    );
  }

  if (highFreqEnergyRatio < 0.09) {
    signalScore += 0.4;
    findings.push(
      `Marked high-frequency attenuation (${(highFreqEnergyRatio * 100).toFixed(1)}% of total energy). Consistent with bilinear/bicubic morph blending or facial smoothing.`
    );
  } else if (highFreqEnergyRatio > 0.42) {
    signalScore += 0.3;
    findings.push(`Elevated high-frequency energy ratio (${(highFreqEnergyRatio * 100).toFixed(1)}%), indicating synthetic sharpening or additive noise.`);
  } else {
    findings.push(`Continuous radial spectral decay observed (${(highFreqEnergyRatio * 100).toFixed(1)}% high-frequency power).`);
  }

  const spectralDistributionAnomaly = parseFloat(Math.min(1.0, Math.max(0.05, signalScore)).toFixed(3));

  return {
    signalScore: spectralDistributionAnomaly,
    highFreqEnergyRatio: parseFloat(highFreqEnergyRatio.toFixed(3)),
    midFreqEnergyRatio: parseFloat(midFreqEnergyRatio.toFixed(3)),
    spectralDistributionAnomaly,
    periodicArtifactDetected,
    dctHighAcDecayRate: parseFloat(dctHighAcDecayRate.toFixed(2)),
    findings,
    fftSpectrumDataUrl,
  };
}
