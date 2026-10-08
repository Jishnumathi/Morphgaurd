/**
 * MorphGuard AI — Batch Forensic Ingestion & Triage Modal
 * Supports multi-image queued processing, automated extraction,
 * summary status tabulation, and CSV export.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileCheck2,
  FileX,
  FileDown,
  Loader2,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';

interface BatchAnalysisModalProps {
  user: UserSession;
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (c: ForensicCase) => void;
  onNewCasesAdded: (newCases: ForensicCase[]) => void;
}

interface BatchItem {
  id: string;
  file: File;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: ForensicCase;
  errorMessage?: string;
}

export const BatchAnalysisModal: React.FC<BatchAnalysisModalProps> = ({
  user,
  isOpen,
  onClose,
  onSelectCase,
  onNewCasesAdded,
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList) => {
    const newItems: BatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.match(/\.(jpe?g|png|webp)$/i) || file.type.startsWith('image/')) {
        newItems.push({
          id: `batch-${Date.now()}-${i}-${Math.random()}`,
          file,
          status: 'PENDING',
        });
      }
    }
    setItems((prev) => [...prev, ...newItems]);
  };

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
        const formData = new FormData();
        formData.append('image', items[i].file);
        formData.append('title', `Batch Triage: ${items[i].file.name}`);
        formData.append('subjectName', `Batch Subject #${i + 1}`);
        formData.append('analystUser', user.email);
        formData.append('analystRole', user.role);

        const response = await fetch('/api/cases/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Upload failed' }));
          throw new Error(err.error || 'Pipeline error');
        }

        const createdCase: ForensicCase = await response.json();
        completedCases.push(createdCase);

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'COMPLETED', result: createdCase } : item
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: 'FAILED', errorMessage: err.message || 'Analysis failed' }
              : item
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

  const handleExportCsv = () => {
    const headers = ['Case Number', 'Filename', 'SHA-256', 'Risk Level', 'Risk Score %', 'Confidence %', 'Verdict'];
    const rows = items
      .filter((it) => it.result)
      .map((it) => {
        const res = it.result!;
        const sum = res.results?.summary;
        return [
          res.caseNumber,
          res.filename,
          res.imageHashSha256,
          sum?.riskLevel || 'INCONCLUSIVE',
          sum ? (sum.riskScore * 100).toFixed(1) : 'N/A',
          sum ? (sum.confidence * 100).toFixed(1) : 'N/A',
          res.analystVerdict || 'PENDING_REVIEW',
        ].map((val) => `"${val}"`).join(',');
      });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MorphGuard_Batch_Triage_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
  const highRiskCount = items.filter((i) => i.result?.results?.summary.riskLevel === 'HIGHER RISK').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Batch Biometric Screening & Triage</h3>
              <p className="text-[11px] text-slate-400">
                Queue multiple suspect images for automated parallel extraction and CSV dossier logging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 bg-slate-950 hover:border-indigo-500/80 rounded-xl p-5 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <div className="flex flex-col items-center space-y-1">
              <UploadCloud className="w-6 h-6 text-indigo-400" />
              <div className="text-xs text-slate-300 font-medium">
                Click to add multiple facial images or drag and drop files here
              </div>
              <p className="text-[10px] text-slate-500">Supports simultaneous triage of JPEG, PNG, WEBP files</p>
            </div>
          </div>

          {/* Batch Status Bar */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center space-x-4">
                <span className="text-slate-400">
                  Total Queue: <strong className="text-white">{items.length}</strong>
                </span>
                <span className="text-slate-400">
                  Processed: <strong className="text-indigo-400">{completedCount}</strong>
                </span>
                {highRiskCount > 0 && (
                  <span className="text-rose-400 font-semibold">
                    Flagged Morphs: {highRiskCount}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {completedCount > 0 && (
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5 mr-1" />
                    Export Triage CSV
                  </button>
                )}
                <button
                  onClick={handleStartBatch}
                  disabled={isProcessing || items.every((i) => i.status === 'COMPLETED')}
                  className="inline-flex items-center px-3.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Analyzing Item {currentProcessingIndex + 1}/{items.length}...
                    </>
                  ) : (
                    'Run Batch Analysis'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">File</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assessment</th>
                    <th className="py-2.5 px-3">Risk Metric</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((item, idx) => {
                    const res = item.result?.results?.summary;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200 truncate max-w-[200px]">
                            {item.file.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {(item.file.size / 1024).toFixed(1)} KB
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {item.status === 'PENDING' && (
                            <span className="text-[11px] font-mono text-slate-500">Queued</span>
                          )}
                          {item.status === 'PROCESSING' && (
                            <span className="inline-flex items-center text-[11px] font-mono text-indigo-400">
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              Analyzing
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="inline-flex items-center text-[11px] font-mono text-emerald-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Done
                            </span>
                          )}
                          {item.status === 'FAILED' && (
                            <span className="text-[11px] font-mono text-rose-400">Failed</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {res ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                                res.riskLevel === 'HIGHER RISK'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : res.riskLevel === 'MODERATE RISK'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : res.riskLevel === 'INCONCLUSIVE'
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {res.riskLevel}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          {res && !res.isInconclusive ? `${(res.riskScore * 100).toFixed(0)}%` : '-'}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-indigo-300">
                          {res ? `${(res.confidence * 100).toFixed(0)}%` : '-'}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {item.result && (
                            <button
                              onClick={() => {
                                onSelectCase(item.result!);
                                onClose();
                              }}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center"
                            >
                              Inspect Dossier
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
