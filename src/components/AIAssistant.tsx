import React, { useState, useRef, useEffect } from 'react';
import { sendAiChatMessageApi } from '../services/api';
import { Bot, X, Send, Sparkles, Minimize2, Maximize2, FileText, HelpCircle, Code2, BookOpen, RefreshCw } from 'lucide-react';

interface AIAssistantProps {
  currentSessionName?: string;
  currentTopicTitle?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

// Lightweight Rich Markdown Formatter Component
const FormattedMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Split text by fenced code blocks (```lang ... ```)
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; lang?: string; content: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', lang: match[1] || 'code', content: match[2].trim() });
    lastIndex = codeBlockRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  const renderInline = (str: string) => {
    const boldParts = str.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, idx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-slate-900">{bPart.slice(2, -2)}</strong>;
      }
      const codeParts = bPart.split(/(`.*?`)/g);
      return codeParts.map((cPart, cIdx) => {
        if (cPart.startsWith('`') && cPart.endsWith('`')) {
          return (
            <code key={cIdx} className="bg-blue-50 text-blue-700 font-mono px-1.5 py-0.5 rounded text-[11px] border border-blue-100/80 font-medium">
              {cPart.slice(1, -1)}
            </code>
          );
        }
        return cPart;
      });
    });
  };

  return (
    <div className="space-y-2">
      {parts.map((part, pIdx) => {
        if (part.type === 'code') {
          return (
            <div key={pIdx} className="my-2 bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md">
              <div className="bg-slate-800/90 px-3 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-700 flex justify-between items-center">
                <span className="font-bold text-blue-400">{(part.lang || 'CODE').toUpperCase()}</span>
                <span className="text-[9px] text-slate-400">Snippet</span>
              </div>
              <pre className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto text-emerald-400 whitespace-pre">
                <code>{part.content}</code>
              </pre>
            </div>
          );
        }

        const lines = part.content.split('\n');
        return (
          <div key={pIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-0.5" />;

              if (trimmed.startsWith('###')) {
                return (
                  <h3 key={lIdx} className="font-bold text-slate-900 text-[13px] border-b border-slate-200 pb-1 mt-2.5 mb-1 text-blue-900">
                    {renderInline(trimmed.replace(/^###\s*/, ''))}
                  </h3>
                );
              }
              if (trimmed.startsWith('####')) {
                return (
                  <h4 key={lIdx} className="font-bold text-slate-800 text-xs mt-2 mb-0.5">
                    {renderInline(trimmed.replace(/^####\s*/, ''))}
                  </h4>
                );
              }
              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 text-slate-700 ml-1 my-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <span className="flex-1">{renderInline(trimmed.replace(/^[\*\-]\s*/, ''))}</span>
                  </div>
                );
              }
              const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 text-slate-700 ml-1 my-0.5">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {numMatch[1]}
                    </span>
                    <span className="flex-1">{renderInline(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx} className="text-slate-800 leading-relaxed">{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ currentSessionName, currentTopicTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: `Hello! I am your AI Learning Assistant. I can explain complex technical concepts, summarize study materials, review code, or recommend interview prep questions for ${currentSessionName || 'your learning roadmap'}. How can I assist you today?`,
      timestamp: 'Just now'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await sendAiChatMessageApi(textToSend, {
        sessionName: currentSessionName,
        topicTitle: currentTopicTitle
      }, messages);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.reply || "I am processing your query based on enterprise L&D guidelines.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: "Apologies, I encountered a temporary connection issue. Please try again.",
          timestamp: 'Just now'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2 border border-blue-400/30"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-600 animate-pulse" />
          </div>
          <span className="font-semibold text-xs pr-1">AI Assistant</span>
          <Sparkles className="w-3.5 h-3.5 opacity-70 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div
          className={`bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col transition-all duration-300 overflow-hidden ${
            isMinimized
              ? 'w-80 h-16'
              : 'w-[420px] sm:w-[460px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-4 text-white flex items-center justify-between flex-shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  AI Learning Assistant
                </h3>
                <p className="text-[10px] text-blue-100/90 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.6 Flash • Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Preset Prompt Chips */}
              <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
                <button
                  onClick={() => handleSend("Explain SOLID Principles with C# examples")}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 font-semibold whitespace-nowrap border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Code2 className="w-3 h-3 text-blue-600" />
                  Explain SOLID
                </button>
                <button
                  onClick={() => handleSend("Generate top 3 interview questions for ASP.NET Core")}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 font-semibold whitespace-nowrap border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <HelpCircle className="w-3 h-3 text-amber-600" />
                  Interview Prep
                </button>
                <button
                  onClick={() => handleSend("What should I learn next after C# LINQ?")}
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 font-semibold whitespace-nowrap border border-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <BookOpen className="w-3 h-3 text-emerald-600" />
                  Next Step
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/50">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'ai' && (
                      <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed shadow-sm ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none whitespace-pre-wrap'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans'
                      }`}
                    >
                      {m.sender === 'user' ? (
                        m.text
                      ) : (
                        <FormattedMarkdown text={m.text} />
                      )}
                      <span className="block text-[9px] opacity-60 text-right mt-1.5 font-mono">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <span className="text-xs italic font-medium">Gemini AI is crafting response...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Box */}
              <div className="p-3 bg-white border-t border-slate-200 rounded-b-3xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask AI tutor anything about learning materials..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
