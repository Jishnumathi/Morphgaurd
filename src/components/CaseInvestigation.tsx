/**
 * MorphGuard AI — Deep Forensic Case Investigation Dossier
 * Comprehensive multi-panel forensic view displaying all 8 analytical modalities,
 * cryptographic verification, localized suspicious zones, limitations, and PDF export.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileDown,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Bot,
  Activity,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
  Clock,
  User,
  Building,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';
import { ImageForensicViewer } from './ImageForensicViewer.js';

interface CaseInvestigationProps {
  currentCase: ForensicCase;
  user: UserSession;
  onBack: () => void;
  onUpdateVerdict: (caseId: string, verdict: ForensicCase['analystVerdict'], notes?: string) => Promise<void>;
  onOpenAssistant: (currentCase: ForensicCase) => void;
}

export const CaseInvestigation: React.FC<CaseInvestigationProps> = ({
  currentCase,
  user,
  onBack,
  onUpdateVerdict,
  onOpenAssistant,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [verdictSelection, setVerdictSelection] = useState<ForensicCase['analystVerdict']>(
    currentCase.analystVerdict || 'PENDING_REVIEW'
  );
  const [examinerNotes, setExaminerNotes] = useState(currentCase.notes || '');
  const [isSavingVerdict, setIsSavingVerdict] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [expandedModality, setExpandedModality] = useState<string | null>('noise');

  const res = currentCase.results;
  const summary = res?.summary;
  const riskLevel = summary?.riskLevel || 'INCONCLUSIVE';

  const handleCopyHash = () => {
    navigator.clipboard.writeText(currentCase.imageHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleSaveVerdict = async () => {
    setIsSavingVerdict(true);
    try {
      await onUpdateVerdict(currentCase.id, verdictSelection, examinerNotes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSavingVerdict(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setDownloadError(null);
    try {
      const response = await fetch(`/api/cases/${currentCase.id}/report`);
      if (!response.ok) throw new Error('PDF generation request failed.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MorphGuard_Report_${currentCase.caseNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(err?.message || 'Could not generate PDF report. Please verify connection.');
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  let riskColor = 'text-slate-400';
  let RiskIcon = HelpCircle;
  if (riskLevel === 'HIGHER RISK') {
    riskColor = 'text-rose-400';
    RiskIcon = ShieldAlert;
  } else if (riskLevel === 'MODERATE RISK') {
    riskColor = 'text-amber-400';
    RiskIcon = AlertTriangle;
  } else if (riskLevel === 'LOW RISK') {
    riskColor = 'text-emerald-400';
    RiskIcon = ShieldCheck;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <button
          id="back-to-dashboard-btn"
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Registry
        </button>

        <div className="flex items-center gap-3">
          <button
            id="open-assistant-btn"
            onClick={() => onOpenAssistant(currentCase)}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-indigo-300 border border-indigo-500/30 hover:bg-slate-850 hover:border-indigo-400/50 transition-colors shadow-xs cursor-pointer"
          >
            <Bot className="w-4 h-4 mr-1.5 text-indigo-400" />
            AI Copilot
          </button>

          <button
            id="download-pdf-report-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            {isDownloadingPdf ? 'Generating PDF...' : 'Export Dossier (PDF)'}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            {downloadError}
          </span>
          <button
            onClick={() => setDownloadError(null)}
            className="text-rose-400 hover:text-rose-100 ml-3 text-sm font-bold leading-none p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Case Header Dossier Container */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono font-bold text-indigo-400">{currentCase.caseNumber}</span>
              <span>·</span>
              <span>{currentCase.isSampleCase ? 'Calibration Benchmark' : 'Active Investigation'}</span>
              <span>·</span>
              <span>{new Date(currentCase.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {currentCase.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Subject: <span className="font-medium text-slate-200">{currentCase.targetSubjectName || 'Unspecified'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Agency: <span className="text-slate-300">{currentCase.analystAgency}</span>
              </span>
              <span>
                Evidence File: <span className="font-mono text-slate-300">{currentCase.filename}</span> ({(currentCase.fileSizeBytes / 1024).toFixed(1)} KB)
              </span>
            </div>
          </div>

          {/* Assessment Overview Stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Assessment</div>
              <div className={`text-base font-bold flex items-center gap-1.5 mt-0.5 ${riskColor}`}>
                <RiskIcon className="w-4 h-4" />
                <span>{riskLevel === 'HIGHER RISK' ? 'Higher Risk' :
                       riskLevel === 'MODERATE RISK' ? 'Moderate Risk' :
                       riskLevel === 'LOW RISK' ? 'Low Risk' : 'Inconclusive'}</span>
              </div>
            </div>

            {summary && !summary.isInconclusive && (
              <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Risk Index</div>
                <div className="text-base font-bold font-mono text-white mt-0.5 tabular-nums">
                  {(summary.riskScore * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {summary && (
              <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Confidence</div>
                <div className="text-base font-bold font-mono text-indigo-400 mt-0.5 tabular-nums">
                  {(summary.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic SHA-256 Verification Hairline Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 font-mono text-slate-400">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">SHA-256:</span>
            <span className="text-slate-300 select-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-xs truncate max-w-[280px] sm:max-w-md tabular-nums">
              {currentCase.imageHashSha256}
            </span>
            <button
              onClick={handleCopyHash}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copy SHA-256 Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center space-x-3 font-mono">
            <span>Dimensions: {currentCase.imageDimensions.width} × {currentCase.imageDimensions.height} px</span>
            <span>·</span>
            <span>Format: {res?.imageQuality.format.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Visualizer & Right Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer Stage */}
        <div className="lg:col-span-7 space-y-5">
          <ImageForensicViewer currentCase={currentCase} />

          {/* Suspicious Regions Localized List */}
          {summary && summary.localizedAnomalies.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Localized Suspicious Biometric Regions ({summary.localizedAnomalies.length})
              </h3>
              <div className="space-y-2">
                {summary.localizedAnomalies.map((ano, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 mb-0.5">{ano.region}</div>
                      <p className="text-slate-400 text-xs leading-relaxed">{ano.description}</p>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-semibold shrink-0 ${
                        ano.severity === 'HIGH'
                          ? 'text-rose-400'
                          : ano.severity === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {ano.severity} Severity
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Findings, Limitations & Verdict */}
        <div className="lg:col-span-5 space-y-5">
          {/* Inconclusive Determination Note if applicable */}
          {summary?.isInconclusive && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-slate-200 font-semibold text-xs tracking-wide">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Inconclusive Determination Rationale</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {summary.inconclusiveReason}
              </p>
              <div className="text-[11px] text-slate-500 italic">
                Per forensic verification standards, inconclusive evidence must never be forced into a positive or negative determination.
              </div>
            </div>
          )}

          {/* Primary Forensic Findings */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              Primary Forensic Findings
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  Primary Modality Signals:
                </span>
                <ul className="space-y-1.5">
                  {summary?.primaryIndicators.map((item, idx) => (
                    <li key={idx} className="flex items-start text-slate-200 text-xs leading-relaxed">
                      <span className="text-indigo-400 mr-2 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {summary && summary.supportingEvidence.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">
                    Corroborating Evidence:
                  </span>
                  <ul className="space-y-1 text-slate-300 text-xs">
                    {summary.supportingEvidence.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-slate-500 mr-2">-</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Technical Limitations */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              Protocol Limitations & Scope
            </h3>
            <ul className="space-y-1 text-xs text-slate-400 leading-relaxed">
              {summary?.limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-slate-500 mr-1.5">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examiner Verdict Recording Panel */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Official Examiner Verdict
              </h3>
              <div className="text-xs font-mono text-slate-400">
                Officer: <span className="text-slate-200">{user.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Official Finding:</label>
                <select
                  id="verdict-select"
                  value={verdictSelection}
                  onChange={(e) => setVerdictSelection(e.target.value as any)}
                  disabled={user.role === 'VIEWER'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="VERIFIED_AUTHENTIC">Verified Authentic (Clear)</option>
                  <option value="SUSPECTED_MORPH">Suspected Morph / Spliced Composite</option>
                  <option value="INCONCLUSIVE_INSUFFICIENT_DATA">Inconclusive / Insufficient Image Data</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Examiner Dossier Notes:</label>
                <textarea
                  id="examiner-notes-textarea"
                  value={examinerNotes}
                  onChange={(e) => setExaminerNotes(e.target.value)}
                  disabled={user.role === 'VIEWER'}
                  placeholder="Record investigative observations, corroborating donor references, or physical inspection notes..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              {user.role !== 'VIEWER' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-emerald-400 font-medium">
                    {saveSuccess && 'Verdict and audit trail updated successfully!'}
                  </span>
                  <button
                    id="save-verdict-btn"
                    onClick={handleSaveVerdict}
                    disabled={isSavingVerdict}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isSavingVerdict ? 'Recording...' : 'Commit Examiner Verdict'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multimodal Forensic Modalities Matrix (8 Signals) */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Multimodal Forensic Modalities Matrix (8 Signals)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic mathematical signals extracted from sensor noise, frequency spectrum, compression DCTs, and landmark geometry.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Standard: ISO/IEC 27037 & 30107
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary?.signals.map((sig) => {
            const isElevated = sig.status === 'ANOMALOUS' || sig.status === 'ELEVATED';
            const isNA = sig.status === 'NOT_APPLICABLE';

            return (
              <div
                key={sig.signal}
                onClick={() => setExpandedModality(sig.signal === expandedModality ? null : sig.signal)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  sig.signal === expandedModality
                    ? 'bg-slate-850 border-indigo-500/70 shadow-md'
                    : isElevated
                    ? 'bg-slate-950 border-rose-900/40 hover:border-rose-700/60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[170px]">
                    {sig.name}
                  </span>
                  <span
                    className={`text-xs font-mono font-medium ${
                      sig.status === 'ANOMALOUS'
                        ? 'text-rose-400'
                        : sig.status === 'ELEVATED'
                        ? 'text-amber-400'
                        : isNA
                        ? 'text-slate-500'
                        : 'text-emerald-400'
                    }`}
                  >
                    {sig.status === 'ANOMALOUS' ? 'Anomalous' :
                     sig.status === 'ELEVATED' ? 'Elevated' :
                     isNA ? 'N/A' : 'Nominal'}
                  </span>
                </div>

                {/* Score Bar */}
                <div className="space-y-1 mb-2.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Signal Anomaly</span>
                    <span className={`tabular-nums ${isElevated ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                      {isNA ? 'N/A' : `${(sig.score * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${sig.score * 100}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        sig.status === 'ANOMALOUS'
                          ? 'bg-rose-500'
                          : sig.status === 'ELEVATED'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{sig.summary}</p>
              </div>
            );
          })}
        </div>

        {/* Expanded Modality Specific Detail Panel */}
        {expandedModality && (
          <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                Diagnostic Metrics: {expandedModality.toUpperCase()}
              </h4>
              <button
                onClick={() => setExpandedModality(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Close details
              </button>
            </div>

            {expandedModality === 'noise' && res?.noise && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">Face Noise StdDev</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.noise.faceInteriorNoiseStdDev.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Internal facial ROI variance</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">Background Noise StdDev</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.noise.backgroundNoiseStdDev.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Surrounding perimeter sensor grain</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">Inconsistency Ratio</div>
                  <div className="text-lg font-mono font-bold text-rose-400 mt-1 tabular-nums">
                    {(res.noise.noiseInconsistencyRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Threshold: &gt; 28% indicates splicing</div>
                </div>
              </div>
            )}

            {expandedModality === 'frequency' && res?.frequency && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">High-Frequency Energy</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {(res.frequency.highFreqEnergyRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Expected natural: 14% - 35%</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">DCT High-AC Decay Rate</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.frequency.dctHighAcDecayRate.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Normal 1.5 - 2.2; &gt;2.8 indicates morph blur</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">Periodic Grid Peaks</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {res.frequency.periodicArtifactDetected ? 'DETECTED' : 'NONE'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Resampling / GAN harmonic rings</div>
                </div>
              </div>
            )}

            {expandedModality === 'texture' && res?.texture && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">LBP Texture Entropy</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.texture.lbpEntropy.toFixed(2)} bits
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Natural skin: 6.8 - 7.6 bits</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">GLCM Homogeneity</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.texture.glcmHomogeneity.toFixed(3)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">&gt;0.88 indicates synthetic smoothing</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">GLCM Contrast</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.texture.glcmContrast.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Micro-gradient co-occurrence</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">LBP Uniformity Ratio</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {(res.texture.lbpUniformityRatio * 100).toFixed(0)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Circular pattern consistency</div>
                </div>
              </div>
            )}

            {expandedModality === 'compression' && res?.compression && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">Source Encoding</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {res.compression.isJpeg ? 'JPEG Lossy' : 'Lossless (PNG)'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {res.compression.isJpeg ? `Estimated Quality ~ ${res.compression.estimatedJpegQuality}` : 'Direct pixel representation'}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">ELA Inconsistency Score</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {(res.compression.elaInconsistencyScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Face vs background resave delta</div>
                </div>
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-xs">8×8 Block Artifact Score</div>
                  <div className="text-lg font-mono font-bold text-white mt-1 tabular-nums">
                    {res.compression.blockArtifactScore.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">DCT boundary step misalignment</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
