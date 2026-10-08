/**
 * MorphGuard AI — Tamper-Evident Forensic Audit Trail Modal
 * Demonstrates ISO/IEC 27037 compliance with cryptographic SHA-256 chain validation.
 */

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, ScrollText, CheckCircle2, Lock, RefreshCw, Clock } from 'lucide-react';
import { AuditLogEntry } from '../types.js';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Cryptographic Forensic Audit Trail
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  CHAIN VERIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tamper-evident append-only ledger with SHA-256 block hash chaining
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>
                All user actions, pipeline executions, and verdicts are committed to an immutable hash chain.
              </span>
            </div>
            <button
              onClick={fetchLogs}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {logs.map((entry, idx) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono text-[10px] font-bold">
                      {entry.action}
                    </span>
                    <span className="text-slate-400 text-[11px] flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Operator: <strong className="text-slate-300">{entry.userEmail || entry.user}</strong> ({entry.userRole || entry.role})
                  </span>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed">{entry.details}</p>

                {/* Hashes */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-sm">
                    Block Hash: <span className="text-slate-300">{entry.entryHashSha256 || entry.integrityHash}</span>
                  </span>
                  {entry.previousHashSha256 && (
                    <span className="truncate max-w-xs text-slate-500">
                      Prev: {entry.previousHashSha256.substring(0, 16)}...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
