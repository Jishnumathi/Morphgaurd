/**
 * MorphGuard AI — Dedicated Forensic AI Copilot Webpage
 * Full-page conversational workspace with Gemini model selector,
 * active case evidence grounding, and forensic prompt templates.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ForensicCase, UserSession } from '../types.js';

interface CopilotPageProps {
  currentUser: UserSession;
  allCases: ForensicCase[];
  initialCase?: ForensicCase | null;
  onSelectCaseDossier: (c: ForensicCase) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export const CopilotPage: React.FC<CopilotPageProps> = ({
  currentUser,
  allCases,
  initialCase,
  onSelectCaseDossier,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCase?.id || (allCases[0]?.id || ''));
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [groundingMode, setGroundingMode] = useState<boolean>(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeCase = allCases.find((c) => c.id === selectedCaseId);

  // Initialize with a welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: `**MorphGuard Multimodal Forensic Copilot** initialized. 

I am calibrated for digital image forensics, biometric passport verification (ICAO 9303), and ISO/IEC 27037 chain-of-custody documentation.

${
  activeCase
    ? `Currently anchored to case: **${activeCase.caseNumber}** (*${activeCase.targetSubjectName || activeCase.title}*).`
    : 'Select a case from the dropdown above to anchor analysis to specific evidence, or ask general biometric questions.'
}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel,
        },
      ]);
    }
  }, [activeCase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isSubmitting) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsSubmitting(true);

    try {
      // Build case context payload
      const caseContext = activeCase && groundingMode
        ? {
            caseNumber: activeCase.caseNumber,
            title: activeCase.title,
            subject: activeCase.targetSubjectName,
            hash: activeCase.imageHashSha256,
            overallScore: activeCase.results?.summary.riskScore,
            riskLevel: activeCase.results?.summary.riskLevel,
            confidence: activeCase.results?.summary.confidence,
            signals: activeCase.results?.summary.signals?.map((s) => ({
              name: s.name,
              score: s.score,
              status: s.status,
              summary: s.summary,
            })),
            notes: activeCase.notes,
            analystVerdict: activeCase.analystVerdict,
          }
        : null;

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          caseContext,
          model: selectedModel,
          user: currentUser.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Copilot service returned error');
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No response returned from model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Analysis Engine Offline:** ${err.message || 'Unable to connect to forensic service.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      title: 'Draft Court Witness Summary',
      prompt: activeCase
        ? `Draft a formal ISO/IEC 27037 Court Witness Summary for case ${activeCase.caseNumber}. Include chain of custody hash, elevated modalities, and expert recommendation.`
        : 'Draft a standard ISO/IEC 27037 Court Witness Summary template for facial morphing evidence presentation.',
    },
    {
      title: 'Interpret 2D FFT Spectral Spikes',
      prompt: 'Explain what periodic harmonic peaks in a 2D FFT frequency spectrum indicate regarding Generative AI (GAN / Diffusion) manipulation.',
    },
    {
      title: 'Analyze PRNU Noise Discontinuity',
      prompt: activeCase
        ? `Analyze the sensor noise PRNU residual for case ${activeCase.caseNumber} and explain how it confirms or refutes splicing.`
        : 'Explain how sensor PRNU noise variance between the inner face and outer background reveals splicing of two distinct camera sensors.',
    },
    {
      title: 'Evaluate Corneal Specular Highlights',
      prompt: 'What physical laws govern corneal reflection symmetry, and how do morphing algorithms violate them?',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Multimodal Biometric Forensic Intelligence</span>
            <span>·</span>
            <span>Gemini 3.1 & 3.8</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Forensic Copilot Workspace
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Conversational assistant grounded in forensic evidence, ISO/IEC 27037 standards, and NIST FRVT morphing guidelines.
          </p>
        </div>

        {/* Model Selector & Grounding Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] font-mono text-slate-400">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Reasoning)</option>
            </select>
          </div>

          <button
            onClick={() => setGroundingMode(!groundingMode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              groundingMode
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Ground AI responses in active case evidence"
          >
            {groundingMode ? 'Evidence Grounding ON' : 'General Knowledge'}
          </button>
        </div>
      </div>

      {/* Case Context Anchor Bar */}
      <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="text-xs font-medium text-slate-400 shrink-0">Active Case Anchor:</span>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none max-w-xs truncate cursor-pointer font-mono"
          >
            <option value="">No specific case (General Guidance)</option>
            {allCases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} — {c.targetSubjectName || c.title} ({c.results?.summary.riskLevel || 'Analyzed'})
              </option>
            ))}
          </select>
        </div>

        {activeCase && (
          <div className="flex items-center space-x-3 text-xs text-slate-400">
            <span>
              Risk: <strong className="text-white">{activeCase.results?.summary.riskLevel}</strong>
            </span>
            <span>·</span>
            <span>
              Risk Score:{' '}
              <strong className="text-white">
                {Math.round((activeCase.results?.summary.riskScore || 0) * 100)}%
              </strong>
            </span>
            <button
              onClick={() => onSelectCaseDossier(activeCase)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer ml-1"
            >
              Open Dossier →
            </button>
          </div>
        )}
      </div>

      {/* Quick Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isSubmitting}
            className="p-3 bg-slate-900/40 hover:bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-left group cursor-pointer disabled:opacity-50"
          >
            <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
              {qp.title}
            </div>
            <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
              {qp.prompt}
            </div>
          </button>
        ))}
      </div>

      {/* Chat Conversation Area */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col h-[600px] overflow-hidden shadow-xs">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-[10px] text-slate-400 font-mono">
                      <span>Forensic Copilot · {msg.modelUsed || selectedModel}</span>
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="hover:text-white transition-colors cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? 'Copied' : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  <div
                    className={`text-[10px] text-right font-mono mt-1 ${
                      isUser ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}
          {isSubmitting && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-150" />
                <span className="font-mono text-[11px] ml-1">Analyzing evidence and reasoning...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder={
                activeCase
                  ? `Ask forensic question grounded in ${activeCase.caseNumber}...`
                  : 'Ask about biometric morphing, ISO 27037, or PRNU noise...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
