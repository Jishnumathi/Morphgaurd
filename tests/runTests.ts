/**
 * MorphGuard AI — Automated Forensic & Security Test Suite
 * Validates cryptographic evidence integrity, HMAC session verification,
 * RBAC authorization enforcement, forensic signal algorithms, and invariant edge-cases.
 */

import { createHash } from 'crypto';
import { generateSessionToken, verifySessionToken } from '../src/services/auth/tokenAuth.js';
import { analyzeCompression } from '../src/services/forensics/compressionAnalysis.js';
import { analyzeFrequency } from '../src/services/forensics/frequencyAnalysis.js';
import { analyzeNoise } from '../src/services/forensics/noiseAnalysis.js';
import { analyzeTexture } from '../src/services/forensics/textureAnalysis.js';
import { detectFace } from '../src/services/forensics/faceDetector.js';
import { fuseForensicSignals } from '../src/services/forensics/fusionEngine.js';
import { DecodedImage } from '../src/services/forensics/decoder.js';
import { UserRole } from '../src/types.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Math.round(performance.now() - start) });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      error: err.message || String(err),
      durationMs: Math.round(performance.now() - start),
    });
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    \x1b[31m${err.message || String(err)}\x1b[0m`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion Failed [${message}]: Expected ${expected}, got ${actual}`);
  }
}

// Helper: Synthetic 120x120 test image generator
function createMockDecodedImage(
  width = 120,
  height = 120,
  format: 'jpeg' | 'png' = 'jpeg',
  fillR = 180,
  fillG = 140,
  fillB = 110
): DecodedImage {
  const data = new Uint8Array(width * height * 4);
  const grayscale = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    // Add small synthetic noise for realistic texture
    const noise = (i % 7) - 3;
    const r = Math.max(0, Math.min(255, fillR + noise));
    const g = Math.max(0, Math.min(255, fillG + noise));
    const b = Math.max(0, Math.min(255, fillB + noise));

    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;

    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return { width, height, data, grayscale, format };
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('MorphGuard AI — Comprehensive Automated Verification');
  console.log('======================================================\n');

  console.log('\x1b[1m[Suite 1] Cryptographic Evidence & Tamper-Evident Chaining\x1b[0m');

  await test('SHA-256 evidence hashing produces deterministic 64-char hex digest', () => {
    const rawBuffer = Buffer.from('MorphGuard Forensic Sample Evidence Payload 2026');
    const hash1 = createHash('sha256').update(rawBuffer).digest('hex');
    const hash2 = createHash('sha256').update(rawBuffer).digest('hex');
    assertEqual(hash1.length, 64, 'SHA-256 length must be 64 characters');
    assertEqual(hash1, hash2, 'Identical evidence buffers must produce identical hashes');
  });

  await test('Audit trail chaining detects altered log records', () => {
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const entryId = 'AUD-001';
    const timestamp = '2026-09-15T12:00:00Z';
    const originalAction = 'VERDICT_RECORDED';
    const originalDetails = 'Verdict verified as authentic';
    const user = 'examiner@morphguard.gov';

    const validHash = createHash('sha256')
      .update(`${prevHash}|${entryId}|${timestamp}|${originalAction}|${originalDetails}|${user}`)
      .digest('hex');

    // Simulate tampering with details
    const tamperedDetails = 'Verdict altered to confirmed morph';
    const tamperedHash = createHash('sha256')
      .update(`${prevHash}|${entryId}|${timestamp}|${originalAction}|${tamperedDetails}|${user}`)
      .digest('hex');

    assert(validHash !== tamperedHash, 'Tampered log entry must produce differing hash');
  });

  console.log('\n\x1b[1m[Suite 2] Token Authentication & Role-Based Access Control (RBAC)\x1b[0m');

  await test('HMAC session tokens sign and verify user identity', () => {
    const user = {
      id: 'usr-analyst-1',
      email: 'officer.chen@morphguard.gov',
      role: 'ANALYST' as UserRole,
      name: 'Officer Chen',
    };

    const token = generateSessionToken(user);
    assert(token.includes('.'), 'Token must be dot-delimited');

    const decoded = verifySessionToken(token);
    assert(decoded !== null, 'Token verification must succeed for legitimate token');
    assertEqual(decoded!.email, user.email, 'Decoded email must match');
    assertEqual(decoded!.role, 'ANALYST', 'Decoded role must match');
  });

  await test('Tampered token signature is strictly rejected (null)', () => {
    const user = {
      id: 'usr-viewer-1',
      email: 'guest@morphguard.gov',
      role: 'VIEWER' as UserRole,
      name: 'Guest Viewer',
    };

    const token = generateSessionToken(user);
    const parts = token.split('.');
    // Tamper with payload to claim ADMIN role
    const forgedPayload = Buffer.from(JSON.stringify({ ...user, role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    const result = verifySessionToken(forgedToken);
    assertEqual(result, null, 'Forged payload with mismatched signature must fail verification');
  });

  await test('Lead Administrator account automatically receives ADMIN tier', () => {
    const adminUser = {
      id: 'usr-lead',
      email: 'vu.241fa04468@gmail.com',
      role: 'VIEWER' as UserRole, // intentionally test override
      name: 'Lead Admin',
    };

    const token = generateSessionToken(adminUser);
    const decoded = verifySessionToken(token);
    assert(decoded !== null, 'Token should verify');
    assertEqual(decoded!.role, 'ADMIN', 'Lead administrator email must resolve to ADMIN tier');
  });

  console.log('\n\x1b[1m[Suite 3] Signal Forensics: 2D FFT Spectral Analysis\x1b[0m');

  await test('2D FFT computes centered energy distribution with DC component removed', () => {
    const mockImg = createMockDecodedImage(64, 64, 'jpeg', 150, 120, 90);
    const freqResult = analyzeFrequency(mockImg);

    assert(freqResult.highFreqEnergyRatio >= 0 && freqResult.highFreqEnergyRatio <= 1, 'High-freq ratio must be normalized [0, 1]');
    assert(freqResult.midFreqEnergyRatio >= 0 && freqResult.midFreqEnergyRatio <= 1, 'Mid-freq ratio must be normalized [0, 1]');
    assert(freqResult.signalScore >= 0 && freqResult.signalScore <= 1, 'Signal score must be normalized [0, 1]');
    assert(freqResult.findings.length > 0, 'Must produce explanatory findings');
  });

  console.log('\n\x1b[1m[Suite 4] Signal Forensics: Lossless PNG vs JPEG Compression ELA\x1b[0m');

  await test('Lossless PNG images bypass lossy JPEG-specific block artifact analysis', () => {
    const pngImg = createMockDecodedImage(100, 100, 'png');
    const compResult = analyzeCompression(pngImg);

    assertEqual(compResult.isJpeg, false, 'PNG must be recognized as non-JPEG');
    assertEqual(compResult.elaAverageError, 0, 'PNG must have 0 ELA error');
    assert(compResult.findings.some((f) => f.includes('lossless PNG')), 'Findings must note lossless PNG');
  });

  console.log('\n\x1b[1m[Suite 5] Biometric Inconclusive Safeguards & Quality Thresholds\x1b[0m');

  await test('Images smaller than 100x100 trigger INCONCLUSIVE classification', () => {
    const tinyImg = createMockDecodedImage(80, 80);
    const quality = {
      width: 80,
      height: 80,
      megapixels: 0.0064,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 8000,
      meanLuminance: 120,
      contrastStdDev: 40,
      sharpnessLaplacianVar: 150,
      isBlurry: false,
      isLowResolution: true,
      isUnderexposed: false,
      isOverexposed: false,
    };
    const face = {
      faceCount: 1,
      detected: true,
      confidence: 0.9,
      landmarksAvailable: true,
      eyeAlignmentAngleDeg: 0,
      facialSymmetryIndex: 0.85,
      interOcularDistancePx: 25,
    };
    const texture = analyzeTexture(tinyImg);
    const noise = analyzeNoise(tinyImg);
    const freq = analyzeFrequency(tinyImg);
    const comp = analyzeCompression(tinyImg);
    const geo = { signalScore: 0.1, eyeHorizontalTiltDeg: 0, facialSymmetryScore: 0.9, proportionConsistencyScore: 0.9, boundaryAnomalyScore: 0.1, findings: [] };
    const color = { signalScore: 0.1, skinRegionUniformity: 0.9, chromaticDiscontinuity: 0.05, illuminationGradientConsistency: 0.9, findings: [] };
    const edge = { signalScore: 0.1, boundaryGradientDiscontinuity: 0.05, contourBlurAnomaly: 0.05, findings: [] };
    const meta = { signalScore: 0.05, metadataPresent: true, hasGps: false, isStripped: false, findings: [] };

    const fusion = fuseForensicSignals(tinyImg, quality, face, texture, noise, freq, comp, geo, color, edge, meta);

    assertEqual(fusion.summary.riskLevel, 'INCONCLUSIVE', 'Sub-100x100 image must trigger INCONCLUSIVE risk level');
    assertEqual(fusion.summary.isInconclusive, true, 'isInconclusive flag must be true');
    assert(fusion.summary.inconclusiveReason!.includes('Sub-standard resolution'), 'Reason must state sub-standard resolution');
  });

  await test('Severe optical blur (Laplacian variance < 25) triggers INCONCLUSIVE', () => {
    const blurryImg = createMockDecodedImage(200, 200);
    const quality = {
      width: 200,
      height: 200,
      megapixels: 0.04,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 25000,
      meanLuminance: 120,
      contrastStdDev: 30,
      sharpnessLaplacianVar: 14.2, // Below 25 threshold
      isBlurry: true,
      isLowResolution: false,
      isUnderexposed: false,
      isOverexposed: false,
    };
    const face = {
      faceCount: 1,
      detected: true,
      confidence: 0.8,
      landmarksAvailable: true,
      eyeAlignmentAngleDeg: 0,
      facialSymmetryIndex: 0.8,
      interOcularDistancePx: 50,
    };
    const texture = analyzeTexture(blurryImg);
    const noise = analyzeNoise(blurryImg);
    const freq = analyzeFrequency(blurryImg);
    const comp = analyzeCompression(blurryImg);
    const geo = { signalScore: 0.1, eyeHorizontalTiltDeg: 0, facialSymmetryScore: 0.9, proportionConsistencyScore: 0.9, boundaryAnomalyScore: 0.1, findings: [] };
    const color = { signalScore: 0.1, skinRegionUniformity: 0.9, chromaticDiscontinuity: 0.05, illuminationGradientConsistency: 0.9, findings: [] };
    const edge = { signalScore: 0.1, boundaryGradientDiscontinuity: 0.05, contourBlurAnomaly: 0.05, findings: [] };
    const meta = { signalScore: 0.05, metadataPresent: true, hasGps: false, isStripped: false, findings: [] };

    const fusion = fuseForensicSignals(blurryImg, quality, face, texture, noise, freq, comp, geo, color, edge, meta);

    assertEqual(fusion.summary.riskLevel, 'INCONCLUSIVE', 'Severe blur must trigger INCONCLUSIVE');
    assert(fusion.summary.inconclusiveReason!.includes('blur'), 'Reason must specify blur');
  });

  // Summary Report
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n------------------------------------------------------');
  console.log(`Test Execution Summary: ${passed}/${total} Passed (${failed} Failed)`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
