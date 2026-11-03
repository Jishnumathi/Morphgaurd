/**
 * MorphGuard AI — Digital Image Forensic Screening Platform
 * Multi-Page Application Orchestrator with Hash Routing
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Header, NavPage } from './components/Header.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { CaseRegistryPage } from './pages/CaseRegistryPage.js';
import { CaseDetailPage } from './pages/CaseDetailPage.js';
import { BatchTriagePage } from './pages/BatchTriagePage.js';
import { AuditTrailPage } from './pages/AuditTrailPage.js';
import { MethodologyPage } from './pages/MethodologyPage.js';
import { CopilotPage } from './pages/CopilotPage.js';
import { NewCaseModal } from './components/NewCaseModal.js';
import { GeminiChatbot } from './components/GeminiChatbot.js';
import { LoginModal } from './components/LoginModal.js';
import { googleAuthService, getAuthHeaders } from './services/auth/googleAuth.js';
import {
  saveCaseToFirestore,
  getCasesFromFirestore,
  saveAuditLogToFirestore,
  auth,
} from './services/firebase/firebase.js';
import { ForensicCase, DashboardStatistics, UserRole, UserSession } from './types.js';

export function App() {
  // Active User Session State
  const [user, setUser] = useState<UserSession>(() => {
    const persisted = googleAuthService.getPersistedSession();
    if (persisted) return persisted;
    return {
      id: 'usr-001',
      name: 'OFFICER D. CHEN',
      email: 'chen.d@morphguard.gov',
      role: 'ANALYST',
      agency: 'Border Biometrics & Forensic Identity Unit',
      authProvider: 'demo',
    };
  });

  // Caseload & Statistics
  const [cases, setCases] = useState<ForensicCase[]>([]);
  const [statistics, setStatistics] = useState<DashboardStatistics>({
    totalCases: 0,
    completedAnalyses: 0,
    highRiskCases: 0,
    moderateRiskCases: 0,
    lowRiskCases: 0,
    inconclusiveCases: 0,
    averageConfidence: 0.9,
    casesOverTime: [],
    signalDistribution: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCase, setSelectedCase] = useState<ForensicCase | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals & Panels
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isFloatingCopilotOpen, setIsFloatingCopilotOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // URL Hash Navigation Route
  const [currentHash, setCurrentHash] = useState<string>(() => window.location.hash || '#/dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/dashboard';
      setCurrentHash(hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Programmatic navigation helper
  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  // Determine active page & sub-route parameters
  const { activePage, caseIdFromUrl, riskFilterFromUrl } = useMemo(() => {
    const cleanHash = currentHash.replace(/^#\/?/, '');
    const [pathPart, queryPart] = cleanHash.split('?');
    const segments = pathPart.split('/').filter(Boolean);

    let page: NavPage = 'dashboard';
    let cId: string | null = null;
    let rFilter: string | null = null;

    if (queryPart) {
      const params = new URLSearchParams(queryPart);
      rFilter = params.get('risk');
    }

    if (segments.length === 0 || segments[0] === 'dashboard') {
      page = 'dashboard';
    } else if (segments[0] === 'cases') {
      if (segments.length > 1) {
        page = 'case-detail';
        cId = segments[1];
      } else {
        page = 'cases';
      }
    } else if (segments[0] === 'batch') {
      page = 'batch';
    } else if (segments[0] === 'audit') {
      page = 'audit';
    } else if (segments[0] === 'methodology' || segments[0] === 'docs') {
      page = 'methodology';
    } else if (segments[0] === 'copilot' || segments[0] === 'assistant') {
      page = 'copilot';
    }

    return {
      activePage: page,
      caseIdFromUrl: cId,
      riskFilterFromUrl: rFilter,
    };
  }, [currentHash]);

  // Synchronize selectedCase if URL points to a specific case ID
  useEffect(() => {
    if (caseIdFromUrl && cases.length > 0) {
      const found = cases.find((c) => c.id === caseIdFromUrl || c.caseNumber === caseIdFromUrl);
      if (found) {
        setSelectedCase(found);
      }
    }
  }, [caseIdFromUrl, cases]);

  // Fetch Cases and Statistics from Server and Firestore
  const refreshData = async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/dashboard/statistics'),
      ]);

      let casesData: ForensicCase[] = [];
      if (casesRes.ok) {
        casesData = await casesRes.json();
      }

      // Try loading any Firestore persisted cases
      try {
        const firestoreCases = await getCasesFromFirestore();
        if (firestoreCases && firestoreCases.length > 0) {
          const map = new Map<string, ForensicCase>();
          casesData.forEach((c) => map.set(c.id, c));
          firestoreCases.forEach((c) => map.set(c.id, c));
          casesData = Array.from(map.values());
        }
      } catch (fbErr) {
        console.debug('Firestore sync note:', fbErr);
      }

      if (statsRes.ok) {
        const statsData: DashboardStatistics = await statsRes.json();
        setStatistics(statsData);
      }

      setCases(casesData);

      // Keep selected case in sync
      if (selectedCase) {
        const fresh = casesData.find((c) => c.id === selectedCase.id);
        if (fresh) setSelectedCase(fresh);
      }
    } catch (err) {
      console.error('Failed to load cases from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handle Role Switch
  const handleRoleChange = async (role: UserRole) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name, role }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated: UserSession = {
          ...data.user,
          token: data.token || data.user?.token,
        };
        setUser(updated);
        googleAuthService.setPersistedSession(updated);
        refreshData();
        return;
      }
    } catch (e) {
      console.warn('Role switch sync notice:', e);
    }
    setUser((prev) => {
      const updated = { ...prev, role };
      googleAuthService.setPersistedSession(updated);
      return updated;
    });
  };

  // Handle Login Success
  const handleLoginSuccess = (authenticatedUser: UserSession) => {
    setUser(authenticatedUser);
    googleAuthService.setPersistedSession(authenticatedUser);
    setIsLoginModalOpen(false);
    refreshData();
  };

  // Handle User Logout
  const handleLogout = async () => {
    await googleAuthService.signOut(user);
    const guestUser: UserSession = {
      id: `usr-${Date.now()}`,
      name: 'GUEST EXAMINER',
      email: 'guest.examiner@morphguard.gov',
      role: 'VIEWER',
      agency: 'Public Forensic Verification Gateway',
      authProvider: 'demo',
    };
    setUser(guestUser);
    googleAuthService.setPersistedSession(guestUser);
    setIsLoginModalOpen(false);
  };

  // Select Case for Deep Inspection
  const handleSelectCase = (c: ForensicCase) => {
    setSelectedCase(c);
    navigateTo(`#/cases/${c.id}`);
  };

  // Return to Case Registry
  const handleReturnToRegistry = () => {
    navigateTo('#/cases');
  };

  // New Case Created with Firestore Persistence
  const handleCaseCreated = (newCase: ForensicCase) => {
    setCases((prev) => [newCase, ...prev]);
    setSelectedCase(newCase);
    saveCaseToFirestore(newCase).catch((e) => console.debug('Firestore save note:', e));
    if (auth.currentUser) {
      saveAuditLogToFirestore({
        id: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        caseId: newCase.id,
        timestamp: new Date().toISOString(),
        user: user.email,
        role: user.role,
        action: 'CASE_CREATED',
        details: `Forensic case ${newCase.caseNumber} registered: "${newCase.title}". Hash: ${newCase.imageHashSha256.substring(0, 16)}...`,
        integrityHash: newCase.imageHashSha256,
      }).catch((e) => console.debug('Firestore audit note:', e));
    }
    setNotificationBanner({
      type: 'success',
      message: `Forensic investigation initialized: ${newCase.caseNumber} (${newCase.results?.summary.riskLevel || 'Analyzed'})`,
    });
    setTimeout(() => setNotificationBanner(null), 4000);
    refreshData();
    navigateTo(`#/cases/${newCase.id}`);
  };

  // Batch Items Added
  const handleBatchCasesAdded = (newCases: ForensicCase[]) => {
    setCases((prev) => [...newCases, ...prev]);
    newCases.forEach((c) => {
      saveCaseToFirestore(c).catch((e) => console.debug('Firestore batch save note:', e));
    });
    setNotificationBanner({
      type: 'success',
      message: `Batch complete: ${newCases.length} facial evidence dossiers analyzed & registered.`,
    });
    setTimeout(() => setNotificationBanner(null), 4000);
    refreshData();
  };

  // Update Case Verdict
  const handleUpdateVerdict = async (
    caseId: string,
    verdict: ForensicCase['analystVerdict'],
    notes?: string
  ) => {
    if (user.role === 'VIEWER') {
      setNotificationBanner({
        type: 'error',
        message: 'Access Denied: Viewer accounts are read-only. Recording verdicts requires Analyst or Admin authorization.',
      });
      setTimeout(() => setNotificationBanner(null), 4000);
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}/verdict`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          verdict,
          notes,
          user: user.email,
        }),
      });

      if (res.ok) {
        const updated: ForensicCase = await res.json();
        setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCase && selectedCase.id === updated.id) {
          setSelectedCase(updated);
        }
        saveCaseToFirestore(updated).catch((e) => console.debug('Firestore update note:', e));
        if (auth.currentUser) {
          saveAuditLogToFirestore({
            id: `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            caseId: updated.id,
            timestamp: new Date().toISOString(),
            user: user.email,
            role: user.role,
            action: 'VERDICT_RECORDED',
            details: `Examiner recorded official biometric verdict: ${verdict} for case ${updated.caseNumber}. Notes: ${notes || 'None'}`,
            integrityHash: updated.imageHashSha256 || '0000000000000000000000000000000000000000000000000000000000000000',
          }).catch((e) => console.debug('Firestore audit note:', e));
        }
        setNotificationBanner({
          type: 'success',
          message: `Official examiner verdict committed: ${verdict} for ${updated.caseNumber}`,
        });
        setTimeout(() => setNotificationBanner(null), 4000);
        refreshData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setNotificationBanner({
          type: 'error',
          message: errData.error || 'Could not update examiner verdict on server.',
        });
        setTimeout(() => setNotificationBanner(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to update verdict:', err);
      setNotificationBanner({
        type: 'error',
        message: 'Could not update examiner verdict on server: ' + (err?.message || 'Network error'),
      });
      setTimeout(() => setNotificationBanner(null), 5000);
    }
  };

  // Quick Load Sample Case
  const handleQuickLoadSample = (sampleId: string) => {
    const found = cases.find((c) => c.id === sampleId);
    if (found) {
      handleSelectCase(found);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Command Bar */}
      <Header
        user={user}
        activePage={activePage}
        onNavigate={navigateTo}
        onRoleChange={handleRoleChange}
        onNewCase={() => setIsNewCaseOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(false || true)}
      />

      {/* Persistent Notification Banner */}
      {notificationBanner && (
        <div
          className={`px-4 py-2.5 text-xs flex items-center justify-between border-b transition-all duration-200 ${
            notificationBanner.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            {notificationBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{notificationBanner.message}</span>
            <button
              onClick={() => setNotificationBanner(null)}
              className="ml-auto text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area Routing */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Initializing MorphGuard Multi-Page Forensic Environment...
            </span>
          </div>
        ) : activePage === 'case-detail' && selectedCase ? (
          /* Dedicated Webpage 3: Case Dossier */
          <CaseDetailPage
            currentCase={selectedCase}
            allCases={cases}
            user={user}
            onBackToRegistry={handleReturnToRegistry}
            onSelectCase={handleSelectCase}
            onUpdateVerdict={handleUpdateVerdict}
            onOpenCopilot={(c) => {
              setSelectedCase(c);
              navigateTo('#/copilot');
            }}
          />
        ) : activePage === 'cases' ? (
          /* Dedicated Webpage 2: Case Registry */
          <CaseRegistryPage
            cases={cases}
            onSelectCase={handleSelectCase}
            onNewCase={() => setIsNewCaseOpen(true)}
            initialRiskFilter={riskFilterFromUrl}
          />
        ) : activePage === 'batch' ? (
          /* Dedicated Webpage 4: Batch Screening */
          <BatchTriagePage
            user={user}
            onSelectCase={handleSelectCase}
            onNewCasesAdded={handleBatchCasesAdded}
            onNavigate={navigateTo}
          />
        ) : activePage === 'audit' ? (
          /* Dedicated Webpage 5: Cryptographic Audit Trail */
          <AuditTrailPage onSelectCaseById={(id) => navigateTo(`#/cases/${id}`)} />
        ) : activePage === 'methodology' ? (
          /* Dedicated Webpage 6: Technical Methodology & Standards */
          <MethodologyPage />
        ) : activePage === 'copilot' ? (
          /* Dedicated Webpage 7: AI Copilot Full-Page Workspace */
          <CopilotPage
            currentUser={user}
            allCases={cases}
            initialCase={selectedCase}
            onSelectCaseDossier={handleSelectCase}
          />
        ) : (
          /* Dedicated Webpage 1: Executive Command Dashboard */
          <DashboardPage
            cases={cases}
            statistics={statistics}
            onSelectCase={handleSelectCase}
            onNavigate={navigateTo}
            onNewCase={() => setIsNewCaseOpen(true)}
            onQuickLoadSample={handleQuickLoadSample}
          />
        )}
      </main>

      {/* Floating Gemini Copilot Trigger (Available on all pages for quick drawer consultation) */}
      {activePage !== 'copilot' && (
        <button
          id="floating-gemini-chat-trigger"
          onClick={() => setIsFloatingCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg transition-all cursor-pointer group"
          title="Open Quick Copilot Drawer"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          <span className="text-xs font-semibold">Forensic Copilot</span>
        </button>
      )}

      {/* Slide-out Gemini AI Forensic Drawer */}
      <GeminiChatbot
        isOpen={isFloatingCopilotOpen}
        onClose={() => setIsFloatingCopilotOpen(false)}
        currentUser={user}
        activeCase={selectedCase}
        allCases={cases}
      />

      {/* Intake New Case Modal */}
      <NewCaseModal
        user={user}
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      {/* Officer Identity & Google Sign-in Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        currentUser={user}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
