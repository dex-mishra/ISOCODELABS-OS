'use client';

import React, { useState, useEffect } from 'react';
import AIChatPanel from './AIChatPanel';
import { X, Lightbulb, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AIChatGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const [contextType, setContextType] = useState<'IDEA' | 'CONTENT'>('IDEA');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+I or Cmd+I
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs p-4">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      {/* Floating popup container */}
      <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-[440px] h-[85vh] rounded-2xl overflow-hidden shadow-2xl z-55 flex flex-col"
      >
        {/* Context type selector tab bar */}
        <div className="absolute top-3.5 left-24 z-50 flex bg-apple-gray dark:bg-sf-bg-elevatedDark p-0.5 rounded-full border border-border/80 scale-90">
          <button
            onClick={() => setContextType('IDEA')}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
              contextType === 'IDEA'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-sf-text-secondaryLight hover:text-foreground'
            }`}
          >
            <Lightbulb size={9} />
            Ideas
          </button>
          <button
            onClick={() => setContextType('CONTENT')}
            className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
              contextType === 'CONTENT'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-sf-text-secondaryLight hover:text-foreground'
            }`}
          >
            <FileText size={9} />
            Content
          </button>
        </div>

        {/* The Chat Panel */}
        <AIChatPanel
          contextType={contextType}
          contextId={null} // Global chats start fresh as draft validation
          embedded={true}
          isOpen={true}
          onLogged={() => setIsOpen(false)}
        />

        {/* Custom close button inside global popup */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3.5 right-12 z-50 p-1 hover:bg-border/60 rounded-full transition-colors text-sf-text-secondaryLight dark:hover:bg-neutral-800"
          title="Close"
        >
          <X size={14} />
        </button>
      </motion.div>
    </div>
  );
}
