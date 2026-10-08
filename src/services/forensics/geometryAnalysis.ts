/**
 * MorphGuard AI — Facial Geometry & Anthropometric Biometrics Engine
 * Analyzes inter-ocular balance, cranial proportions, nasal-oral alignment,
 * and symmetry deviations without penalizing natural human variation.
 */

import { FaceDetectionResult, GeometryAnalysisResult } from '../../types.js';

export function analyzeGeometry(face: FaceDetectionResult): GeometryAnalysisResult {
  if (!face.detected || !face.landmarks || !face.boundingBox) {
    return {
      signalScore: 0.0,
      eyeHorizontalTiltDeg: 0,
      facialSymmetryScore: 1.0,
      proportionConsistencyScore: 1.0,
      boundaryAnomalyScore: 0.0,
      findings: ['Face detection unavailable for geometric landmark analysis.'],
    };
  }

  const { landmarks, boundingBox } = face;
  const findings: string[] = [];
  let anomalyScore = 0;

  // 1. Eye Horizontal Alignment Tilt
  const tiltDeg = Math.abs(face.eyeAlignmentAngleDeg);
  if (tiltDeg > 6.5) {
    anomalyScore += 0.25;
    findings.push(`Elevated ocular tilt detected (${tiltDeg.toFixed(1)}°). Severe head tilt or uneven facial warping.`);
  } else {
    findings.push(`Eye horizontal alignment is within standard biometric tolerance (${tiltDeg.toFixed(1)}°).`);
  }

  // 2. Inter-ocular Distance to Face Width Proportion (Rule of Fifths)
  // In a standard canonical face, inter-ocular distance should be roughly 0.38 - 0.52 of face width
  const eyeDistance = face.interOcularDistancePx;
  const ocularRatio = eyeDistance / boundingBox.width;

  let proportionConsistencyScore = 1.0;
  if (ocularRatio < 0.28 || ocularRatio > 0.65) {
    proportionConsistencyScore = 0.55;
    anomalyScore += 0.35;
    findings.push(`Anthropometric cranial proportion anomaly: eye span ratio (${ocularRatio.toFixed(2)}) deviates significantly from natural human norms.`);
  } else {
    findings.push(`Facial proportions follow standard craniofacial distribution (inter-ocular ratio ${ocularRatio.toFixed(2)}).`);
  }

  // 3. Central Axis Alignment (Nose tip and mouth center relative to eye midpoint)
  const eyeMidX = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
  const noseDevX = Math.abs(landmarks.noseTip.x - eyeMidX) / boundingBox.width;
  const mouthDevX = Math.abs(landmarks.mouthCenter.x - eyeMidX) / boundingBox.width;

  if (noseDevX > 0.12 || mouthDevX > 0.14) {
    anomalyScore += 0.25;
    findings.push(`Nasal-oral vertical midline lateral skew (${(Math.max(noseDevX, mouthDevX) * 100).toFixed(1)}%), indicative of uneven non-rigid morph warping.`);
  }

  // 4. Facial Symmetry (Account for normal natural human asymmetry)
  // Normal human asymmetry has symmetry score around 0.70 - 0.95. Only very low values (< 0.60) are anomalous
  const symmetry = face.facialSymmetryIndex;
  if (symmetry < 0.58) {
    anomalyScore += 0.3;
    findings.push(`Abnormally high facial asymmetry index (${symmetry.toFixed(2)}), suggesting localized synthetic displacement or splicing.`);
  } else {
    findings.push(`Bilateral facial symmetry index is within natural biological parameters (${symmetry.toFixed(2)}).`);
  }

  const signalScore = parseFloat(Math.min(1.0, Math.max(0.05, anomalyScore)).toFixed(3));

  return {
    signalScore,
    eyeHorizontalTiltDeg: tiltDeg,
    facialSymmetryScore: symmetry,
    proportionConsistencyScore: parseFloat(proportionConsistencyScore.toFixed(2)),
    boundaryAnomalyScore: parseFloat(Math.min(1.0, anomalyScore).toFixed(2)),
    findings,
  };
}
