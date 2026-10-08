/**
 * MorphGuard AI — Forensic Types and Schema Definitions
 */

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  agency: string;
  avatarUrl?: string;
  authProvider?: 'google' | 'credential' | 'demo';
  googleId?: string;
  emailVerified?: boolean;
  lastLoginAt?: string;
}

export type RiskLevel = 'LOW RISK' | 'MODERATE RISK' | 'HIGHER RISK' | 'INCONCLUSIVE';

export type CaseStatus = 'Uploaded' | 'Processing' | 'Completed' | 'Inconclusive' | 'Failed' | 'Archived';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FacialLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  noseTip: { x: number; y: number };
  mouthCenter: { x: number; y: number };
  leftMouthCorner: { x: number; y: number };
  rightMouthCorner: { x: number; y: number };
  chin: { x: number; y: number };
}

export interface FaceDetectionResult {
  faceCount: number;
  detected: boolean;
  boundingBox?: BoundingBox;
  confidence: number;
  landmarksAvailable: boolean;
  landmarks?: FacialLandmarks;
  eyeAlignmentAngleDeg: number;
  facialSymmetryIndex: number;
  interOcularDistancePx: number;
}

export interface ImageQualityMetrics {
  width: number;
  height: number;
  megapixels: number;
  format: string;
  mimeType: string;
  fileSizeBytes: number;
  meanLuminance: number;
  contrastStdDev: number;
  sharpnessLaplacianVar: number;
  isBlurry: boolean;
  isLowResolution: boolean;
  isUnderexposed: boolean;
  isOverexposed: boolean;
}

export interface TextureAnalysisResult {
  signalScore: number; // 0.0 (natural) to 1.0 (anomalous)
  lbpEntropy: number;
  lbpUniformityRatio: number;
  glcmContrast: number;
  glcmEnergy: number;
  glcmHomogeneity: number;
  glcmCorrelation: number;
  microTextureAnomaly: number;
  findings: string[];
}

export interface NoiseAnalysisResult {
  signalScore: number;
  globalNoiseStdDev: number;
  faceInteriorNoiseStdDev: number;
  backgroundNoiseStdDev: number;
  noiseInconsistencyRatio: number;
  isNoiseUniform: boolean;
  findings: string[];
  residualMapDataUrl?: string;
}

export interface FrequencyAnalysisResult {
  signalScore: number;
  highFreqEnergyRatio: number;
  midFreqEnergyRatio: number;
  spectralDistributionAnomaly: number;
  periodicArtifactDetected: boolean;
  dctHighAcDecayRate: number;
  findings: string[];
  fftSpectrumDataUrl?: string;
}

export interface CompressionAnalysisResult {
  signalScore: number;
  isJpeg: boolean;
  estimatedJpegQuality?: number;
  blockArtifactScore: number; // grid discontinuity
  elaAverageError: number;
  elaInconsistencyScore: number;
  findings: string[];
  elaMapDataUrl?: string;
}

export interface GeometryAnalysisResult {
  signalScore: number;
  eyeHorizontalTiltDeg: number;
  facialSymmetryScore: number;
  proportionConsistencyScore: number;
  boundaryAnomalyScore: number;
  findings: string[];
}

export interface ColorAnalysisResult {
  signalScore: number;
  skinRegionUniformity: number;
  chromaticDiscontinuity: number;
  illuminationGradientConsistency: number;
  findings: string[];
}

export interface EdgeAnalysisResult {
  signalScore: number;
  boundaryGradientDiscontinuity: number;
  contourBlurAnomaly: number;
  findings: string[];
  edgeMapDataUrl?: string;
}

export interface MetadataAnalysisResult {
  signalScore: number;
  metadataPresent: boolean;
  cameraMake?: string;
  cameraModel?: string;
  softwareTag?: string;
  creationDate?: string;
  hasGps: boolean;
  colorSpace?: string;
  isStripped: boolean;
  findings: string[];
}

export interface ForensicSignalEvidence {
  signal: 'texture' | 'noise' | 'frequency' | 'compression' | 'geometry' | 'color' | 'edge' | 'metadata';
  name: string;
  score: number; // 0 to 1
  weight: number;
  status: 'NORMAL' | 'ELEVATED' | 'ANOMALOUS' | 'NOT_APPLICABLE';
  summary: string;
}

export interface ForensicReportSummary {
  classification: 'authentic' | 'suspicious' | 'potentially_manipulated' | 'inconclusive';
  riskLevel: RiskLevel;
  riskScore: number; // 0.00 to 1.00
  confidence: number; // 0.00 to 1.00
  isInconclusive: boolean;
  inconclusiveReason?: string;
  primaryIndicators: string[];
  supportingEvidence: string[];
  limitations: string[];
  signals: ForensicSignalEvidence[];
  localizedAnomalies: {
    region: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}

export interface ForensicAnalysisResults {
  imageQuality: ImageQualityMetrics;
  faceDetection: FaceDetectionResult;
  texture: TextureAnalysisResult;
  noise: NoiseAnalysisResult;
  frequency: FrequencyAnalysisResult;
  compression: CompressionAnalysisResult;
  geometry: GeometryAnalysisResult;
  color: ColorAnalysisResult;
  edge: EdgeAnalysisResult;
  metadata: MetadataAnalysisResult;
  summary: ForensicReportSummary;
  anomalyHeatmapDataUrl?: string;
}

export interface ForensicCase {
  id: string;
  caseNumber: string;
  title: string;
  targetSubjectName?: string;
  createdAt: string;
  createdBy: string;
  analystAgency: string;
  status: CaseStatus;
  filename: string;
  fileSizeBytes: number;
  imageDimensions: { width: number; height: number };
  imageHashSha256: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isSampleCase?: boolean;
  results?: ForensicAnalysisResults;
  notes?: string;
  analystVerdict?: 'PENDING_REVIEW' | 'VERIFIED_AUTHENTIC' | 'SUSPECTED_MORPH' | 'INCONCLUSIVE_INSUFFICIENT_DATA';
}

export interface AuditLogEntry {
  id: string;
  caseId?: string;
  timestamp: string;
  user: string;
  userEmail?: string;
  role: UserRole;
  userRole?: UserRole;
  action:
    | 'CASE_CREATED'
    | 'IMAGE_UPLOADED'
    | 'HASH_GENERATED'
    | 'ANALYSIS_STARTED'
    | 'ANALYSIS_COMPLETED'
    | 'REPORT_GENERATED'
    | 'CASE_VIEWED'
    | 'CASE_UPDATED'
    | 'CASE_ARCHIVED'
    | 'VERDICT_RECORDED'
    | 'USER_AUTHENTICATED'
    | 'USER_LOGOUT'
    | 'AI_ASSISTANT_QUERY';
  details: string;
  integrityHash: string;
  entryHashSha256?: string;
  previousHashSha256?: string;
}

export interface DashboardStatistics {
  totalCases: number;
  completedAnalyses: number;
  highRiskCases: number;
  moderateRiskCases: number;
  lowRiskCases: number;
  inconclusiveCases: number;
  averageConfidence: number;
  casesOverTime: { date: string; count: number }[];
  signalDistribution: { signal: string; elevatedPercentage: number }[];
}
