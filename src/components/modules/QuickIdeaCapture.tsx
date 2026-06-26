'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Send, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

interface CapturedIdea {
  id: string;
  title: string;
  category: string;
}

export default function QuickIdeaCapture() {
  const { authFetch } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
    idea?: CapturedIdea;
  } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Ctrl+Shift+I
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const showToast = (message: string, type: 'success' | 'error', idea?: CapturedIdea) => {
    setToast({ message, type, idea });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await authFetch('/api/ideas/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to capture idea');
      }

      const data = await res.json();
      const idea: CapturedIdea = data.idea;

      setIsOpen(false);
      setText('');
      showToast(
        `💡 Idea captured${data.aiProcessed ? ' & categorised by AI' : ''}!`,
        'success',
        idea
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to capture idea', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    PRODUCT: 'text-indigo-400',
    FEATURE: 'text-sky-400',
    CONTENT: 'text-amber-400',
    BUSINESS: 'text-emerald-400',
    OTHER: 'text-gray-400',
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        className="fixed bottom-[124px] right-6 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center text-white hover:shadow-orange-500/50 transition-shadow"
        title="Quick Idea Capture (Ctrl+Shift+I)"
        aria-label="Quick Idea Capture"
      >
        <Lightbulb className="w-5 h-5" />
      </motion.button>

      {/* Capture Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-10 w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Quick Idea Capture</h3>
                    <p className="text-[10px] text-neutral-500">AI will categorise your idea automatically</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-neutral-700 text-[9px] text-neutral-500 font-mono">
                    Ctrl+Shift+I
                  </kbd>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder="Describe your idea in a few words or sentences...&#10;&#10;e.g. &quot;Build an AI-powered client health score based on communication patterns&quot;"
                    rows={4}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 text-white text-sm rounded-xl p-3.5 outline-none resize-none leading-relaxed placeholder-neutral-600 transition-colors"
                    disabled={submitting}
                  />
                  {/* Shimmer gradient bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-950 to-transparent pointer-events-none rounded-b-xl" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                    <Sparkles className="w-3 h-3 text-amber-500/60" />
                    <span>AI will extract title + category</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-600">
                      {text.length > 0 ? `${text.length} chars` : 'Press Enter to capture'}
                    </span>
                    <motion.button
                      type="submit"
                      disabled={!text.trim() || submitting}
                      whileHover={!submitting && text.trim() ? { scale: 1.04 } : {}}
                      whileTap={!submitting && text.trim() ? { scale: 0.97 } : {}}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-orange-500/30 transition-shadow"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Capturing...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Capture
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success / Error Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: 20 }}
            className={`fixed bottom-24 right-6 z-50 max-w-sm rounded-xl shadow-xl border p-4 ${
              toast.type === 'success'
                ? 'bg-neutral-900 border-amber-500/30'
                : 'bg-neutral-900 border-red-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  toast.type === 'success' ? 'text-amber-400' : 'text-red-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{toast.message}</p>
                {toast.idea && (
                  <div className="mt-1.5">
                    <p className="text-xs text-neutral-400 truncate">{toast.idea.title}</p>
                    <span
                      className={`text-[10px] font-semibold ${
                        CATEGORY_COLORS[toast.idea.category] || 'text-gray-400'
                      }`}
                    >
                      {toast.idea.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
