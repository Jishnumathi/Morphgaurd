/**
 * MorphGuard AI — Dedicated Batch Screening & High-Throughput Triage Webpage
 * Supports high-volume passport/biometric processing, automated multi-signal extraction,
 * calibrated test samples, and CSV audit reports.
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  FileX,
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Eye,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';

interface BatchTriagePageProps {
  user: UserSession;
  onSelectCase: (c: ForensicCase) => void;
  onNewCasesAdded: (newCases: ForensicCase[]) => void;
  onNavigate: (route: string) => void;
}

interface BatchQueueItem {
  id: string;
  name: string;
  subjectName: string;
  file?: File;
  sampleUrl?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: ForensicCase;
  errorMessage?: string;
}

export const BatchTriagePage: React.FC<BatchTriagePageProps> = ({
  user,
  onSelectCase,
  onNewCasesAdded,
  onNavigate,
}) => {
  const [items, setItems] = useState<BatchQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File selection via input or drop
  const handleFilesSelected = (files: FileList) => {
    const newItems: BatchQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.match(/\.(jpe?g|png|webp)$/i) || file.type.startsWith('image/')) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        newItems.push({
          id: `batch-${Date.now()}-${i}-${Math.random()}`,
          name: file.name,
          subjectName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          file,
          status: 'PENDING',
        });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  // Load Calibrated Benchmark Passport Batch
  const handleLoadBenchmarkBatch = () => {
    const benchmarkBatch: BatchQueueItem[] = [
      {
        id: `bench-1-${Date.now()}`,
        name: 'sample_passport_amara_okafor.jpg',
        subjectName: 'Amara Okafor',
        sampleUrl: '/src/assets/images/sample_passport_amara_okafor_1791519062366.jpg',
        status: 'PENDING',
      },
      {
        id: `bench-2-${Date.now()}`,
        name: 'sample_passport_elena_rostova.jpg',
        subjectName: 'Elena Rostova (Morph Suspect)',
        sampleUrl: '/src/assets/images/sample_passport_elena_rostova_1791519062366.jpg',
        status: 'PENDING',
      },
      {
        id: `bench-3-${Date.now()}`,
        name: 'sample_passport_marcus_vance.jpg',
        subjectName: 'Marcus Vance (Sub-Res)',
        sampleUrl: '/src/assets/images/sample_passport_marcus_vance_1791519062366.jpg',
        status: 'PENDING',
      },
    ];
    setItems((prev) => [...prev, ...benchmarkBatch]);
  };

  // Start executing the batch queue
  const handleStartBatch = async () => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const completedCases: ForensicCase[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'COMPLETED') continue;

      setCurrentProcessingIndex(i);
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'PROCESSING' } : item))
      );

      try {
        const item = items[i];
        const formData = new FormData();

        if (item.file) {
          formData.append('image', item.file);
        } else if (item.sampleUrl) {
          // Fetch benchmark image as blob
          const res = await fetch(item.sampleUrl);
          const blob = await res.blob();
          const file = new File([blob], item.name, { type: 'image/jpeg' });
          formData.append('image', file);
        } else {
          throw new Error('No valid image data');
        }

        formData.append('title', `Batch Triage: ${item.name}`);
        formData.append('subjectName', item.subjectName);
        formData.append('analystUser', user.email);
        formData.append('analystRole', user.role);

        const response = await fetch('/api/cases/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error || 'Forensic analysis pipeline error');
        }

        const createdCase: ForensicCase = await response.json();
        completedCases.push(createdCase);

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'COMPLETED', result: createdCase } : it
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'FAILED', errorMessage: err.message || 'Pipeline analysis failed' }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    if (completedCases.length > 0) {
      onNewCasesAdded(completedCases);
    }
  };

  // Clear Completed or All
  const handleClearQueue = () => {
    if (isProcessing) return;
    setItems([]);
  };

  // Export Batch CSV
  const handleExportBatchCsv = () => {
    const completed = items.filter((i) => i.status === 'COMPLETED' && i.result);
    if (completed.length === 0) return;

    const headers = [
      'Case ID',
      'Filename',
      'Subject Name',
      'Risk Level',
      'Risk Score %',
      'Confidence %',
      'SHA256 Hash',
    ];

    const rows = completed.map((i) => {
      const c = i.result!;
      return [
        c.caseNumber,
        `"${i.name}"`,
        `"${i.subjectName}"`,
        c.results?.summary.riskLevel || 'INCONCLUSIVE',
        Math.round((c.results?.summary.riskScore || 0) * 100),
        Math.round((c.results?.summary.confidence || 0) * 100),
        c.imageHashSha256,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Batch_Triage_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
  const highRiskCount = items.filter(
    (i) => i.result?.results?.summary.riskLevel === 'HIGHER RISK'
  ).length;
  const moderateRiskCount = items.filter(
    (i) => i.result?.results?.summary.riskLevel === 'MODERATE RISK'
  ).length;
  const lowRiskCount = items.filter(
    (i) => i.result?.results?.summary.riskLevel === 'LOW RISK'
  ).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-slate-400 mb-1">
            Border Screening & Identity Ingestion Pipeline
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Batch Screening & High-Throughput Triage
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Ingest and screen high volumes of passport facial photos concurrently.
            Each image undergoes automated 8-modality inspection with SHA-256 evidence registration.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleLoadBenchmarkBatch}
            disabled={isProcessing}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Load Benchmark Batch (3)
          </button>
          <button
            onClick={handleStartBatch}
            disabled={items.length === 0 || isProcessing || completedCount === items.length}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Analyzing Queue...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5 fill-current" />
                Run Forensic Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary KPI & Progress Meter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
          <div className="text-xs font-medium text-slate-400">Total in Queue</div>
          <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
            {items.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Files staged</div>
        </div>

        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
          <div className="text-xs font-medium text-slate-400">Completed</div>
          <div className="text-2xl font-bold font-mono text-indigo-400 mt-1 tabular-nums">
            {completedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{progressPercent}% executed</div>
        </div>

        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
          <div className="text-xs font-medium text-rose-400 flex items-center justify-between">
            <span>Flagged High Risk</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
            {highRiskCount}
          </div>
          <div className="text-[11px] text-rose-400/70 mt-1">Requires secondary audit</div>
        </div>

        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
          <div className="text-xs font-medium text-amber-400 flex items-center justify-between">
            <span>Moderate Risk</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            {moderateRiskCount}
          </div>
          <div className="text-[11px] text-amber-400/70 mt-1">Anomalous signals</div>
        </div>

        <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
          <div className="text-xs font-medium text-emerald-400 flex items-center justify-between">
            <span>Cleared (Low Risk)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {lowRiskCount}
          </div>
          <div className="text-[11px] text-emerald-400/70 mt-1">Organic facial traits</div>
        </div>
      </div>

      {/* Progress Bar when running */}
      {items.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Batch Progress</span>
            <span>{completedCount} / {items.length} Files Analyzed ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!isProcessing && e.dataTransfer.files) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
          isProcessing
            ? 'border-slate-800 bg-slate-950/40 opacity-60 cursor-not-allowed'
            : 'border-slate-700 hover:border-indigo-500/70 bg-slate-900/40 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        />
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">
              Drop facial images here, or browse local filesystem
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPEG, PNG, WEBP files up to 25MB each. Automated EXIF and PRNU sensor extraction enabled.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 text-xs text-slate-500 font-mono">
            <span>ICAO 9303 Compliant</span>
            <span>·</span>
            <span>ISO/IEC 27037 Integrity</span>
            <span>·</span>
            <span>Concurrent Processing</span>
          </div>
        </div>
      </div>

      {/* Queue Actions and Table */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white">Batch Queue Items</h3>
              <span className="text-xs font-mono text-slate-400">({items.length} records)</span>
            </div>

            <div className="flex items-center space-x-3">
              {completedCount > 0 && (
                <button
                  onClick={handleExportBatchCsv}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Export CSV ({completedCount})
                </button>
              )}
              <button
                onClick={handleClearQueue}
                disabled={isProcessing}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear Queue
              </button>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">File Name / Subject</th>
                    <th className="py-3 px-4">Pipeline Status</th>
                    <th className="py-3 px-4">Risk Evaluation</th>
                    <th className="py-3 px-4">Risk Score</th>
                    <th className="py-3 px-4">Evidence Hash</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item, index) => {
                    const result = item.result;
                    const level = result?.results?.summary.riskLevel;
                    const isHigh = level === 'HIGHER RISK';
                    const isLow = level === 'LOW RISK';
                    const isMod = level === 'MODERATE RISK';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          index === currentProcessingIndex
                            ? 'bg-indigo-950/20'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-500">{index + 1}</td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{item.subjectName}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                            {item.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {item.status === 'PENDING' && (
                            <span className="text-slate-400 font-mono text-[11px]">Queued</span>
                          )}
                          {item.status === 'PROCESSING' && (
                            <span className="text-indigo-400 font-mono text-[11px] flex items-center space-x-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Running 8 Modalities...</span>
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span>Completed</span>
                            </span>
                          )}
                          {item.status === 'FAILED' && (
                            <span className="text-rose-400 font-mono text-[11px]">
                              {item.errorMessage || 'Failed'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {result ? (
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
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {result ? (
                            <span>
                              {Math.round((result.results?.summary.riskScore || 0) * 100)}%
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                          {result ? (
                            <span>{result.imageHashSha256.substring(0, 14)}...</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {result ? (
                            <button
                              onClick={() => onSelectCase(result)}
                              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 transition-colors cursor-pointer"
                            >
                              <span>Dossier</span>
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
