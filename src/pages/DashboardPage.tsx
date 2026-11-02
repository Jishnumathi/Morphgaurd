/**
 * MorphGuard AI — Executive Forensic Dashboard Page
 * High-level caseload intelligence, risk distributions, signal prevalence,
 * and quick-access benchmark dossiers.
 */

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Plus,
  ArrowRight,
  Activity,
  Layers,
  UploadCloud,
  ScrollText,
  FileText,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { ForensicCase, DashboardStatistics } from '../types.js';

interface DashboardPageProps {
  cases: ForensicCase[];
  statistics: DashboardStatistics;
  onSelectCase: (c: ForensicCase) => void;
  onNavigate: (route: string) => void;
  onNewCase: () => void;
  onQuickLoadSample: (sampleId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  cases,
  statistics,
  onSelectCase,
  onNavigate,
  onNewCase,
  onQuickLoadSample,
}) => {
  // Flagged high-risk cases for rapid triage
  const highRiskCases = cases.filter(
    (c) => c.results?.summary.riskLevel === 'HIGHER RISK'
  );

  // Recent 5 investigations
  const recentCases = [...cases]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Editorial Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Forensic Screening Engine Operational</span>
            <span>·</span>
            <span>ISO/IEC 27037 Validated</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Forensic Command Dashboard
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Central operational hub for multi-signal facial morph screening, tamper-evident evidence registry,
            and high-throughput biometric triage across identity issuing authorities.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('#/cases')}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors cursor-pointer"
          >
            <span>Browse All Cases</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
          </button>
          <button
            onClick={onNewCase}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Investigation
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Caseload */}
        <div
          onClick={() => onNavigate('#/cases')}
          className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-slate-700 cursor-pointer group"
        >
          <div className="text-xs font-medium text-slate-400 group-hover:text-slate-300">Total Cases</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {cases.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Verified records</span>
            <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>

        {/* Higher Risk */}
        <div
          onClick={() => onNavigate('#/cases?risk=HIGHER_RISK')}
          className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-rose-900/50 cursor-pointer group"
        >
          <div className="text-xs font-medium text-rose-400 flex items-center justify-between">
            <span>Higher Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {statistics.highRiskCases}
          </div>
          <div className="text-[11px] text-rose-400/70 mt-1">Suspected morph/splice</div>
        </div>

        {/* Moderate Risk */}
        <div
          onClick={() => onNavigate('#/cases?risk=MODERATE_RISK')}
          className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-amber-900/50 cursor-pointer group"
        >
          <div className="text-xs font-medium text-amber-400 flex items-center justify-between">
            <span>Moderate Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {statistics.moderateRiskCases}
          </div>
          <div className="text-[11px] text-amber-400/70 mt-1">Elevated anomalies</div>
        </div>

        {/* Low Risk */}
        <div
          onClick={() => onNavigate('#/cases?risk=LOW_RISK')}
          className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-emerald-900/50 cursor-pointer group"
        >
          <div className="text-xs font-medium text-emerald-400 flex items-center justify-between">
            <span>Low Risk</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {statistics.lowRiskCases}
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">Organic biometric traits</div>
        </div>

        {/* Inconclusive */}
        <div
          onClick={() => onNavigate('#/cases?risk=INCONCLUSIVE')}
          className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-slate-700 cursor-pointer group"
        >
          <div className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span>Inconclusive</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300 mt-1 tabular-nums">
            {statistics.inconclusiveCases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Blur / Sub-resolution</div>
        </div>

        {/* Multi-Signal Confidence */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-slate-700">
          <div className="text-xs font-medium text-indigo-400">Mean Confidence</div>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1 tabular-nums">
            {(statistics.averageConfidence * 100).toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Modality consensus</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('#/cases')}
          className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Investigations</span>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-2">Case Registry</h3>
          <p className="text-xs text-slate-400 mt-1">
            Searchable directory with deep filtering by risk score, officer verdict, and SHA-256 integrity hash.
          </p>
        </div>

        <div
          onClick={() => onNavigate('#/batch')}
          className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">High Throughput</span>
            <UploadCloud className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-2">Batch Screening</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ingest and triage multiple passport applications concurrently with live risk queue and CSV export.
          </p>
        </div>

        <div
          onClick={() => onNavigate('#/audit')}
          className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Tamper-Evident</span>
            <ScrollText className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-2">Cryptographic Ledger</h3>
          <p className="text-xs text-slate-400 mt-1">
            Immutable SHA-256 block hash chain enforcing ISO/IEC 27037 chain-of-custody compliance.
          </p>
        </div>

        <div
          onClick={() => onNavigate('#/methodology')}
          className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">Documentation</span>
            <FileText className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-2">Forensic Methodology</h3>
          <p className="text-xs text-slate-400 mt-1">
            Mathematical definitions of the 8 signal modalities, NIST FRVT benchmarks, and model card.
          </p>
        </div>
      </div>

      {/* Main 2-Column Section: Signal Distribution + Benchmark Reference Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Signal Distribution */}
        <div className="lg:col-span-7 bg-slate-900/50 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Modality Signal Anomaly Prevalence
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Active Registry Population
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {statistics.signalDistribution.map((sig, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{sig.signal}</span>
                  <div className="flex items-center space-x-2 font-mono text-slate-400">
                    <span className="tabular-nums font-semibold text-slate-200">
                      {sig.elevatedPercentage}% elevated
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      sig.elevatedPercentage > 35
                        ? 'bg-rose-500'
                        : sig.elevatedPercentage > 20
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(sig.elevatedPercentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              Signals are orthogonal: decisions require multi-modality consensus before raising risk verdicts.
            </span>
            <button
              onClick={() => onNavigate('#/methodology')}
              className="text-indigo-400 hover:text-indigo-300 font-medium whitespace-nowrap ml-2 cursor-pointer"
            >
              Read Algorithms →
            </button>
          </div>
        </div>

        {/* Benchmark Test Samples for Fast Triage */}
        <div className="lg:col-span-5 bg-slate-900/50 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Benchmark Evaluation Samples
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Instant Inspection</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Calibrated test dossiers representing typical immigration and border control scenarios. Click any dossier to open the full inspection workstation.
          </p>

          <div className="space-y-2.5">
            {cases.slice(0, 3).map((sampleCase) => {
              const isHigh = sampleCase.results?.summary.riskLevel === 'HIGHER RISK';
              const isLow = sampleCase.results?.summary.riskLevel === 'LOW RISK';
              return (
                <div
                  key={sampleCase.id}
                  onClick={() => onSelectCase(sampleCase)}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-900 hover:border-slate-700 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={sampleCase.imageUrl}
                      alt={sampleCase.title}
                      className="w-10 h-10 rounded-md object-cover border border-slate-800 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {sampleCase.targetSubjectName || sampleCase.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {sampleCase.caseNumber} · {sampleCase.results?.summary.riskLevel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <span
                      className={`text-[10px] font-semibold ${
                        isHigh
                          ? 'text-rose-400'
                          : isLow
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {Math.round((sampleCase.results?.summary.riskScore || 0) * 100)}% Risk
                    </span>
                    <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={onNewCase}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Intake New Facial Evidence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flagged High-Risk Cases Alert Feed */}
      {highRiskCases.length > 0 && (
        <div className="bg-rose-950/20 rounded-xl border border-rose-900/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-rose-200">
                Action Required: {highRiskCases.length} Higher-Risk Biometric Dossier(s)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('#/cases?risk=HIGHER_RISK')}
              className="text-xs text-rose-300 hover:text-rose-100 font-medium cursor-pointer"
            >
              View in Registry →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {highRiskCases.slice(0, 3).map((hrCase) => (
              <div
                key={hrCase.id}
                onClick={() => onSelectCase(hrCase)}
                className="p-3 bg-slate-950/80 rounded-lg border border-rose-900/50 hover:border-rose-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={hrCase.imageUrl}
                    alt={hrCase.title}
                    className="w-12 h-12 rounded object-cover border border-rose-900/60 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white group-hover:text-rose-300 transition-colors truncate">
                      {hrCase.targetSubjectName || hrCase.title}
                    </div>
                    <div className="text-[11px] font-mono text-rose-400">
                      Score: {Math.round((hrCase.results?.summary.riskScore || 0) * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {hrCase.analystVerdict === 'PENDING_REVIEW'
                        ? 'Pending Examiner Signing'
                        : `Verdict: ${hrCase.analystVerdict?.replace(/_/g, ' ')}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Investigations Table Preview */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Recent Case Intake</h3>
          </div>
          <button
            onClick={() => onNavigate('#/cases')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
          >
            Open Full Directory ({cases.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-3">Risk Assessment</th>
                <th className="py-2.5 px-3">Primary Indicator</th>
                <th className="py-2.5 px-3">Examiner Verdict</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentCases.map((c) => {
                const level = c.results?.summary.riskLevel || 'INCONCLUSIVE';
                const isHigh = level === 'HIGHER RISK';
                const isLow = level === 'LOW RISK';
                const isMod = level === 'MODERATE RISK';

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => onSelectCase(c)}
                  >
                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold group-hover:text-indigo-400">
                      {c.caseNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      <div className="font-medium">{c.targetSubjectName || 'Unknown Subject'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{c.title}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold ${
                          isHigh
                            ? 'text-rose-400'
                            : isLow
                            ? 'text-emerald-400'
                            : isMod
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {level}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {c.results?.summary.primaryIndicators?.[0] || 'Organic facial traits'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-slate-300">
                        {c.analystVerdict ? c.analystVerdict.replace(/_/g, ' ') : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
