/**
 * MorphGuard AI — Top Navigation & Command Bar
 * Features clear active page indicators, direct page switching,
 * mobile drawer, and zero-pill discipline.
 */

import React, { useState } from 'react';
import {
  Shield,
  Plus,
  UploadCloud,
  FileText,
  ScrollText,
  Sparkles,
  LayoutDashboard,
  FolderOpen,
  Menu,
  X,
} from 'lucide-react';
import { UserRole, UserSession } from '../types.js';

export type NavPage = 'dashboard' | 'cases' | 'case-detail' | 'batch' | 'audit' | 'methodology' | 'copilot';

interface HeaderProps {
  user: UserSession;
  activePage: NavPage;
  onNavigate: (page: string) => void;
  onRoleChange: (role: UserRole) => void;
  onNewCase: () => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activePage,
  onNavigate,
  onRoleChange,
  onNewCase,
  onOpenLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isGoogleAuth = user.authProvider === 'google';
  const avatarSrc = user.avatarUrl || '/src/assets/images/avatar_examiner_chen_1791518742522.jpg';

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard', hash: '#/dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Case Registry', hash: '#/cases', icon: FolderOpen },
    { id: 'batch', label: 'Batch Screening', hash: '#/batch', icon: UploadCloud },
    { id: 'audit', label: 'Audit Trail', hash: '#/audit', icon: ScrollText },
    { id: 'methodology', label: 'Methodology', hash: '#/methodology', icon: FileText },
    { id: 'copilot', label: 'AI Copilot', hash: '#/copilot', icon: Sparkles },
  ];

  const handleLinkClick = (hash: string) => {
    onNavigate(hash);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single Brand Element Wordmark */}
          <div
            id="brand-home-link"
            className="flex items-center space-x-2.5 cursor-pointer shrink-0 select-none group"
            onClick={() => handleLinkClick('#/dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:border-indigo-400/60 transition-colors">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
              MorphGuard <span className="text-indigo-400 font-semibold">AI</span>
            </span>
          </div>

          {/* Zone 2: Navigation Links with Active Page Underline */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-medium text-slate-300">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                activePage === link.id ||
                (link.id === 'cases' && activePage === 'case-detail');

              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.hash)}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-white bg-slate-800 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Profile Context */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Primary Action Button */}
            <button
              id="nav-new-case-btn"
              onClick={onNewCase}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">New Investigation</span>
              <span className="sm:hidden">Intake</span>
            </button>

            {/* Role Switcher */}
            <div className="hidden lg:flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {(['ANALYST', 'ADMIN', 'VIEWER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  id={`role-btn-${r.toLowerCase()}`}
                  onClick={() => onRoleChange(r)}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    user.role === r
                      ? 'bg-slate-800 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* User Profile / Identity Button */}
            <button
              id="nav-auth-profile-btn"
              onClick={onOpenLogin}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 transition-colors cursor-pointer text-left shrink-0"
              title={isGoogleAuth ? `Signed in as ${user.email}` : 'Sign in / Switch Officer Profile'}
            >
              <img
                src={avatarSrc}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[100px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                  {user.role}
                </div>
              </div>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activePage === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.hash)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Role:</span>
            <div className="flex space-x-1">
              {(['ANALYST', 'ADMIN', 'VIEWER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    user.role === r ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
