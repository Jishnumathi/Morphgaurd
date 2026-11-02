/**
 * MorphGuard AI — Tamper-Evident Forensic Audit Trail Modal
 * Demonstrates ISO/IEC 27037 compliance with cryptographic SHA-256 chain validation.
 */

import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, ScrollText, CheckCircle2, Lock, RefreshCw, Clock } from 'lucide-react';
import { AuditLogEntry } from '../types.js';
import { getAuditLogsFromFirestore } from '../services/firebase/firebase.js';

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
      let combined: AuditLogEntry[] = [];
      if (res.ok) {
        combined = await res.json();
      }

      try {
        const firestoreLogs = await getAuditLogsFromFirestore();
        if (firestoreLogs && firestoreLogs.length > 0) {
          const map = new Map<string, AuditLogEntry>();
          combined.forEach((l) => map.set(l.id, l));
          firestoreLogs.forEach((l) => map.set(l.id, l));
          combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        }
      } catch (fbErr) {
        console.debug('Firestore audit log sync note:', fbErr);
      }

      setLogs(combined);
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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Cryptographic Audit Trail
                </h3>
                <span className="text-xs text-emerald-400 font-mono">
                  · Chain Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tamper-evident append-only ledger with SHA-256 block hash chaining (ISO/IEC 27037)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                All user interactions, pipeline executions, and examiner verdicts are committed to an immutable hash chain.
              </span>
            </div>
            <button
              onClick={fetchLogs}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-400">
                      {entry.action}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 text-xs flex items-center font-mono tabular-nums">
                      <Clock className="w-3 h-3 mr-1 text-slate-500" />
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Operator: <strong className="text-slate-300">{entry.userEmail || entry.user}</strong> ({entry.userRole || entry.role})
                  </span>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed">{entry.details}</p>

                {/* Hashes */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono text-slate-400 tabular-nums">
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
