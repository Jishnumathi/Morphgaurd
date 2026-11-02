/**
 * MorphGuard AI — Dedicated Forensic Case Dossier Page
 * Full-page deep inspection environment with breadcrumbs, next/prev navigation,
 * 8-modality visualizer, coordinate inspector, and official verdict signing.
 */

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  FileDown,
  Sparkles,
  Layers,
  Shield,
  Clock,
  User,
  Hash,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';
import { CaseInvestigation } from '../components/CaseInvestigation.js';

interface CaseDetailPageProps {
  currentCase: ForensicCase;
  allCases: ForensicCase[];
  user: UserSession;
  onBackToRegistry: () => void;
  onSelectCase: (c: ForensicCase) => void;
  onUpdateVerdict: (caseId: string, verdict: ForensicCase['analystVerdict'], notes?: string) => Promise<void>;
  onOpenCopilot: (c: ForensicCase) => void;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({
  currentCase,
  allCases,
  user,
  onBackToRegistry,
  onSelectCase,
  onUpdateVerdict,
  onOpenCopilot,
}) => {
  // Find current index and prev/next cases
  const currentIndex = allCases.findIndex((c) => c.id === currentCase.id);
  const prevCase = currentIndex > 0 ? allCases[currentIndex - 1] : null;
  const nextCase = currentIndex >= 0 && currentIndex < allCases.length - 1 ? allCases[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Breadcrumb & Quick Action Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md sticky top-16 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Breadcrumb Hierarchy */}
          <nav className="flex items-center space-x-2 text-xs text-slate-400 font-medium truncate">
            <button
              onClick={() => (window.location.hash = '#/dashboard')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span className="text-slate-600">/</span>
            <button
              onClick={onBackToRegistry}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Case Registry
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200 font-mono font-semibold truncate">
              {currentCase.caseNumber}
              {currentCase.targetSubjectName ? ` (${currentCase.targetSubjectName})` : ''}
            </span>
          </nav>

          {/* Previous / Next Case Switcher */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => prevCase && onSelectCase(prevCase)}
              disabled={!prevCase}
              className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                prevCase
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={prevCase ? `Previous Case: ${prevCase.caseNumber}` : 'No previous case'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              {currentIndex + 1} of {allCases.length}
            </span>

            <button
              onClick={() => nextCase && onSelectCase(nextCase)}
              disabled={!nextCase}
              className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                nextCase
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer'
                  : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title={nextCase ? `Next Case: ${nextCase.caseNumber}` : 'No next case'}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Copilot Jump */}
            <button
              onClick={() => onOpenCopilot(currentCase)}
              className="ml-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Consult Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dossier Investigation Component */}
      <div className="flex-1">
        <CaseInvestigation
          currentCase={currentCase}
          user={user}
          onBack={onBackToRegistry}
          onUpdateVerdict={onUpdateVerdict}
          onOpenAssistant={onOpenCopilot}
        />
      </div>
    </div>
  );
};
