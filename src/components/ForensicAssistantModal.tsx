/**
 * MorphGuard AI — Grounded Forensic Analyst AI Copilot
 * Queries Gemini 2.5 Flash strictly conditioned on the case's computed evidence vector.
 */

import React, { useState } from 'react';
import { X, Bot, Send, Sparkles, AlertCircle, HelpCircle, Shield, CornerDownLeft } from 'lucide-react';
import { ForensicCase } from '../types.js';

interface ForensicAssistantModalProps {
  currentCase: ForensicCase | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ForensicAssistantModal: React.FC<ForensicAssistantModalProps> = ({
  currentCase,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: currentCase
        ? `Hello, Examiner. I am your MorphGuard AI Forensic Intelligence Copilot for Case ${currentCase.caseNumber}. I am grounded strictly in the computed biometric measurements and multi-signal results for this image. How can I assist your technical evaluation?`
        : 'Welcome to MorphGuard AI Copilot. Please select an active forensic case to inspect findings.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !currentCase) return null;

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCase.id,
          question: q,
        }),
      });

      if (!res.ok) {
        throw new Error('Assistant query failed.');
      }

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer || 'No analysis could be formulated for this prompt.',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'A communication error occurred with the forensic copilot service.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'Explain the sensor noise residual findings.',
    'Why was this case assigned its current risk level?',
    'What do the LBP entropy and GLCM homogeneity scores mean?',
    'Explain the primary limitations for this screening.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Forensic Copilot: Case {currentCase.caseNumber}
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                  GEMINI 2.5 FLASH GROUNDED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Grounded strictly in case #{currentCase.caseNumber} biometric measurements
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

        {/* Chat History */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>
              Evidence Grounding Active: Responses are derived directly from this case’s mathematical signal vector and cannot override the deterministic engine.
            </span>
          </div>

          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl rounded-bl-none text-xs text-slate-400 flex items-center space-x-2">
                  <Bot className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                  <span>Synthesizing forensic evidence...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Prompts & Input Box */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {sampleQuestions.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(sq)}
                disabled={isLoading}
                className="text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700/60 transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about this case's forensic signals or biometric metrics..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
