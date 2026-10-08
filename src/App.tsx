/**
 * MorphGuard AI — Digital Image Forensic Screening Platform
 * Main Application Orchestrator
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { CaseInvestigation } from './components/CaseInvestigation.js';
import { NewCaseModal } from './components/NewCaseModal.js';
import { BatchAnalysisModal } from './components/BatchAnalysisModal.js';
import { AuditTrailModal } from './components/AuditTrailModal.js';
import { MethodologyModal } from './components/MethodologyModal.js';
import { ForensicAssistantModal } from './components/ForensicAssistantModal.js';
import { GeminiChatbot } from './components/GeminiChatbot.js';
import { LoginModal } from './components/LoginModal.js';
import { googleAuthService } from './services/auth/googleAuth.js';
import { saveCaseToFirestore, getCasesFromFirestore } from './services/firebase/firebase.js';
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

  // Modals
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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

      // Keep selected case in sync if updated
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
  const handleRoleChange = (role: UserRole) => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Dashboard
  const handleReturnDashboard = () => {
    setSelectedCase(null);
  };

  // New Case Created with Firestore Persistence
  const handleCaseCreated = (newCase: ForensicCase) => {
    setCases((prev) => [newCase, ...prev]);
    setSelectedCase(newCase);
    saveCaseToFirestore(newCase).catch((e) => console.debug('Firestore save note:', e));
    refreshData();
  };

  // Batch Items Added with Firestore Persistence
  const handleBatchCasesAdded = (newCases: ForensicCase[]) => {
    setCases((prev) => [...newCases, ...prev]);
    newCases.forEach((c) => {
      saveCaseToFirestore(c).catch((e) => console.debug('Firestore batch save note:', e));
    });
    refreshData();
  };

  // Update Case Verdict with Firestore Persistence
  const handleUpdateVerdict = async (
    caseId: string,
    verdict: ForensicCase['analystVerdict'],
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        refreshData();
      }
    } catch (err) {
      console.error('Failed to update verdict:', err);
      alert('Could not update examiner verdict on server.');
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
        onRoleChange={handleRoleChange}
        onNewCase={() => setIsNewCaseOpen(true)}
        onBatchAnalysis={() => setIsBatchOpen(true)}
        onOpenAuditTrail={() => setIsAuditTrailOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenChat={() => setIsAssistantOpen(true)}
        onReturnDashboard={handleReturnDashboard}
        isInspectingCase={!!selectedCase}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Initializing MorphGuard Forensic Screening Registry...
            </span>
          </div>
        ) : selectedCase ? (
          <CaseInvestigation
            currentCase={selectedCase}
            user={user}
            onBack={handleReturnDashboard}
            onUpdateVerdict={handleUpdateVerdict}
            onOpenAssistant={(c) => {
              setSelectedCase(c);
              setIsAssistantOpen(true);
            }}
          />
        ) : (
          <Dashboard
            cases={cases}
            statistics={statistics}
            onSelectCase={handleSelectCase}
            onNewCase={() => setIsNewCaseOpen(true)}
            onQuickLoadSample={handleQuickLoadSample}
          />
        )}
      </main>

      {/* Persistent Floating Gemini AI Copilot Trigger */}
      <button
        id="floating-gemini-chat-trigger"
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-2xl hover:shadow-indigo-500/30 border border-indigo-400/40 transition-all hover:scale-105 active:scale-95 group backdrop-blur-sm cursor-pointer"
        title="Open Gemini Multimodal Forensic Copilot (gemini-3.1-pro-preview, gemini-3.8-flash, gemini-3.1-flash-lite)"
      >
        <div className="relative">
          <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
        </div>
        <span className="text-xs font-semibold tracking-wide">Gemini Copilot</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-indigo-200 border border-indigo-400/20">
          AI
        </span>
      </button>

      {/* Modals */}
      <NewCaseModal
        user={user}
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      <BatchAnalysisModal
        user={user}
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onSelectCase={handleSelectCase}
        onNewCasesAdded={handleBatchCasesAdded}
      />

      <AuditTrailModal
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
      />

      <MethodologyModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      {/* Multi-turn Gemini AI Forensic Chatbot */}
      <GeminiChatbot
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentUser={user}
        activeCase={selectedCase}
        allCases={cases}
      />

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
