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
  Maximize2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
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
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not generate PDF report. Please check server logs.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Color mappings for Risk
  let riskBadgeStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
  let RiskIcon = ShieldCheck;
  if (riskLevel === 'HIGHER RISK') {
    riskBadgeStyle = 'bg-rose-950/80 text-rose-300 border-rose-700/60';
    RiskIcon = ShieldAlert;
  } else if (riskLevel === 'MODERATE RISK') {
    riskBadgeStyle = 'bg-amber-950/80 text-amber-300 border-amber-700/60';
    RiskIcon = AlertTriangle;
  } else if (riskLevel === 'INCONCLUSIVE') {
    riskBadgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
    RiskIcon = HelpCircle;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          id="back-to-dashboard-btn"
          onClick={onBack}
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Case Registry
        </button>

        <div className="flex items-center space-x-3">
          {/* Ask AI Copilot */}
          <button
            id="open-assistant-btn"
            onClick={() => onOpenAssistant(currentCase)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900 transition-colors shadow-sm"
          >
            <Bot className="w-4 h-4 mr-1.5 text-indigo-400" />
            Forensic AI Copilot
          </button>

          {/* Download Official Report */}
          <button
            id="download-pdf-report-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            {isDownloadingPdf ? 'Generating PDF...' : 'Export PDF Dossier'}
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                {currentCase.caseNumber}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">{currentCase.title}</h2>
              {currentCase.isSampleCase && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                  BENCHMARK REFERENCE CASE
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Subject: <strong className="text-slate-200">{currentCase.targetSubjectName || 'Unspecified'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {currentCase.analystAgency}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {new Date(currentCase.createdAt).toLocaleString()}
              </span>
              <span>
                File: <span className="font-mono text-slate-300">{currentCase.filename}</span> ({(currentCase.fileSizeBytes / 1024).toFixed(1)} KB)
              </span>
            </div>
          </div>

          {/* Primary Assessment Badge */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${riskBadgeStyle}`}>
              <RiskIcon className="w-5 h-5" />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Assessment</div>
                <div className="text-sm font-bold tracking-tight">{riskLevel}</div>
              </div>
            </div>

            {summary && !summary.isInconclusive && (
              <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Risk Index</div>
                <div className="text-base font-bold font-mono text-white">
                  {(summary.riskScore * 100).toFixed(0)}%
                </div>
              </div>
            )}

            {summary && (
              <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-right">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Confidence</div>
                <div className="text-base font-bold font-mono text-indigo-400">
                  {(summary.confidence * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cryptographic SHA-256 Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 font-mono text-slate-400">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">SHA-256 Hash:</span>
            <span className="text-slate-300 select-all bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] truncate max-w-[280px] sm:max-w-md">
              {currentCase.imageHashSha256}
            </span>
            <button
              onClick={handleCopyHash}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Copy SHA-256 Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
            <span>Dimensions: {currentCase.imageDimensions.width} x {currentCase.imageDimensions.height} px</span>
            <span>•</span>
            <span>Format: {res?.imageQuality.format.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Viewer & Right Assessment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer */}
        <div className="lg:col-span-7 space-y-4">
          <ImageForensicViewer currentCase={currentCase} />

          {/* Suspicious Regions Localized List */}
          {summary && summary.localizedAnomalies.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Localized Suspicious Biometric Regions ({summary.localizedAnomalies.length})
              </h3>
              <div className="space-y-2">
                {summary.localizedAnomalies.map((ano, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block mb-0.5">{ano.region}</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{ano.description}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        ano.severity === 'HIGH'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : ano.severity === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ano.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Forensic Synthesis & Decision Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Inconclusive Banner if applicable */}
          {summary?.isInconclusive && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>INCONCLUSIVE DETERMINATION RATIONALE</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {summary.inconclusiveReason}
              </p>
              <div className="text-[11px] text-slate-400 italic">
                Per forensic verification standards, inconclusive evidence must never be forced into a positive or negative determination.
              </div>
            </div>
          )}

          {/* Primary Indicators & Supporting Evidence */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Primary Forensic Findings
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
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
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
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

          {/* Technical Limitations Card (Mandatory Requirement) */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Forensic Protocol Limitations
            </h3>
            <ul className="space-y-1 text-[11px] text-slate-400 leading-relaxed">
              {summary?.limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-slate-500 mr-1.5">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Official Examiner Verdict Card */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Examiner Biometric Verdict & Notes
              </h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                {user.authProvider === 'google' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Google Verified
                  </span>
                )}
                <span className="truncate max-w-[150px]">{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Official Decision:</label>
                <select
                  id="verdict-select"
                  value={verdictSelection}
                  onChange={(e) => setVerdictSelection(e.target.value as any)}
                  disabled={user.role === 'VIEWER'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="VERIFIED_AUTHENTIC">VERIFIED AUTHENTIC (CLEAR)</option>
                  <option value="SUSPECTED_MORPH">SUSPECTED MORPH / SPLICED IMAGE</option>
                  <option value="INCONCLUSIVE_INSUFFICIENT_DATA">INCONCLUSIVE / INSUFFICIENT DATA</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Dossier Notes:</label>
                <textarea
                  id="examiner-notes-textarea"
                  value={examinerNotes}
                  onChange={(e) => setExaminerNotes(e.target.value)}
                  disabled={user.role === 'VIEWER'}
                  placeholder="Record investigative observations, donor references, or corroborating physical document findings..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {user.role !== 'VIEWER' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {saveSuccess && 'Verdict and audit trail updated successfully!'}
                  </span>
                  <button
                    id="save-verdict-btn"
                    onClick={handleSaveVerdict}
                    disabled={isSavingVerdict}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    {isSavingVerdict ? 'Recording...' : 'Commit Examiner Verdict'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multimodal Forensic Signals Deep-Dive Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Multimodal Forensic Modalities Matrix (8 Signals)
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic mathematical outputs extracted from spatial, frequency, and biometric domains.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Calibrated Model Version: v2.4-ISO27037
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
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  sig.signal === expandedModality
                    ? 'bg-slate-800/90 border-indigo-500/70 shadow-md'
                    : isElevated
                    ? 'bg-slate-950 border-rose-900/40 hover:border-rose-700/60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300 truncate max-w-[170px]">
                    {sig.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                      sig.status === 'ANOMALOUS'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : sig.status === 'ELEVATED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : isNA
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {sig.status}
                  </span>
                </div>

                {/* Score Bar */}
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Anomaly Score</span>
                    <span className={isElevated ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                      {isNA ? 'N/A' : `${(sig.score * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${sig.score * 100}%` }}
                      className={`h-full rounded-full ${
                        sig.status === 'ANOMALOUS'
                          ? 'bg-rose-500'
                          : sig.status === 'ELEVATED'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{sig.summary}</p>
              </div>
            );
          })}
        </div>

        {/* Expanded Modality Specific Detail Panel */}
        {expandedModality && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-indigo-950/60 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 font-mono">
                Detailed Modality Diagnostics: {expandedModality.toUpperCase()}
              </h4>
              <button
                onClick={() => setExpandedModality(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close details
              </button>
            </div>

            {expandedModality === 'noise' && res?.noise && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Face Noise StdDev</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.noise.faceInteriorNoiseStdDev.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Internal facial ROI variance</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Background Noise StdDev</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.noise.backgroundNoiseStdDev.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Surrounding perimeter sensor grain</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Inconsistency Ratio</div>
                  <div className="text-base font-mono font-bold text-rose-400 mt-1">
                    {(res.noise.noiseInconsistencyRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Threshold: &gt; 28% indicates splicing</div>
                </div>
              </div>
            )}

            {expandedModality === 'frequency' && res?.frequency && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">High-Frequency Energy</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {(res.frequency.highFreqEnergyRatio * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Expected natural: 14% - 35%</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">DCT High-AC Decay Rate</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.frequency.dctHighAcDecayRate.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Normal 1.5 - 2.2; &gt;2.8 indicates morph blur</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Periodic Grid Peaks</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.frequency.periodicArtifactDetected ? 'DETECTED' : 'NONE'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Resampling / GAN harmonic rings</div>
                </div>
              </div>
            )}

            {expandedModality === 'texture' && res?.texture && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">LBP Texture Entropy</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.texture.lbpEntropy.toFixed(2)} bits
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Natural skin: 6.8 - 7.6 bits</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">GLCM Homogeneity</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.texture.glcmHomogeneity.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">&gt;0.88 indicates synthetic smoothing</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">GLCM Contrast</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.texture.glcmContrast.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Micro-gradient co-occurrence</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">LBP Uniformity Ratio</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {(res.texture.lbpUniformityRatio * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Circular pattern consistency</div>
                </div>
              </div>
            )}

            {expandedModality === 'compression' && res?.compression && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Source Encoding</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.compression.isJpeg ? 'JPEG Lossy' : 'Lossless (PNG)'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {res.compression.isJpeg ? `Estimated Quality ~ ${res.compression.estimatedJpegQuality}` : 'Direct pixel representation'}
                  </div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">ELA Inconsistency Score</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {(res.compression.elaInconsistencyScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Face vs background resave delta</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">8x8 Block Artifact Score</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.compression.blockArtifactScore.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">DCT boundary step misalignment</div>
                </div>
              </div>
            )}

            {expandedModality === 'geometry' && res?.geometry && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Ocular Alignment Tilt</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.geometry.eyeHorizontalTiltDeg.toFixed(2)}°
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Tolerance: &lt; 6.5°</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Bilateral Facial Symmetry</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.geometry.facialSymmetryScore.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Human biological norm: 0.70 - 0.95</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Cranial Proportions</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.geometry.proportionConsistencyScore.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Rule of fifths ocular ratio</div>
                </div>
              </div>
            )}

            {expandedModality === 'edge' && res?.edge && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Boundary Seam Discontinuity</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {(res.edge.boundaryGradientDiscontinuity * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Feathering or splice halo detection along jawline/hairline</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Contour Blur Anomaly</div>
                  <div className="text-base font-mono font-bold text-white mt-1">
                    {res.edge.contourBlurAnomaly.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Artificial edge gradient suppression</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata & Provenance Section */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          EXIF Metadata & Provenance Headers
        </h3>

        {res?.metadata.metadataPresent ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Camera Hardware</span>
              <span className="font-semibold text-slate-200">
                {res.metadata.cameraMake || 'Unknown'} {res.metadata.cameraModel || ''}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Software Signature</span>
              <span className={`font-semibold ${res.metadata.signalScore > 0.5 ? 'text-rose-400' : 'text-slate-200'}`}>
                {res.metadata.softwareTag || 'None Registered'}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Capture Timestamp</span>
              <span className="font-semibold text-slate-200">{res.metadata.creationDate || 'Not Available'}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">GPS Geolocation</span>
              <span className="font-semibold text-slate-200">{res.metadata.hasGps ? 'Present' : 'Not Recorded'}</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
            Metadata headers are absent or stripped. (Normal for messaging apps and web uploads; not considered standalone evidence of forgery).
          </div>
        )}
      </div>

      {/* Mandatory Statutory Disclaimer Footer */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 text-slate-400 text-xs leading-relaxed">
        <p className="font-semibold text-slate-300 mb-1">STATUTORY FORENSIC DISCLAIMER:</p>
        <p>
          MorphGuard AI provides algorithmic digital image forensic screening to assist authorized examiners.
          These outputs reflect probabilistic biometric and signal-processing measurements and must not be construed
          as a standalone legal conclusion. Final investigative or judicial determinations require comprehensive
          examination of physical documents, original sensor RAW files, or certified institutional verification.
        </p>
      </div>
    </div>
  );
};
