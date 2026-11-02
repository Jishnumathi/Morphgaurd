/**
 * MorphGuard AI — Full-Page Case Registry & Investigation Directory
 * High-performance searchable, filterable repository of biometric evidence dossiers.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowUpDown,
  Download,
  Filter,
  Eye,
  HelpCircle,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
} from 'lucide-react';
import { ForensicCase } from '../types.js';

interface CaseRegistryPageProps {
  cases: ForensicCase[];
  onSelectCase: (c: ForensicCase) => void;
  onNewCase: () => void;
  initialRiskFilter?: string | null;
}

export const CaseRegistryPage: React.FC<CaseRegistryPageProps> = ({
  cases,
  onSelectCase,
  onNewCase,
  initialRiskFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>(() => {
    if (initialRiskFilter === 'HIGHER_RISK') return 'HIGHER RISK';
    if (initialRiskFilter === 'MODERATE_RISK') return 'MODERATE RISK';
    if (initialRiskFilter === 'LOW_RISK') return 'LOW RISK';
    if (initialRiskFilter === 'INCONCLUSIVE') return 'INCONCLUSIVE';
    return 'ALL';
  });
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'score-desc' | 'score-asc' | 'name-asc'>('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter & Sort
  const filteredAndSortedCases = useMemo(() => {
    return cases
      .filter((c) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          c.caseNumber.toLowerCase().includes(q) ||
          (c.targetSubjectName && c.targetSubjectName.toLowerCase().includes(q)) ||
          c.title.toLowerCase().includes(q) ||
          c.imageHashSha256.toLowerCase().includes(q);

        if (!matchesSearch) return false;

        if (selectedRiskFilter !== 'ALL') {
          if (c.results?.summary.riskLevel !== selectedRiskFilter) return false;
        }

        if (selectedVerdictFilter !== 'ALL') {
          const currentVerdict = c.analystVerdict || 'PENDING_REVIEW';
          if (currentVerdict !== selectedVerdictFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'score-desc') {
          const scoreA = a.results?.summary.riskScore || 0;
          const scoreB = b.results?.summary.riskScore || 0;
          return scoreB - scoreA;
        }
        if (sortBy === 'score-asc') {
          const scoreA = a.results?.summary.riskScore || 0;
          const scoreB = b.results?.summary.riskScore || 0;
          return scoreA - scoreB;
        }
        if (sortBy === 'name-asc') {
          const nameA = a.targetSubjectName || a.title;
          const nameB = b.targetSubjectName || b.title;
          return nameA.localeCompare(nameB);
        }
        return 0;
      });
  }, [cases, searchQuery, selectedRiskFilter, selectedVerdictFilter, sortBy]);

  // Export CSV of filtered cases
  const handleExportCsv = () => {
    const headers = [
      'Case ID',
      'Subject Name',
      'Title',
      'Created Date',
      'Risk Level',
      'Risk Score %',
      'Confidence %',
      'Analyst Verdict',
      'SHA256 Hash',
    ];
    const rows = filteredAndSortedCases.map((c) => [
      c.caseNumber,
      `"${c.targetSubjectName || 'Unknown'}"`,
      `"${c.title}"`,
      c.createdAt,
      c.results?.summary.riskLevel || 'INCONCLUSIVE',
      Math.round((c.results?.summary.riskScore || 0) * 100),
      Math.round((c.results?.summary.confidence || 0) * 100),
      c.analystVerdict || 'PENDING_REVIEW',
      c.imageHashSha256,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MorphGuard_Registry_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">
            Forensic Custody Repository · ISO/IEC 27037
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Case Registry & Investigations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Searchable repository of biometric facial evidence records, chain-of-custody hashes, and examiner verdicts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Export CSV
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

      {/* Filter and Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search case #, subject, title, or SHA-256..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Controls: Sort and View Switch */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="score-desc">Highest Risk Score</option>
                <option value="score-asc">Lowest Risk Score</option>
                <option value="name-asc">Subject Name (A-Z)</option>
              </select>
            </div>

            {/* Verdict Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedVerdictFilter}
                onChange={(e) => setSelectedVerdictFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Verdicts</option>
                <option value="SUSPECTED_MORPH">Suspected Morph</option>
                <option value="VERIFIED_AUTHENTIC">Verified Authentic</option>
                <option value="INCONCLUSIVE_INSUFFICIENT_DATA">Inconclusive Data</option>
                <option value="PENDING_REVIEW">Pending Review</option>
              </select>
            </div>

            {/* View Switcher (Table vs Grid) */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Risk Filter Category Buttons (Zero-pill text styling) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-medium">
          <span className="text-slate-500 font-mono text-[11px] mr-1 shrink-0">Risk Filter:</span>
          {[
            { id: 'ALL', label: 'All Cases', count: cases.length },
            {
              id: 'HIGHER RISK',
              label: 'Higher Risk',
              count: cases.filter((c) => c.results?.summary.riskLevel === 'HIGHER RISK').length,
              color: 'text-rose-400',
            },
            {
              id: 'MODERATE RISK',
              label: 'Moderate Risk',
              count: cases.filter((c) => c.results?.summary.riskLevel === 'MODERATE RISK').length,
              color: 'text-amber-400',
            },
            {
              id: 'LOW RISK',
              label: 'Low Risk',
              count: cases.filter((c) => c.results?.summary.riskLevel === 'LOW RISK').length,
              color: 'text-emerald-400',
            },
            {
              id: 'INCONCLUSIVE',
              label: 'Inconclusive',
              count: cases.filter((c) => c.results?.summary.riskLevel === 'INCONCLUSIVE').length,
              color: 'text-slate-400',
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedRiskFilter(item.id)}
              className={`px-3 py-1.5 rounded-md border text-xs transition-colors shrink-0 cursor-pointer ${
                selectedRiskFilter === item.id
                  ? 'bg-slate-800 text-white border-slate-600 font-semibold shadow-xs'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={item.color}>{item.label}</span>
              <span className="ml-1.5 text-[11px] text-slate-500 font-mono">({item.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <div>
          Showing <span className="text-white font-mono font-semibold">{filteredAndSortedCases.length}</span> of{' '}
          <span className="font-mono">{cases.length}</span> total cases in forensic custody
        </div>
        {(searchQuery || selectedRiskFilter !== 'ALL' || selectedVerdictFilter !== 'ALL') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRiskFilter('ALL');
              setSelectedVerdictFilter('ALL');
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredAndSortedCases.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
          <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Investigations Match Filter Criteria</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing the risk filter, or creating a new case intake.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRiskFilter('ALL');
              setSelectedVerdictFilter('ALL');
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4">Case # / Evidence Hash</th>
                  <th className="py-3 px-4">Subject & Dossier</th>
                  <th className="py-3 px-4">Risk Evaluation</th>
                  <th className="py-3 px-4">Anomalous Signals</th>
                  <th className="py-3 px-4">Examiner Verdict</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAndSortedCases.map((c) => {
                  const level = c.results?.summary.riskLevel || 'INCONCLUSIVE';
                  const isHigh = level === 'HIGHER RISK';
                  const isLow = level === 'LOW RISK';
                  const isMod = level === 'MODERATE RISK';
                  const riskScore = Math.round((c.results?.summary.riskScore || 0) * 100);
                  const confidence = Math.round((c.results?.summary.confidence || 0) * 100);
                  const elevatedSignals =
                    c.results?.summary.signals?.filter(
                      (s) => s.status === 'ELEVATED' || s.status === 'ANOMALOUS'
                    ) || [];

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Case Number & Hash */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                          {c.caseNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                          SHA: {c.imageHashSha256.substring(0, 14)}...
                        </div>
                      </td>

                      {/* Subject Thumbnail & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={c.imageUrl}
                            alt={c.title}
                            className="w-10 h-10 rounded-md object-cover border border-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[180px]">
                              {c.targetSubjectName || 'Unknown Subject'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {c.title}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Risk Assessment */}
                      <td className="py-3.5 px-4">
                        <div
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
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Risk: {riskScore}% · Conf: {confidence}%
                        </div>
                      </td>

                      {/* Anomalous Modalities */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {elevatedSignals.length > 0 ? (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-slate-200">
                              {elevatedSignals.length} signal(s) elevated
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                              {elevatedSignals.map((m) => m.name).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Organic characteristics</span>
                        )}
                      </td>

                      {/* Examiner Verdict */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-[11px] text-slate-200 font-medium">
                          {c.analystVerdict ? c.analystVerdict.replace(/_/g, ' ') : 'PENDING REVIEW'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {c.createdBy?.split('@')[0] || 'System'}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(c);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 transition-all cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedCases.map((c) => {
            const level = c.results?.summary.riskLevel || 'INCONCLUSIVE';
            const isHigh = level === 'HIGHER RISK';
            const isLow = level === 'LOW RISK';
            const isMod = level === 'MODERATE RISK';
            const riskScore = Math.round((c.results?.summary.riskScore || 0) * 100);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c)}
                className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <img
                      src={c.imageUrl}
                      alt={c.title}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">{c.caseNumber}</span>
                        <span
                          className={`text-xs font-bold ${
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
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate mt-1">
                        {c.targetSubjectName || 'Unknown Subject'}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{c.title}</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Risk Assessment:</span>
                      <span className="font-mono text-white font-semibold">{riskScore}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Examiner Verdict:</span>
                      <span className="font-mono text-slate-200">
                        {c.analystVerdict ? c.analystVerdict.replace(/_/g, ' ') : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                  <span className="text-indigo-400 group-hover:text-indigo-300 font-sans font-medium flex items-center">
                    View Dossier <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
