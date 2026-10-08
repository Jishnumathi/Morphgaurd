/**
 * MorphGuard AI — Forensic Command Center Dashboard
 * Displays operational caseload metrics, risk distributions, signal prevalence,
 * and searchable case dossiers backed by real database state.
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  FileDown,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
} from 'lucide-react';
import { ForensicCase, DashboardStatistics, RiskLevel } from '../types.js';

interface DashboardProps {
  cases: ForensicCase[];
  statistics: DashboardStatistics;
  onSelectCase: (c: ForensicCase) => void;
  onNewCase: () => void;
  onQuickLoadSample: (sampleId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  cases,
  statistics,
  onSelectCase,
  onNewCase,
  onQuickLoadSample,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.caseNumber.toLowerCase().includes(q) ||
      (c.targetSubjectName && c.targetSubjectName.toLowerCase().includes(q)) ||
      c.title.toLowerCase().includes(q) ||
      c.imageHashSha256.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedRiskFilter === 'ALL') return true;
    return c.results?.summary.riskLevel === selectedRiskFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Welcome & Caseload Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
              SYSTEM OPERATIONAL — FORENSIC SCREENING ENGINE ONLINE
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Biometric Image Forensics Dossier Registry
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5 leading-relaxed">
            Multi-signal analysis pipeline active: Sensor noise residuals, 2D FFT harmonics, LBP/GLCM micro-textures,
            JPEG ELA recompression grids, and facial symmetry biometrics.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="create-new-case-banner-btn"
            onClick={onNewCase}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Investigation Case
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Cases */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Cases</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{cases.length}</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center">
            <Database className="w-3 h-3 mr-1 text-slate-400" />
            Registry verified
          </div>
        </div>

        {/* Higher Risk */}
        <div className="bg-slate-900 rounded-xl border border-rose-950/60 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Higher Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {statistics.highRiskCases}
          </div>
          <div className="text-[10px] text-rose-400/80 mt-1">Suspected morph/splice</div>
        </div>

        {/* Moderate Risk */}
        <div className="bg-slate-900 rounded-xl border border-amber-950/60 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Moderate Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {statistics.moderateRiskCases}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1">Elevated anomalies</div>
        </div>

        {/* Low Risk */}
        <div className="bg-slate-900 rounded-xl border border-emerald-950/60 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Low Risk</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {statistics.lowRiskCases}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Consistent organic</div>
        </div>

        {/* Inconclusive */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Inconclusive</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-300 mt-1">
            {statistics.inconclusiveCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Blur / Sub-resolution</div>
        </div>

        {/* Average Confidence */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3.5 shadow-sm">
          <div className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Avg Confidence</div>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">
            {(statistics.averageConfidence * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Multi-signal agreement</div>
        </div>
      </div>

      {/* Forensic Signal Distribution & Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Signal Elevated Frequency Breakdown */}
        <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Forensic Modality Anomaly Frequency across Caseload
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Sample Population: {cases.length}</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {statistics.signalDistribution.map((sig, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium text-[11px]">{sig.signal}</span>
                  <span className="text-slate-400 font-mono text-[11px]">{sig.elevatedPercentage}% flagged</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${sig.elevatedPercentage}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Calibration Reference Benchmark Cases */}
        <div className="lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Verification Reference Benchmark Cases
            </h3>
          </div>
          <p className="text-[11px] text-slate-400">
            Pre-calibrated verification targets configured for immediate inspection of specific forensic outcomes:
          </p>

          <div className="space-y-2">
            <button
              onClick={() => onQuickLoadSample('case-demo-001')}
              className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-700/60 transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    LOW RISK
                  </span>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    MG-2026-0814
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Authentic Passport Photo (Natural LBP & CMOS Noise)</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onQuickLoadSample('case-demo-002')}
              className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-700/60 transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                    HIGHER RISK
                  </span>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-rose-400 transition-colors">
                    MG-2026-0922
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Dual-Donor Morph Blend (Noise & Spectral Anomaly)</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onQuickLoadSample('case-demo-003')}
              className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-600 transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    INCONCLUSIVE
                  </span>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                    MG-2026-0509
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">CCTV Crop (Sub-Resolution 94x112 & Motion Blur)</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Case Dossiers Table Header & Filter Controls */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Investigative Cases ({filteredCases.length})
            </h3>

            {/* Filter Tabs */}
            <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['ALL', 'HIGHER RISK', 'MODERATE RISK', 'LOW RISK', 'INCONCLUSIVE'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedRiskFilter(filter)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    selectedRiskFilter === filter
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="case-search-input"
              type="text"
              placeholder="Search ID, Subject, or Hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Cases Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Subject & File</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Risk Index</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Examiner Verdict</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 text-xs">
                    No forensic case records found matching your search or filter parameters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const summary = c.results?.summary;
                  const level = summary?.riskLevel || 'INCONCLUSIVE';

                  let badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                  if (level === 'HIGHER RISK') badgeStyle = 'bg-rose-950 text-rose-300 border-rose-800';
                  else if (level === 'MODERATE RISK') badgeStyle = 'bg-amber-950 text-amber-300 border-amber-800';
                  else if (level === 'INCONCLUSIVE') badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      {/* Case ID */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                        {c.caseNumber}
                      </td>

                      {/* Subject & File */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {c.targetSubjectName || 'Unregistered Subject'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                          {c.filename}
                        </div>
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${badgeStyle}`}>
                          {level}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-4 font-mono">
                        {summary && !summary.isInconclusive ? (
                          <span className="font-bold text-slate-200">
                            {(summary.riskScore * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3 px-4 font-mono">
                        {summary ? (
                          <span className="text-indigo-300 font-semibold">
                            {(summary.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      {/* Examiner Verdict */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-mono text-slate-300">
                          {c.analystVerdict ? c.analystVerdict.replace(/_/g, ' ') : 'PENDING REVIEW'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Inspect Dossier
                          <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
