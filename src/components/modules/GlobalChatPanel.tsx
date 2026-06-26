'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Send, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

function Markdown({ text }: { text: string }) {
  const parse = (str: string) => {
    let html = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-neutral-900 text-neutral-100 p-2 rounded text-[11px] my-2 overflow-x-auto font-mono"><code>$1</code></pre>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold mt-2 mb-1">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold mt-2 mb-1">$1</h2>');
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="list-disc ml-4 my-0.5 text-xs">$1</li>');
    html = html.replace(/\n/g, '<br />');
    return html;
  };
  return <div className="text-xs leading-relaxed text-foreground break-words" dangerouslySetInnerHTML={{ __html: parse(text) }} />;
}

export default function GlobalChatPanel() {
  const { authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gemini-3.5-flash');
  const [isGenerating, setIsGenerating] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+J toggles the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch('/api/ai/chat/history?context_type=GLOBAL');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load global chat history:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    if (isOpen) fetchHistory();
  }, [isOpen, fetchHistory]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, isGenerating]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    setIsGenerating(true);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'USER', content: text, created_at: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);

    try {
      const history = messages.map((m) => ({ role: m.role as 'user' | 'model', content: m.content }));
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context_type: 'GLOBAL',
          context_id: null,
          model,
          conversation_history: history,
          images: [],
        }),
      });

      if (!res.ok) {
        let errMsg = 'AI service unavailable.';
        try { const err = await res.json(); errMsg = err.error || errMsg; } catch {}
        setMessages((p) => [...p, { id: `e-${Date.now()}`, role: 'AI', content: `⚠️ **Error:** ${errMsg}`, created_at: new Date().toISOString() }]);
        return;
      }

      const aiId = `ai-${Date.now()}`;
      setMessages((p) => [...p, { id: aiId, role: 'AI', content: '', created_at: new Date().toISOString() }]);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder('utf-8');
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((p) => p.map((m) => (m.id === aiId ? { ...m, content: acc } : m)));
      }
    } catch (err) {
      console.error('Global chat error:', err);
      setMessages((p) => [...p, { id: `e-${Date.now()}`, role: 'AI', content: '⚠️ **Error:** Connection interrupted. Try again.', created_at: new Date().toISOString() }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        title="AI Assistant (Ctrl+J)"
        className="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Sparkles size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            />
            {/* Panel */}
            <motion.div
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[92vw] flex flex-col bg-card border-l border-border shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-apple-gray/65 dark:bg-sf-bg-elevatedDark/65">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Isocodelabs Assistant</span>
                  <span className="text-[9px] bg-neutral-500/10 border border-neutral-500/20 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark px-1.5 py-0.5 rounded-full font-bold">Ctrl+J</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="bg-transparent border border-border rounded-full px-2 py-0.5 text-[10px] outline-none font-bold text-violet-500 cursor-pointer"
                  >
                    <optgroup label="⚡ Fast">
                      <option value="gemini-3.5-flash">3.5 Flash (Default)</option>
                      <option value="gemini-3.1-flash-lite">3.1 Flash Lite</option>
                      <option value="gemini-3-flash-preview">3 Flash Preview</option>
                      <option value="gemini-2.5-flash">2.5 Flash</option>
                      <option value="gemini-2.5-flash-lite">2.5 Flash-Lite</option>
                    </optgroup>
                    <optgroup label="🧠 Advanced">
                      <option value="gemini-3.1-pro-preview">3.1 Pro (1M ctx)</option>
                      <option value="gemini-3-pro-preview">3 Pro Preview</option>
                      <option value="gemini-2.5-pro">2.5 Pro</option>
                    </optgroup>
                    <optgroup label="🖼️ Image">
                      <option value="gemini-3.1-flash-image">3.1 Flash Image</option>
                      <option value="gemini-3-pro-image">3 Pro Image</option>
                      <option value="gemini-2.5-flash-image">2.5 Flash Image</option>
                    </optgroup>
                  </select>
                  <button onClick={clearChat} title="Clear chat" className="p-1 hover:bg-border/60 rounded-full text-sf-text-secondaryLight">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setIsOpen(false)} title="Close" className="p-1 hover:bg-border/60 rounded-full text-sf-text-secondaryLight">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Feed */}
              <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-3">
                    <div className="p-4 bg-violet-500/10 rounded-full text-violet-500"><Sparkles size={28} /></div>
                    <h4 className="font-semibold text-sm">How can I help?</h4>
                    <p className="text-xs text-sf-text-secondaryLight max-w-xs leading-relaxed">
                      Ask me anything about your operations — tasks, clients, ideas, content, finances, or strategy.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUser = m.role === 'USER' || m.role === 'user';
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-apple p-3 border shadow-sm ${isUser ? 'bg-apple-blue border-apple-blue/15 text-white' : 'bg-card border-border/75 text-foreground'}`}>
                          {isUser ? <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border/75 rounded-apple px-4 py-3 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-sf-text-secondaryLight/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-sf-text-secondaryLight/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-sf-text-secondaryLight/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={send} className="p-3 border-t border-border bg-card">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isGenerating}
                    className="flex-1 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 outline-none focus:border-apple-blue text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !input.trim()}
                    className="bg-apple-blue text-white p-2.5 rounded-apple hover:bg-apple-blueHover disabled:opacity-50 transition-all shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
