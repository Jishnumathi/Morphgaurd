/**
 * MorphGuard AI — Grounded Forensic Analyst Assistant
 * Uses Google GenAI SDK strictly grounded on the computed forensic evidence vector.
 * Does NOT invent findings or override the deterministic forensic mathematics.
 */

import { GoogleGenAI } from '@google/genai';
import { ForensicCase } from '../../types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function askForensicAssistant(
  c: ForensicCase,
  userQuestion: string
): Promise<string> {
  const res = c.results;
  const summary = res?.summary;

  // Build strict evidence context from actual case measurements
  const evidenceContext = `
CASE FILE IDENTIFIER: ${c.caseNumber}
SUBJECT: ${c.targetSubjectName || 'Unknown'}
FILENAME: ${c.filename}
DIMENSIONS: ${c.imageDimensions.width}x${c.imageDimensions.height} px
CRYPTOGRAPHIC SHA-256: ${c.imageHashSha256}
OVERALL RISK ASSESSMENT: ${summary?.riskLevel || 'INCONCLUSIVE'}
RISK SCORE: ${((summary?.riskScore || 0) * 100).toFixed(1)}%
CONFIDENCE: ${((summary?.confidence || 0) * 100).toFixed(1)}%
IS INCONCLUSIVE: ${summary?.isInconclusive ? 'YES' : 'NO'}
INCONCLUSIVE REASON: ${summary?.inconclusiveReason || 'None'}

FACE BIOMETRICS:
- Face Detected: ${res?.faceDetection.detected ? 'YES' : 'NO'}
- Facial Symmetry Index: ${res?.faceDetection.facialSymmetryIndex.toFixed(3) || 'N/A'} (0 to 1 scale)
- Inter-ocular distance: ${res?.faceDetection.interOcularDistancePx || 'N/A'} px
- Eye alignment tilt: ${res?.faceDetection.eyeAlignmentAngleDeg || 0}°

MODALITY SCORES & MEASUREMENTS:
1. Sensor Noise Residual: ${res?.noise ? (res.noise.signalScore * 100).toFixed(1) + '%' : 'N/A'}
   - Noise Inconsistency Ratio: ${res?.noise ? (res.noise.noiseInconsistencyRatio * 100).toFixed(1) + '%' : 'N/A'}
   - Face Noise vs Background: ${res?.noise?.faceInteriorNoiseStdDev.toFixed(2)} vs ${res?.noise?.backgroundNoiseStdDev.toFixed(2)}
2. 2D FFT Frequency: ${res?.frequency ? (res.frequency.signalScore * 100).toFixed(1) + '%' : 'N/A'}
   - High-Frequency Energy: ${res?.frequency ? (res.frequency.highFreqEnergyRatio * 100).toFixed(1) + '%' : 'N/A'}
   - Periodic Resampling Artifacts: ${res?.frequency?.periodicArtifactDetected ? 'DETECTED' : 'NONE'}
3. Micro-Texture (LBP & GLCM): ${res?.texture ? (res.texture.signalScore * 100).toFixed(1) + '%' : 'N/A'}
   - LBP Shannon Entropy: ${res?.texture?.lbpEntropy.toFixed(2)} bits
   - GLCM Homogeneity: ${res?.texture?.glcmHomogeneity.toFixed(3)}
4. Boundary Edge Gradient: ${res?.edge ? (res.edge.signalScore * 100).toFixed(1) + '%' : 'N/A'}
   - Boundary Discontinuity: ${res?.edge ? (res.edge.boundaryGradientDiscontinuity * 100).toFixed(1) + '%' : 'N/A'}
5. Compression (ELA / 8x8 Block Grid): ${res?.compression ? (res.compression.signalScore * 100).toFixed(1) + '%' : 'N/A'}
   - Format: ${res?.compression?.isJpeg ? 'JPEG lossy' : 'Lossless (PNG)'}
   - ELA Inconsistency: ${res?.compression ? (res.compression.elaInconsistencyScore * 100).toFixed(1) + '%' : 'N/A'}
6. Metadata Provenance: ${res?.metadata?.metadataPresent ? 'PRESENT' : 'STRIPPED/ABSENT'}
   - Software: ${res?.metadata?.softwareTag || 'None'}

PRIMARY INDICATORS:
${summary?.primaryIndicators.map((s) => '- ' + s).join('\n') || '- None'}

LIMITATIONS:
${summary?.limitations.map((s) => '- ' + s).join('\n') || '- None'}
`;

  const ai = getAiClient();

  if (!ai) {
    // Deterministic fallback if GEMINI_API_KEY is not configured
    return fallbackResponse(userQuestion, c);
  }

  const systemInstruction = `
You are the MorphGuard AI Forensic Intelligence Copilot.
Your job is to assist digital forensic examiners and identity verification officers in understanding forensic facial screening findings.

STRICT PROTOCOL RULES:
1. Ground your answers 100% strictly on the provided CASE FILE and EVIDENCE CONTEXT above.
2. NEVER invent, assume, or fabricate forensic measurements or detection results.
3. If an analysis was unavailable or marked inconclusive, explain the technical reasons (e.g. blur, resolution, missing face).
4. Clearly explain the scientific concepts (e.g., LBP entropy, sensor noise consistency, Error Level Analysis) in concise, professional, accessible language.
5. NEVER state that this tool provides definitive proof of criminal fraud or legal guilt. Reiterate that MorphGuard provides AI-assisted screening for human review.
6. Keep answers concise, objective, and well-structured.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${evidenceContext}\n\nUSER QUESTION: ${userQuestion}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for forensic factual grounding
        maxOutputTokens: 800,
      },
    });

    return response.text || fallbackResponse(userQuestion, c);
  } catch (err) {
    console.error('Gemini Assistant Error:', err);
    return fallbackResponse(userQuestion, c);
  }
}

function fallbackResponse(q: string, c: ForensicCase): string {
  const lower = q.toLowerCase();
  const res = c.results;
  const summary = res?.summary;

  if (lower.includes('noise')) {
    if (res?.noise) {
      return `Noise Analysis Report for ${c.caseNumber}:
The system analyzed sensor noise residuals using a high-pass Laplacian filter.
• Face noise standard deviation: ${res.noise.faceInteriorNoiseStdDev.toFixed(2)}
• Background noise standard deviation: ${res.noise.backgroundNoiseStdDev.toFixed(2)}
• Inconsistency ratio: ${(res.noise.noiseInconsistencyRatio * 100).toFixed(1)}%

${res.noise.noiseInconsistencyRatio > 0.3 ? 'Because the noise profiles differ significantly between the face and background, this suggests donor image splicing or compositing.' : 'The noise distribution is consistent across subject and background, showing no signs of multi-sensor composition.'}`;
    }
  }

  if (lower.includes('inconclusive') || lower.includes('why')) {
    if (summary?.isInconclusive) {
      return `This case is marked INCONCLUSIVE because:
${summary.inconclusiveReason}

Forensic screening requires sufficient spatial resolution (at least 100x100 px) and adequate optical sharpness (Laplacian variance > 25.0) to separate true biometric markers from noise and compression artifacts.`;
    }
  }

  if (lower.includes('frequency') || lower.includes('fft')) {
    return `2D FFT Spectral Analysis for ${c.caseNumber}:
• High-Frequency Energy: ${(res?.frequency?.highFreqEnergyRatio ? res.frequency.highFreqEnergyRatio * 100 : 0).toFixed(1)}%
• Periodic Sampling Peaks: ${res?.frequency?.periodicArtifactDetected ? 'Detected (indicative of artificial grid resampling)' : 'None'}

In natural photographs, energy decays smoothly across radial frequencies. Morphing algorithms (such as Delaunay triangulation and non-rigid warping) introduce blurring that suppresses high-frequency detail, while neural generation can create subtle checkerboard frequencies.`;
  }

  return `MorphGuard Forensic Summary for Case ${c.caseNumber}:
• Classification: ${summary?.riskLevel || 'INCONCLUSIVE'}
• Risk Score: ${((summary?.riskScore || 0) * 100).toFixed(1)}% (Confidence: ${((summary?.confidence || 0) * 100).toFixed(1)}%)
• Face Status: ${res?.faceDetection.detected ? 'Verified with facial landmarks' : 'No face detected'}
• Primary Indicators: ${summary?.primaryIndicators[0] || 'Nominal readings'}

Note: MorphGuard AI outputs represent forensic screening metrics to guide qualified human examiners, not definitive standalone legal verdicts.`;
}
