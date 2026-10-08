/**
 * MorphGuard AI — Top Navigation & Command Bar
 */

import React from 'react';
import { Shield, Plus, UploadCloud, FileText, ScrollText, UserCheck, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { UserRole, UserSession } from '../types.js';

interface HeaderProps {
  user: UserSession;
  onRoleChange: (role: UserRole) => void;
  onNewCase: () => void;
  onBatchAnalysis: () => void;
  onOpenAuditTrail: () => void;
  onOpenDocs: () => void;
  onOpenLogin: () => void;
  onOpenChat?: () => void;
  onReturnDashboard: () => void;
  isInspectingCase: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRoleChange,
  onNewCase,
  onBatchAnalysis,
  onOpenAuditTrail,
  onOpenDocs,
  onOpenLogin,
  onOpenChat,
  onReturnDashboard,
  isInspectingCase,
}) => {
  const isGoogleAuth = user.authProvider === 'google';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Identification */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onReturnDashboard}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Shield className="w-6 h-6 text-indigo-400" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  MorphGuard <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-mono">AI</span>
                </h1>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Forensic Screening
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multimodal Facial Image Morphing & Splicing Forensics
              </p>
            </div>
          </div>

          {/* Center Navigation Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button
              id="nav-new-case-btn"
              onClick={onNewCase}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Case
            </button>

            <button
              id="nav-batch-btn"
              onClick={onBatchAnalysis}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <UploadCloud className="w-4 h-4 mr-1.5 text-slate-400" />
              Batch Analysis
            </button>

            <button
              id="nav-audit-btn"
              onClick={onOpenAuditTrail}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ScrollText className="w-4 h-4 mr-1.5 text-slate-400" />
              Audit Log
            </button>

            <button
              id="nav-docs-btn"
              onClick={onOpenDocs}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
              Methodology
            </button>

            {onOpenChat && (
              <button
                id="nav-gemini-chat-btn"
                onClick={onOpenChat}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 text-indigo-200 border border-indigo-500/40 transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Gemini Copilot
              </button>
            )}
          </div>

          {/* Right: Authentication & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Google Sign-in / Identity Badge Button */}
            <button
              id="nav-auth-profile-btn"
              onClick={onOpenLogin}
              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border transition-all ${
                isGoogleAuth
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-emerald-500/40 text-slate-200'
                  : 'bg-slate-800/60 hover:bg-slate-700/80 border-slate-700 text-slate-200'
              }`}
              title={isGoogleAuth ? `Signed in with Google: ${user.email}` : 'Sign in with Google API'}
            >
              {isGoogleAuth && user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover border border-emerald-400/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}

              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  <span className="truncate max-w-[120px]">{user.name}</span>
                  {isGoogleAuth && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {isGoogleAuth ? 'Google Verified' : 'Click to Sign In'}
                </div>
              </div>
            </button>

            {/* Role Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              {(['ANALYST', 'ADMIN', 'VIEWER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  id={`role-btn-${r.toLowerCase()}`}
                  onClick={() => onRoleChange(r)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    user.role === r
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
