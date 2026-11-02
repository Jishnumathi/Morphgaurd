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
  Plus,
  ArrowUpRight,
  Activity,
  Database,
  SlidersHorizontal,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-mono tracking-wider text-slate-400">
            Facial Biometrics & Image Integrity Screening
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Forensic Investigation Registry
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Multi-signal facial image screening platform adhering to ISO/IEC 27037 chain-of-custody protocols.
            Detects donor splicing, GAN morphs, recompression artifacts, and sensor noise inconsistencies.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            id="create-new-case-banner-btn"
            onClick={onNewCase}
            className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Investigation
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Caseload */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-slate-700">
          <div className="text-xs font-medium text-slate-400">Total Cases</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {cases.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Verified records</div>
        </div>

        {/* Higher Risk */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-rose-900/50">
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
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-amber-900/50">
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
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-emerald-900/50">
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
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 transition-colors hover:border-slate-700">
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
          <div className="text-[11px] text-slate-500 mt-1">Modality alignment</div>
        </div>
      </div>

      {/* Modality Signal Prevalence & Calibration Reference Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Signal Distribution */}
        <div className="lg:col-span-7 bg-slate-900/50 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Forensic Signal Elevated Rates
              </h3>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Population: <span className="text-slate-300 tabular-nums">{cases.length}</span> dossiers
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {statistics.signalDistribution.map((sig, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{sig.signal}</span>
                  <span className="text-slate-400 font-mono tabular-nums">{sig.elevatedPercentage}% flagged</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${sig.elevatedPercentage}%` }}
                    className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Reference Benchmark Dossiers */}
        <div className="lg:col-span-5 bg-slate-900/50 rounded-xl border border-slate-800/80 p-5 space-y-4">
          <div className="border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Calibrated Benchmark Cases
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardized ground-truth test cases for examiner calibration:
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Low Risk */}
            <div
              onClick={() => onQuickLoadSample('case-demo-001')}
              className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-emerald-600/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-emerald-400">Low Risk</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">MG-2026-0814</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                Authentic biometric passport sample with natural CMOS sensor PRNU noise.
              </div>
            </div>

            {/* Higher Risk */}
            <div
              onClick={() => onQuickLoadSample('case-demo-002')}
              className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-rose-600/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-rose-400">Higher Risk</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">MG-2026-0922</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
              </div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                Dual-donor facial blend with severe Laplacian noise disparity and FFT anomalies.
              </div>
            </div>

            {/* Inconclusive */}
            <div
              onClick={() => onQuickLoadSample('case-demo-003')}
              className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-400">Inconclusive</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">MG-2026-0509</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
              <div className="text-xs text-slate-400 mt-1 leading-snug">
                Sub-resolution CCTV surveillance crop (94×112) with high motion blur.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Dossiers Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-white tracking-tight">
              Investigative Cases
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredCases.length} of {cases.length})
            </span>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              {(['ALL', 'HIGHER RISK', 'MODERATE RISK', 'LOW RISK', 'INCONCLUSIVE'] as const).map((filter) => {
                const label = filter === 'ALL' ? 'All' : filter.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
                return (
                  <button
                    key={filter}
                    onClick={() => setSelectedRiskFilter(filter)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      selectedRiskFilter === filter
                        ? 'bg-slate-800 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="case-search-input"
              type="text"
              placeholder="Search ID, subject, or SHA-256..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4 font-medium">Case ID</th>
                <th className="py-3 px-4 font-medium">Subject & Filename</th>
                <th className="py-3 px-4 font-medium">Risk Assessment</th>
                <th className="py-3 px-4 font-medium text-right">Risk Index</th>
                <th className="py-3 px-4 font-medium text-right">Confidence</th>
                <th className="py-3 px-4 font-medium">Registered</th>
                <th className="py-3 px-4 font-medium">Examiner Verdict</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                    No forensic case records found matching query parameters.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const summary = c.results?.summary;
                  const level = summary?.riskLevel || 'INCONCLUSIVE';

                  let levelColor = 'text-slate-400';
                  if (level === 'HIGHER RISK') levelColor = 'text-rose-400 font-semibold';
                  else if (level === 'MODERATE RISK') levelColor = 'text-amber-400 font-medium';
                  else if (level === 'LOW RISK') levelColor = 'text-emerald-400 font-medium';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Case ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-indigo-400 whitespace-nowrap">
                        {c.caseNumber}
                      </td>

                      {/* Subject & File */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {c.targetSubjectName || 'Unregistered Subject'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[220px]">
                          {c.filename}
                        </div>
                      </td>

                      {/* Risk Assessment (Zero-pill clean typography) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-xs ${levelColor}`}>
                          {level === 'HIGHER RISK' ? 'Higher Risk' :
                           level === 'MODERATE RISK' ? 'Moderate Risk' :
                           level === 'LOW RISK' ? 'Low Risk' : 'Inconclusive'}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-right">
                        {summary && !summary.isInconclusive ? (
                          <span className="font-semibold text-slate-200">
                            {(summary.riskScore * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 font-mono tabular-nums text-right">
                        {summary ? (
                          <span className="text-slate-300">
                            {(summary.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs font-mono tabular-nums whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Examiner Verdict */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-300">
                          {c.analystVerdict ? c.analystVerdict.replace(/_/g, ' ') : 'Pending Review'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="inline-flex items-center text-xs text-indigo-400 group-hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                        >
                          Inspect
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
