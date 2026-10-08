/**
 * MorphGuard AI — Multi-Turn Gemini Forensic Chatbot
 * Features:
 * - Multi-turn conversation history maintained across turns
 * - Scrollable conversation thread with Markdown support
 * - Role-based system instructions (General Examiner, Rapid Triage, Deep Metric Specialist, Evidence Auditor)
 * - Model Tier Selection:
 *    * gemini-3.8-flash (General forensic tasks)
 *    * gemini-3.1-flash-lite (Fast triage tasks)
 *    * gemini-3.1-pro-preview (Complex mathematical tasks)
 * - Grounding on active case evidence vector
 * - Persistent session & message storage in Firestore
 */

import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  MessageSquare,
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  Zap,
  Brain,
  ShieldCheck,
  ChevronDown,
  X,
  Minimize2,
  Maximize2,
  Paperclip,
  RotateCcw,
  Sliders,
  Check,
  Clock,
  HelpCircle,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { ForensicCase, UserSession } from '../types.js';
import {
  saveChatSessionToFirestore,
  saveChatMessageToFirestore,
  getChatSessionsFromFirestore,
  getChatMessagesFromFirestore,
  ChatSessionDoc,
  ChatMessageDoc,
} from '../services/firebase/firebase.js';

export type GeminiModelTier = 'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession;
  activeCase: ForensicCase | null;
  allCases: ForensicCase[];
  isFloating?: boolean;
}

interface RoleDefinition {
  key: string;
  title: string;
  shortDescription: string;
  recommendedModel: GeminiModelTier;
  systemPrompt: string;
  icon: typeof Bot;
}

const ROLES: RoleDefinition[] = [
  {
    key: 'GENERAL_EXAMINER',
    title: 'Lead Forensic Examiner',
    shortDescription: 'Balanced multimodal evidence review & screening',
    recommendedModel: 'gemini-3.8-flash',
    icon: ShieldCheck,
    systemPrompt: `You are the Lead Forensic Screening Examiner at MorphGuard AI Border Security & Biometric Identification Taskforce.
Your objective is to provide authoritative, balanced, and scientifically accurate evaluations of digital facial imagery.
Maintain a professional, objective, and consultative tone. Structure your explanations with clear headings, bullet points, and actionable next steps for the investigating officer.`,
  },
  {
    key: 'RAPID_TRIAGE',
    title: 'Rapid Border Triage Specialist',
    shortDescription: 'Ultra-fast high-priority screening summaries',
    recommendedModel: 'gemini-3.1-flash-lite',
    icon: Zap,
    systemPrompt: `You are the Rapid Border Triage Specialist.
Your job is to deliver ultra-fast, high-priority screening summaries.
Be direct, concise, and focused on immediate security risks: is the passport or biometric photo suspicious? What is the quickest sanity check the border officer should perform right now? Keep explanations under 3-4 bullet points.`,
  },
  {
    key: 'DEEP_METRIC_SPECIALIST',
    title: 'Biometrics & Signal Scientist',
    shortDescription: 'Deep mathematical analysis & signal derivations',
    recommendedModel: 'gemini-3.1-pro-preview',
    icon: Brain,
    systemPrompt: `You are a Senior Biometrics & Signal Forensics Scientist specializing in Error Level Analysis (ELA), 2D Fourier Spectral analysis, sensor noise PRNU/Laplacian residuals, Local Binary Pattern (LBP) entropy, and facial landmark Delaunay triangulation geometry.
Provide exhaustive, technically rigorous explanations with mathematical formulations, error margins, and statistical confidence models.`,
  },
  {
    key: 'CHAIN_OF_CUSTODY_AUDITOR',
    title: 'ISO/IEC 27037 Evidence Auditor',
    shortDescription: 'Chain of custody, admissibility & court dossiers',
    recommendedModel: 'gemini-3.8-flash',
    icon: FileText,
    systemPrompt: `You are a Digital Evidence & Chain of Custody Auditor adhering strictly to ISO/IEC 27037, ISO/IEC 30107, and Daubert/Federal Rules of Evidence.
Guide the user on admissibility standards, cryptographic hash verification (SHA-256), non-destructive testing methodologies, and preparing courtroom-defensible forensic dossiers.`,
  },
];

const QUICK_PROMPTS = [
  'How does JPEG Error Level Analysis (ELA) detect spliced morphs?',
  'Explain what sensor noise inconsistency indicates in this case.',
  'What is LBP Shannon Entropy and why does smoothing lower it?',
  'Draft an official courtroom summary of the current evidence.',
];

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeCase,
  allCases,
  isFloating = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('GENERAL_EXAMINER');
  const [selectedModel, setSelectedModel] = useState<GeminiModelTier>('gemini-3.8-flash');
  const [attachedCaseId, setAttachedCaseId] = useState<string>(activeCase ? activeCase.id : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRoleConfig, setShowRoleConfig] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [sessionsList, setSessionsList] = useState<ChatSessionDoc[]>([]);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentRole = ROLES.find((r) => r.key === selectedRoleKey) || ROLES[0];

  // Sync active case prop
  useEffect(() => {
    if (activeCase) {
      setAttachedCaseId(activeCase.id);
    }
  }, [activeCase]);

  // Initial welcome greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: ChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: `**MorphGuard AI Forensic Copilot initialized.**
Role: **${currentRole.title}** | Active Model: \`${selectedModel}\`

${
  activeCase
    ? `Evidence vector loaded for **Case ${activeCase.caseNumber}** (${activeCase.results.summary.riskLevel} - Risk: ${(
        activeCase.results.summary.riskScore * 100
      ).toFixed(0)}%).`
    : 'No specific case attached. I can answer general questions about facial morphing detection, signal forensics, or ISO/IEC 27037 chain-of-custody protocols.'
}

How can I assist your biometric investigation today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };
      setMessages([initialGreeting]);
    }
  }, [selectedRoleKey]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      loadSavedSessions();
    }
  }, [isOpen]);

  // Load saved sessions from Firestore
  const loadSavedSessions = async () => {
    try {
      const sessions = await getChatSessionsFromFirestore();
      if (sessions && sessions.length > 0) {
        setSessionsList(sessions);
      }
    } catch (err) {
      console.debug('No prior Firestore sessions or offline:', err);
    }
  };

  // Switch role handler: also sets recommended model
  const handleSelectRole = (roleKey: string) => {
    const r = ROLES.find((item) => item.key === roleKey);
    if (r) {
      setSelectedRoleKey(r.key);
      setSelectedModel(r.recommendedModel);
      setCustomPrompt(r.systemPrompt);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessageId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append user message immediately
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery('');
    setIsLoading(true);

    // Persist user turn to Firestore
    try {
      await saveChatMessageToFirestore(sessionId, {
        id: userMessageId,
        sessionId,
        role: 'user',
        text: query,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.debug('Firestore message save note:', e);
    }

    // Build payload for backend API
    const historyPayload = updatedMessages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          systemRoleKey: selectedRoleKey,
          customSystemInstruction: customPrompt || currentRole.systemPrompt,
          modelTier: selectedModel,
          caseId: attachedCaseId || undefined,
          userEmail: currentUser.email,
          userRole: currentUser.role,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status: ${response.status}`);
      }

      const data = await response.json();

      const modelMessageId = `msg-model-${Date.now()}`;
      const modelMsg: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        text: data.reply || 'No response provided.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
      };

      setMessages((prev) => [...prev, modelMsg]);

      if (data.suggestedFollowUps && Array.isArray(data.suggestedFollowUps)) {
        setSuggestedFollowUps(data.suggestedFollowUps);
      }

      // Persist model response turn to Firestore
      try {
        await saveChatMessageToFirestore(sessionId, {
          id: modelMessageId,
          sessionId,
          role: 'model',
          text: modelMsg.text,
          timestamp: new Date().toISOString(),
          modelUsed: modelMsg.modelUsed,
        });

        // Update session meta
        await saveChatSessionToFirestore({
          id: sessionId,
          title: query.substring(0, 45) + (query.length > 45 ? '...' : ''),
          userId: currentUser.id,
          userEmail: currentUser.email,
          roleInstruction: currentRole.title,
          modelName: selectedModel,
          caseId: attachedCaseId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.debug('Firestore session save note:', e);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Consultation Notice:** Unable to reach AI endpoint (${err.message}). Using local forensic fallback:
Please verify network connectivity or check if your inquiry can be addressed by examining the specific heatmaps on the Analysis tab.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Fallback Engine',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset/Clear conversation thread
  const handleClearThread = () => {
    const newId = `session-${Date.now()}`;
    setSessionId(newId);
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: `**New forensic session initialized.**
Role: **${currentRole.title}** | Model: \`${selectedModel}\`

Ready for your queries on biometric morph detection.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      },
    ]);
    setSuggestedFollowUps([]);
  };

  // Load an existing session from Firestore
  const handleLoadSession = async (sess: ChatSessionDoc) => {
    try {
      setIsLoading(true);
      setSessionId(sess.id);
      setSelectedModel((sess.modelName as GeminiModelTier) || 'gemini-3.8-flash');
      if (sess.caseId) setAttachedCaseId(sess.caseId);

      const msgs = await getChatMessagesFromFirestore(sess.id);
      if (msgs && msgs.length > 0) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'model',
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            modelUsed: m.modelUsed,
          }))
        );
      }
      setShowSessionDrawer(false);
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-chatbot-wrapper"
      className={
        isFloating
          ? `fixed bottom-5 right-5 z-50 flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
              isExpanded ? 'w-[750px] h-[82vh]' : 'w-[440px] h-[580px]'
            }`
          : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in'
      }
    >
      <div
        id="gemini-chatbot-container"
        className={
          isFloating
            ? 'flex flex-col h-full w-full'
            : `bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden text-slate-100 ${
                isExpanded ? 'w-[90vw] h-[92vh]' : 'w-full max-w-3xl h-[85vh]'
              }`
        }
      >
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight text-white">
                  MorphGuard AI Forensic Assistant
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Multi-Turn
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>{currentRole.title}</span>
                <span>•</span>
                <span className="text-indigo-400 font-mono font-medium">{selectedModel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Session History Button */}
            <button
              id="btn-chat-sessions-history"
              title="Saved Sessions"
              onClick={() => setShowSessionDrawer(!showSessionDrawer)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showSessionDrawer
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Role & Settings Button */}
            <button
              id="btn-chat-role-settings"
              title="System Instructions & Roles"
              onClick={() => setShowRoleConfig(!showRoleConfig)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showRoleConfig
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {/* Clear thread */}
            <button
              id="btn-clear-chat-thread"
              title="New Consultation"
              onClick={handleClearThread}
              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Expand / Minimize */}
            <button
              id="btn-toggle-expand-chat"
              title={isExpanded ? 'Restore size' : 'Expand window'}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors hidden sm:inline-flex"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close */}
            <button
              id="btn-close-chat"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Configuration Toolbar (Role & Model Selector) */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          {/* Model Selector Pill */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Model:
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                id="btn-model-flash-lite"
                onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  selectedModel === 'gemini-3.1-flash-lite'
                    ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Fast tasks: Rapid screening and triage"
              >
                ⚡ Lite (Fast)
              </button>
              <button
                type="button"
                id="btn-model-flash"
                onClick={() => setSelectedModel('gemini-3.8-flash')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  selectedModel === 'gemini-3.8-flash'
                    ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="General tasks: Balanced multimodal forensic intelligence"
              >
                🌟 Flash (General)
              </button>
              <button
                type="button"
                id="btn-model-pro"
                onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  selectedModel === 'gemini-3.1-pro-preview'
                    ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Complex tasks: Deep mathematical and evidentiary proofs"
              >
                🧠 Pro (Complex)
              </button>
            </div>
          </div>

          {/* Attached Case Grounding Selector */}
          <div className="flex items-center space-x-1.5">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Evidence:
            </span>
            <select
              id="select-attached-case"
              value={attachedCaseId}
              onChange={(e) => setAttachedCaseId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">No Active Case (General)</option>
              {allCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {c.targetSubjectName || c.filename} (
                  {c.results ? c.results.summary.riskLevel : 'Pending'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Roles & System Instruction Drawer (Collapsible) */}
        {showRoleConfig && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3 flex-shrink-0 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Specialized Examiner Roles (System Instruction)
              </span>
              <button
                onClick={() => setShowRoleConfig(false)}
                className="text-slate-400 hover:text-slate-200 text-[11px]"
              >
                Close Settings
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const IconComponent = r.icon;
                const isSelected = selectedRoleKey === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleSelectRole(r.key)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-slate-200">
                        <IconComponent className="w-3.5 h-3.5 text-indigo-400" />
                        {r.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">{r.shortDescription}</p>
                    <div className="mt-1.5 text-[9px] font-mono text-indigo-400">
                      Default: {r.recommendedModel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sessions History Drawer (Collapsible) */}
        {showSessionDrawer && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex-shrink-0 text-xs space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="font-semibold">Firestore Consultation History</span>
              <button
                onClick={() => setShowSessionDrawer(false)}
                className="hover:text-slate-200"
              >
                Hide
              </button>
            </div>
            {sessionsList.length === 0 ? (
              <p className="text-slate-500 text-[11px] py-1 italic">
                No archived consultations found. New sessions will automatically save to Firestore.
              </p>
            ) : (
              <div className="space-y-1">
                {sessionsList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleLoadSession(s)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] flex items-center justify-between transition-colors ${
                      s.id === sessionId
                        ? 'bg-indigo-950 text-indigo-200 border border-indigo-700'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate max-w-[280px]">{s.title || 'Forensic thread'}</span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {new Date(s.updatedAt || s.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scrollable Conversation Thread */}
        <div
          id="chat-conversation-scroll-thread"
          className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                    isUser
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 border border-indigo-500/40 text-indigo-300'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm space-y-1.5 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {/* Model header info */}
                  {!isUser && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-700/50">
                      <span className="font-semibold text-indigo-400">{currentRole.title}</span>
                      {msg.modelUsed && (
                        <span className="font-mono text-[9px] bg-slate-900/80 px-1.5 py-0.2 rounded text-slate-400">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rendered Body */}
                  <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed break-words">
                    <Markdown>{msg.text}</Markdown>
                  </div>

                  <div
                    className={`text-[9px] font-mono text-right ${
                      isUser ? 'text-indigo-200/80' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-start gap-2.5 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-300 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></div>
                <span className="font-mono text-[11px] text-slate-400">
                  {selectedModel} analyzing forensic signals...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Follow-Up Chips */}
        {suggestedFollowUps.length > 0 && (
          <div className="px-4 py-1.5 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[10px] flex-shrink-0">
            <span className="text-slate-500 font-semibold shrink-0">Follow-up:</span>
            {suggestedFollowUps.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-indigo-900/40 hover:border-indigo-500/50 border border-slate-700/60 text-slate-300 transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Default Quick Prompts for Empty Threads */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 bg-slate-950/30 border-t border-slate-800/50 flex flex-wrap gap-1.5 text-[10px] flex-shrink-0">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 transition-all text-left"
              >
                {qp}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end space-x-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                id="input-chat-query"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder={`Ask ${currentRole.title} about biometric morphs, ELA, FFT, or chain of custody...`}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
              />
            </div>

            <button
              id="btn-send-chat-query"
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-md flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <span className="font-mono">Grounded on real forensic metrics</span>
          </div>
        </div>
      </div>
    </div>
  );
};
