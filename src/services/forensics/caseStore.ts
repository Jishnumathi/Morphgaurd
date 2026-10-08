/**
 * MorphGuard AI — Case Store & Append-Oriented Audit Log Engine
 * Provides case tracking, audit event logging with SHA-256 integrity hash chaining,
 * and pre-seeded forensic calibration reference cases.
 */

import { createHash } from 'crypto';
import { ForensicCase, AuditLogEntry, DashboardStatistics, UserRole } from '../../types.js';

class CaseStore {
  private cases: Map<string, ForensicCase> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private lastAuditHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {
    this.seedDefaultCases();
  }

  public logAuditEvent(
    action: AuditLogEntry['action'],
    details: string,
    caseId?: string,
    user: string = 'officer.jenkins@morphguard.gov',
    role: UserRole = 'ANALYST'
  ): AuditLogEntry {
    const timestamp = new Date().toISOString();
    const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create tamper-evident chained hash: SHA-256(prev_hash + id + timestamp + action + details)
    const hash = createHash('sha256');
    hash.update(`${this.lastAuditHash}|${id}|${timestamp}|${action}|${details}|${user}`);
    const integrityHash = hash.digest('hex');
    this.lastAuditHash = integrityHash;

    const entry: AuditLogEntry = {
      id,
      caseId,
      timestamp,
      user,
      role,
      action,
      details,
      integrityHash,
    };

    this.auditLogs.unshift(entry);
    return entry;
  }

  public getAuditLogs(caseId?: string): AuditLogEntry[] {
    if (caseId) {
      return this.auditLogs.filter((log) => log.caseId === caseId);
    }
    return [...this.auditLogs];
  }

  public createCase(newCase: ForensicCase): ForensicCase {
    this.cases.set(newCase.id, newCase);
    this.logAuditEvent(
      'CASE_CREATED',
      `Forensic case ${newCase.caseNumber} registered: "${newCase.title}". Subject: ${newCase.targetSubjectName || 'Unknown'}. Hash: ${newCase.imageHashSha256.substring(0, 16)}...`,
      newCase.id
    );
    return newCase;
  }

  public getCase(id: string): ForensicCase | undefined {
    const found = this.cases.get(id);
    if (found) {
      this.logAuditEvent('CASE_VIEWED', `Case dossier inspected: ${found.caseNumber}`, found.id);
    }
    return found;
  }

  public listCases(): ForensicCase[] {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updateCaseVerdict(
    id: string,
    verdict: ForensicCase['analystVerdict'],
    notes?: string,
    user: string = 'officer.jenkins@morphguard.gov'
  ): ForensicCase | undefined {
    const target = this.cases.get(id);
    if (!target) return undefined;

    target.analystVerdict = verdict;
    if (notes) target.notes = notes;

    this.logAuditEvent(
      'VERDICT_RECORDED',
      `Official examiner verdict recorded as ${verdict}. Notes: ${notes || 'None'}`,
      target.id,
      user
    );

    return target;
  }

  public getDashboardStatistics(): DashboardStatistics {
    const all = Array.from(this.cases.values());
    const totalCases = all.length;
    let completedAnalyses = 0;
    let highRiskCases = 0;
    let moderateRiskCases = 0;
    let lowRiskCases = 0;
    let inconclusiveCases = 0;
    let totalConfidence = 0;

    for (const c of all) {
      if (c.status === 'Completed' || c.status === 'Inconclusive') {
        completedAnalyses++;
      }
      if (c.results) {
        totalConfidence += c.results.summary.confidence;
        const level = c.results.summary.riskLevel;
        if (level === 'HIGHER RISK') highRiskCases++;
        else if (level === 'MODERATE RISK') moderateRiskCases++;
        else if (level === 'LOW RISK') lowRiskCases++;
        else if (level === 'INCONCLUSIVE') inconclusiveCases++;
      }
    }

    const averageConfidence = completedAnalyses > 0 ? parseFloat((totalConfidence / completedAnalyses).toFixed(2)) : 0.85;

    // Cases over past days
    const casesOverTime = [
      { date: '2026-09-10', count: 12 },
      { date: '2026-09-11', count: 18 },
      { date: '2026-09-12', count: 14 },
      { date: '2026-09-13', count: 22 },
      { date: '2026-09-14', count: 29 },
      { date: '2026-09-15', count: 31 },
      { date: '2026-09-16', count: totalCases },
    ];

    // Signal elevated percentages
    const signalDistribution = [
      { signal: 'Noise Residual Divergence', elevatedPercentage: 42 },
      { signal: '2D FFT Spectral Anomalies', elevatedPercentage: 38 },
      { signal: 'Boundary Seam Discontinuity', elevatedPercentage: 35 },
      { signal: 'Micro-Texture Smoothing (LBP)', elevatedPercentage: 29 },
      { signal: 'JPEG Error Level (ELA)', elevatedPercentage: 26 },
      { signal: 'Facial Landmark Asymmetry', elevatedPercentage: 18 },
    ];

    return {
      totalCases,
      completedAnalyses,
      highRiskCases,
      moderateRiskCases,
      lowRiskCases,
      inconclusiveCases,
      averageConfidence,
      casesOverTime,
      signalDistribution,
    };
  }

  private seedDefaultCases() {
    // 1. Verified Authentic Reference Case
    const case1Id = 'case-demo-001';
    const case1: ForensicCase = {
      id: case1Id,
      caseNumber: 'MG-2026-0814',
      title: 'Standard Passport Renewal — Verified Authentic Subject',
      targetSubjectName: 'Dr. Elena Rostova',
      createdAt: '2026-09-15T14:32:00Z',
      createdBy: 'officer.jenkins@morphguard.gov',
      analystAgency: 'Border Security & Identity Authentication Service',
      status: 'Completed',
      filename: 'rostova_passport_icao9303.jpg',
      fileSizeBytes: 245180,
      imageDimensions: { width: 600, height: 750 },
      imageHashSha256: '9f83a4c28471b693240e9dcf5b271847e28394a501bf384752c4819d92410a82',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      isSampleCase: true,
      analystVerdict: 'VERIFIED_AUTHENTIC',
      notes: 'Natural micro-pore skin texture verified. Sensor noise profile across cheek and perimeter matches uncompressed CMOS response.',
      results: {
        imageQuality: {
          width: 600,
          height: 750,
          megapixels: 0.45,
          format: 'jpeg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 245180,
          meanLuminance: 128.4,
          contrastStdDev: 48.2,
          sharpnessLaplacianVar: 385.6,
          isBlurry: false,
          isLowResolution: false,
          isUnderexposed: false,
          isOverexposed: false,
        },
        faceDetection: {
          faceCount: 1,
          detected: true,
          boundingBox: { x: 120, y: 110, width: 360, height: 490 },
          confidence: 0.96,
          landmarksAvailable: true,
          landmarks: {
            leftEye: { x: 235, y: 285 },
            rightEye: { x: 365, y: 284 },
            noseTip: { x: 300, y: 380 },
            mouthCenter: { x: 300, y: 465 },
            leftMouthCorner: { x: 250, y: 465 },
            rightMouthCorner: { x: 350, y: 465 },
            chin: { x: 300, y: 560 },
          },
          eyeAlignmentAngleDeg: 0.44,
          facialSymmetryIndex: 0.88,
          interOcularDistancePx: 130,
        },
        texture: {
          signalScore: 0.08,
          lbpEntropy: 7.24,
          lbpUniformityRatio: 0.89,
          glcmContrast: 1.42,
          glcmEnergy: 0.024,
          glcmHomogeneity: 0.74,
          glcmCorrelation: 0.89,
          microTextureAnomaly: 0.06,
          findings: [
            'LBP micro-texture entropy is normal (7.24 bits).',
            'GLCM co-occurrence matrix demonstrates natural gradient continuity.',
          ],
        },
        noise: {
          signalScore: 0.09,
          globalNoiseStdDev: 8.42,
          faceInteriorNoiseStdDev: 8.15,
          backgroundNoiseStdDev: 8.64,
          noiseInconsistencyRatio: 0.029,
          isNoiseUniform: true,
          findings: [
            'Consistent sensor noise residual distribution (2.9% variance). No significant splicing mismatch detected.',
          ],
        },
        frequency: {
          signalScore: 0.12,
          highFreqEnergyRatio: 0.24,
          midFreqEnergyRatio: 0.42,
          spectralDistributionAnomaly: 0.11,
          periodicArtifactDetected: false,
          dctHighAcDecayRate: 1.84,
          findings: [
            'Continuous radial spectral decay observed (24.0% high-frequency power).',
            'No periodic grid sampling peaks detected.',
          ],
        },
        compression: {
          signalScore: 0.1,
          isJpeg: true,
          estimatedJpegQuality: 92,
          blockArtifactScore: 0.08,
          elaAverageError: 3.12,
          elaInconsistencyScore: 0.06,
          findings: [
            'Error Level Analysis shows uniform resave error distribution across facial region.',
            'JPEG 8x8 block grid alignment appears intact.',
          ],
        },
        geometry: {
          signalScore: 0.05,
          eyeHorizontalTiltDeg: 0.44,
          facialSymmetryScore: 0.88,
          proportionConsistencyScore: 0.98,
          boundaryAnomalyScore: 0.04,
          findings: [
            'Eye horizontal alignment is within standard biometric tolerance (0.4°).',
            'Bilateral facial symmetry index is within natural biological parameters (0.88).',
          ],
        },
        color: {
          signalScore: 0.06,
          skinRegionUniformity: 0.92,
          chromaticDiscontinuity: 0.03,
          illuminationGradientConsistency: 0.94,
          findings: ['Facial chrominance is uniform across both facial hemispheres.'],
        },
        edge: {
          signalScore: 0.08,
          boundaryGradientDiscontinuity: 0.07,
          contourBlurAnomaly: 0.04,
          findings: ['Edge gradient across facial boundary demonstrates smooth, continuous anatomical transitions.'],
        },
        metadata: {
          signalScore: 0.05,
          metadataPresent: true,
          cameraMake: 'Nikon Corporation',
          cameraModel: 'NIKON D850',
          softwareTag: 'Ver.1.20',
          creationDate: '2026-08-12 11:24:05',
          hasGps: false,
          isStripped: false,
          findings: [
            'EXIF metadata structure is present.',
            'Camera hardware: Nikon Corporation NIKON D850',
            'Capture timestamp: 2026-08-12 11:24:05',
          ],
        },
        summary: {
          classification: 'authentic',
          riskLevel: 'LOW RISK',
          riskScore: 0.08,
          confidence: 0.94,
          isInconclusive: false,
          primaryIndicators: [
            'All eight forensic signals (noise, frequency, texture, edge, compression, geometry, color, metadata) remain within normal organic thresholds.',
          ],
          supportingEvidence: [
            'Consistent sensor noise profile and natural high-frequency micro-pore distribution.',
            'Bilateral facial symmetry index (0.88) aligns with unmanipulated human biometric distributions.',
          ],
          limitations: [
            '2D single-view screening only; physical document security features cannot be evaluated via digital pixel analysis alone.',
            'Screening assessment provides probabilistic AI-assisted triage and must not be treated as a standalone definitive legal conclusion.',
          ],
          signals: [
            { signal: 'noise', name: 'Noise Residual & Sensor Consistency', score: 0.09, weight: 0.22, status: 'NORMAL', summary: 'Uniform CMOS noise profile.' },
            { signal: 'frequency', name: '2D FFT Spectral & DCT Distribution', score: 0.12, weight: 0.18, status: 'NORMAL', summary: 'Natural harmonic decay.' },
            { signal: 'edge', name: 'Boundary Transition & Edge Discontinuity', score: 0.08, weight: 0.16, status: 'NORMAL', summary: 'Continuous anatomical edge gradients.' },
            { signal: 'texture', name: 'Micro-Texture (LBP & GLCM Matrix)', score: 0.08, weight: 0.14, status: 'NORMAL', summary: 'Natural skin entropy (7.24 bits).' },
            { signal: 'compression', name: 'JPEG 8x8 Grid & Error Level (ELA)', score: 0.1, weight: 0.12, status: 'NORMAL', summary: 'Consistent 8x8 DCT grid alignment.' },
            { signal: 'geometry', name: 'Facial Biometric Symmetry & Proportions', score: 0.05, weight: 0.1, status: 'NORMAL', summary: 'Biometric ocular alignment verified.' },
            { signal: 'color', name: 'Chrominance & Illuminant Consistency', score: 0.06, weight: 0.05, status: 'NORMAL', summary: 'Uniform single-source illumination.' },
            { signal: 'metadata', name: 'EXIF Header & Provenance Verification', score: 0.05, weight: 0.03, status: 'NORMAL', summary: 'Original Nikon EXIF preserved.' },
          ],
          localizedAnomalies: [],
        },
      },
    };

    // 2. Dual-Subject Facial Morph Blend Reference Case (Higher Risk)
    const case2Id = 'case-demo-002';
    const case2: ForensicCase = {
      id: case2Id,
      caseNumber: 'MG-2026-0922',
      title: 'Biometric Enrollment Query — Dual-Donor Morphing Detected',
      targetSubjectName: 'Flagged Applicant A-49102',
      createdAt: '2026-09-16T01:15:00Z',
      createdBy: 'officer.jenkins@morphguard.gov',
      analystAgency: 'Border Security & Identity Authentication Service',
      status: 'Completed',
      filename: 'applicant_49102_morph_query.jpg',
      fileSizeBytes: 312450,
      imageDimensions: { width: 640, height: 800 },
      imageHashSha256: '4a19c72e6b91fa023985dc741029e847c102938475a1928374650192837465a1',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&auto=format&fit=crop&q=85',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      isSampleCase: true,
      analystVerdict: 'SUSPECTED_MORPH',
      notes: 'Significant high-frequency attenuation in mid-face region characteristic of non-rigid Delaunay warping. Distinct dual-sensor noise variances detected between nasal bridge and ear perimeter.',
      results: {
        imageQuality: {
          width: 640,
          height: 800,
          megapixels: 0.51,
          format: 'jpeg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 312450,
          meanLuminance: 135.2,
          contrastStdDev: 52.4,
          sharpnessLaplacianVar: 182.1,
          isBlurry: false,
          isLowResolution: false,
          isUnderexposed: false,
          isOverexposed: false,
        },
        faceDetection: {
          faceCount: 1,
          detected: true,
          boundingBox: { x: 130, y: 120, width: 380, height: 520 },
          confidence: 0.94,
          landmarksAvailable: true,
          landmarks: {
            leftEye: { x: 245, y: 295 },
            rightEye: { x: 395, y: 302 },
            noseTip: { x: 315, y: 395 },
            mouthCenter: { x: 318, y: 485 },
            leftMouthCorner: { x: 260, y: 485 },
            rightMouthCorner: { x: 375, y: 485 },
            chin: { x: 316, y: 590 },
          },
          eyeAlignmentAngleDeg: 2.67,
          facialSymmetryIndex: 0.62,
          interOcularDistancePx: 150,
        },
        texture: {
          signalScore: 0.74,
          lbpEntropy: 5.84,
          lbpUniformityRatio: 0.72,
          glcmContrast: 0.38,
          glcmEnergy: 0.082,
          glcmHomogeneity: 0.89,
          glcmCorrelation: 0.94,
          microTextureAnomaly: 0.72,
          findings: [
            'Low LBP texture entropy (5.84 bits), consistent with artificial facial smoothing or morph interpolation.',
            'Abnormally high GLCM homogeneity (0.890) and low contrast, characteristic of synthetic blending blur.',
          ],
        },
        noise: {
          signalScore: 0.82,
          globalNoiseStdDev: 14.2,
          faceInteriorNoiseStdDev: 6.4,
          backgroundNoiseStdDev: 15.8,
          noiseInconsistencyRatio: 0.423,
          isNoiseUniform: false,
          findings: [
            'Severe regional noise divergence (42.3%). Face region noise (6.4) conflicts significantly with background sensor profile (15.8).',
          ],
        },
        frequency: {
          signalScore: 0.78,
          highFreqEnergyRatio: 0.072,
          midFreqEnergyRatio: 0.38,
          spectralDistributionAnomaly: 0.76,
          periodicArtifactDetected: true,
          dctHighAcDecayRate: 2.95,
          findings: [
            'Periodic spectral peaks detected (6 harmonic spikes), indicating artificial grid resampling or generative convolutional artifacts.',
            'Marked high-frequency attenuation (7.2% of total energy). Consistent with bilinear/bicubic morph blending or facial smoothing.',
          ],
        },
        compression: {
          signalScore: 0.68,
          isJpeg: true,
          estimatedJpegQuality: 86,
          blockArtifactScore: 0.52,
          elaAverageError: 8.94,
          elaInconsistencyScore: 0.41,
          findings: [
            'Pronounced Error Level Analysis (ELA) discrepancy between subject and surroundings (41.0%). Indicates distinct compression histories, common in pasted or morphed identity documents.',
            'Elevated 8x8 DCT block grid boundary discontinuity (0.52).',
          ],
        },
        geometry: {
          signalScore: 0.48,
          eyeHorizontalTiltDeg: 2.67,
          facialSymmetryScore: 0.62,
          proportionConsistencyScore: 0.74,
          boundaryAnomalyScore: 0.46,
          findings: [
            'Nasal-oral vertical midline lateral skew (14.2%), indicative of uneven non-rigid morph warping.',
            'Abnormally high facial asymmetry index (0.62), suggesting localized synthetic displacement or splicing.',
          ],
        },
        color: {
          signalScore: 0.42,
          skinRegionUniformity: 0.76,
          chromaticDiscontinuity: 0.16,
          illuminationGradientConsistency: 0.52,
          findings: [
            'Bilateral chromatic discontinuity detected (16.0%). Differential color cast between facial halves suggests composite donor sources.',
          ],
        },
        edge: {
          signalScore: 0.71,
          boundaryGradientDiscontinuity: 0.58,
          contourBlurAnomaly: 0.36,
          findings: [
            'Boundary gradient anomaly along perimeter seam (58.0%). Indicates edge blending, feathering, or splice insertion.',
          ],
        },
        metadata: {
          signalScore: 0.65,
          metadataPresent: true,
          cameraMake: 'Unknown',
          cameraModel: 'Exported Stream',
          softwareTag: 'Adobe Photoshop 24.5 (Macintosh)',
          creationDate: '2026-09-14 22:40:11',
          hasGps: false,
          isStripped: false,
          findings: [
            'EXIF metadata structure is present.',
            'Software processing tag detected: "Adobe Photoshop 24.5 (Macintosh)"',
            'Elevated risk indicator: Software tag indicates desktop image editor or generative pipeline.',
          ],
        },
        summary: {
          classification: 'potentially_manipulated',
          riskLevel: 'HIGHER RISK',
          riskScore: 0.84,
          confidence: 0.89,
          isInconclusive: false,
          primaryIndicators: [
            'Noise Residual & Sensor Consistency: Severe regional noise divergence (42.3%). Face region noise conflicts with background sensor profile.',
            '2D FFT Spectral & DCT Distribution: Periodic spectral peaks detected (6 harmonic spikes) and steep high-frequency attenuation.',
            'Micro-Texture (LBP & GLCM Matrix): Unnatural loss of skin micro-pore texture (5.84 bits entropy) with elevated GLCM homogeneity.',
          ],
          supportingEvidence: [
            'Boundary Transition & Edge Discontinuity: Perimeter seam blur along jawline indicates blending feathering.',
            'JPEG 8x8 Grid & Error Level (ELA): 41% ELA inconsistency across resave differential.',
            'Software metadata tag explicitly registers Adobe Photoshop desktop pipeline.',
          ],
          limitations: [
            'Image has undergone lossy JPEG recompression (approx Q=86), which partially suppresses delicate sensor noise residuals.',
            '2D single-view screening only; physical document security features cannot be evaluated via digital pixel analysis alone.',
            'Screening assessment provides probabilistic AI-assisted triage and must not be treated as a standalone definitive legal conclusion.',
          ],
          signals: [
            { signal: 'noise', name: 'Noise Residual & Sensor Consistency', score: 0.82, weight: 0.22, status: 'ANOMALOUS', summary: 'Severe sensor noise discrepancy (42.3%).' },
            { signal: 'frequency', name: '2D FFT Spectral & DCT Distribution', score: 0.78, weight: 0.18, status: 'ANOMALOUS', summary: 'Periodic harmonic peaks & steep high-freq drop.' },
            { signal: 'edge', name: 'Boundary Transition & Edge Discontinuity', score: 0.71, weight: 0.16, status: 'ANOMALOUS', summary: 'Boundary feathering and ghost seam along jaw.' },
            { signal: 'texture', name: 'Micro-Texture (LBP & GLCM Matrix)', score: 0.74, weight: 0.14, status: 'ANOMALOUS', summary: 'Micro-pore smoothing with low entropy (5.84).' },
            { signal: 'compression', name: 'JPEG 8x8 Grid & Error Level (ELA)', score: 0.68, weight: 0.12, status: 'ANOMALOUS', summary: '41% ELA inconsistency between face & background.' },
            { signal: 'geometry', name: 'Facial Biometric Symmetry & Proportions', score: 0.48, weight: 0.1, status: 'ELEVATED', summary: 'Nasal-oral midline lateral warping (14.2%).' },
            { signal: 'color', name: 'Chrominance & Illuminant Consistency', score: 0.42, weight: 0.05, status: 'ELEVATED', summary: 'Bilateral color cast asymmetry across cheeks.' },
            { signal: 'metadata', name: 'EXIF Header & Provenance Verification', score: 0.65, weight: 0.03, status: 'ELEVATED', summary: 'Software tag registers Adobe Photoshop.' },
          ],
          localizedAnomalies: [
            {
              region: 'Facial Perimeter / Jawline Seam',
              description: 'Gradient discontinuity along facial contour suggests boundary insertion, feathering, or splice blending.',
              severity: 'HIGH',
            },
            {
              region: 'Cheek & Mid-face Sensor Profile',
              description: 'Internal facial noise variance diverges significantly from background, indicative of dual-sensor composite origin.',
              severity: 'HIGH',
            },
            {
              region: 'Ocular & Nasal Micro-Structure',
              description: 'Abnormal frequency energy distribution with high-frequency attenuation characteristic of non-rigid morph warping.',
              severity: 'MEDIUM',
            },
          ],
        },
      },
    };

    // 3. Inconclusive Reference Case (Low Resolution & Optical Blur)
    const case3Id = 'case-demo-003';
    const case3: ForensicCase = {
      id: case3Id,
      caseNumber: 'MG-2026-0509',
      title: 'Surveillance Still Query — Insufficient Resolution & Motion Blur',
      targetSubjectName: 'Unknown Transit Transit Subject #3',
      createdAt: '2026-09-14T09:12:00Z',
      createdBy: 'officer.jenkins@morphguard.gov',
      analystAgency: 'Border Security & Identity Authentication Service',
      status: 'Inconclusive',
      filename: 'transit_cctv_frame_crop.jpg',
      fileSizeBytes: 24100,
      imageDimensions: { width: 94, height: 112 },
      imageHashSha256: '8b74c102938475a1928374650192837465a19f83a4c28471b693240e9dcf5b27',
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=20',
      thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=20',
      isSampleCase: true,
      analystVerdict: 'INCONCLUSIVE_INSUFFICIENT_DATA',
      notes: 'Cropped surveillance still falls below minimal forensic resolution thresholds (94x112 px). Severe optical motion blur prevents reliable sensor noise extraction.',
      results: {
        imageQuality: {
          width: 94,
          height: 112,
          megapixels: 0.01,
          format: 'jpeg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 24100,
          meanLuminance: 92.4,
          contrastStdDev: 22.1,
          sharpnessLaplacianVar: 18.4,
          isBlurry: true,
          isLowResolution: true,
          isUnderexposed: false,
          isOverexposed: false,
        },
        faceDetection: {
          faceCount: 1,
          detected: true,
          boundingBox: { x: 12, y: 15, width: 70, height: 82 },
          confidence: 0.58,
          landmarksAvailable: true,
          landmarks: {
            leftEye: { x: 30, y: 40 },
            rightEye: { x: 58, y: 41 },
            noseTip: { x: 45, y: 55 },
            mouthCenter: { x: 45, y: 72 },
            leftMouthCorner: { x: 35, y: 72 },
            rightMouthCorner: { x: 55, y: 72 },
            chin: { x: 45, y: 92 },
          },
          eyeAlignmentAngleDeg: 1.2,
          facialSymmetryIndex: 0.65,
          interOcularDistancePx: 28,
        },
        texture: {
          signalScore: 0.0,
          lbpEntropy: 4.12,
          lbpUniformityRatio: 0.62,
          glcmContrast: 0.12,
          glcmEnergy: 0.15,
          glcmHomogeneity: 0.94,
          glcmCorrelation: 0.98,
          microTextureAnomaly: 0.0,
          findings: ['Analysis unavailable due to severe sub-resolution blur.'],
        },
        noise: {
          signalScore: 0.0,
          globalNoiseStdDev: 2.1,
          faceInteriorNoiseStdDev: 1.9,
          backgroundNoiseStdDev: 2.2,
          noiseInconsistencyRatio: 0.07,
          isNoiseUniform: true,
          findings: ['Sensor noise residual unresolvable under low MTF.'],
        },
        frequency: {
          signalScore: 0.0,
          highFreqEnergyRatio: 0.02,
          midFreqEnergyRatio: 0.15,
          spectralDistributionAnomaly: 0.0,
          periodicArtifactDetected: false,
          dctHighAcDecayRate: 3.4,
          findings: ['High-frequency band empty; optical low-pass attenuation.'],
        },
        compression: {
          signalScore: 0.0,
          isJpeg: true,
          estimatedJpegQuality: 65,
          blockArtifactScore: 0.85,
          elaAverageError: 18.2,
          elaInconsistencyScore: 0.12,
          findings: ['Heavy coarse block quantization across entire frame.'],
        },
        geometry: {
          signalScore: 0.0,
          eyeHorizontalTiltDeg: 1.2,
          facialSymmetryScore: 0.65,
          proportionConsistencyScore: 0.8,
          boundaryAnomalyScore: 0.0,
          findings: ['Landmarks approximate due to low resolution.'],
        },
        color: {
          signalScore: 0.0,
          skinRegionUniformity: 0.5,
          chromaticDiscontinuity: 0.08,
          illuminationGradientConsistency: 0.4,
          findings: ['Color fidelity degraded.'],
        },
        edge: {
          signalScore: 0.0,
          boundaryGradientDiscontinuity: 0.0,
          contourBlurAnomaly: 0.8,
          findings: ['Edges smeared.'],
        },
        metadata: {
          signalScore: 0.1,
          metadataPresent: false,
          hasGps: false,
          isStripped: true,
          findings: ['EXIF metadata stripped.'],
        },
        summary: {
          classification: 'inconclusive',
          riskLevel: 'INCONCLUSIVE',
          riskScore: 0.0,
          confidence: 0.92,
          isInconclusive: true,
          inconclusiveReason:
            'Sub-standard resolution (94x112 px) and optical motion blur (Laplacian variance 18.4 < 25.0 threshold). Image quality is insufficient for reliable facial forensic determination.',
          primaryIndicators: [
            'Resolution inadequate for sub-pixel landmark and spectral analysis.',
            'Severe optical motion blur obliterates high-frequency micro-pores and sensor noise.',
          ],
          supportingEvidence: [
            'Pixel density insufficient to separate camera noise from compression artifacts.',
          ],
          limitations: [
            'High risk of false-positive or false-negative results on heavily downsampled imagery.',
            'Minimum required resolution for MorphGuard biometric forensic analysis is 100x100 px.',
          ],
          signals: [],
          localizedAnomalies: [],
        },
      },
    };

    this.cases.set(case1.id, case1);
    this.cases.set(case2.id, case2);
    this.cases.set(case3.id, case3);

    // Initial audit log
    this.logAuditEvent('CASE_CREATED', 'Pre-seeded calibration benchmark case #MG-2026-0814 initialized', case1.id);
    this.logAuditEvent('CASE_CREATED', 'Pre-seeded calibration benchmark case #MG-2026-0922 initialized', case2.id);
    this.logAuditEvent('CASE_CREATED', 'Pre-seeded calibration benchmark case #MG-2026-0509 initialized', case3.id);
  }
}

export const caseStore = new CaseStore();
