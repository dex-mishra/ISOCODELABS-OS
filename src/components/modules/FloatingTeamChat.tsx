'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamChat } from '@/hooks/useTeamChat';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChannelSelector from '@/components/team-chat/ChannelSelector';
import { ConnectionStatusIndicator } from '@/components/team-chat/ConnectionStatusIndicator';
import MessageFeed from '@/components/team-chat/MessageFeed';
import MessageInput from '@/components/team-chat/MessageInput';

export default function FloatingTeamChat() {
  const { user } = useAuth();
  const {
    channels,
    activeChannel,
    messages,
    connectionStatus,
    hasMore,
    isLoadingMore,
    selectChannel,
    sendMessage,
    uploadImage,
    loadMoreMessages,
  } = useTeamChat();

  const [isOpen, setIsOpen] = useState(false);

  // Auto-select first channel when panel opens and no channel is selected
  useEffect(() => {
    if (isOpen && !activeChannel && channels.length > 0) {
      selectChannel(channels[0].id);
    }
  }, [isOpen, activeChannel, channels, selectChannel]);

  // Keyboard shortcut: Ctrl+Shift+C toggles the panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Toggle on Ctrl+Shift+C / Cmd+Shift+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        // Guard: Don't toggle if user is typing in any input/textarea
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        e.preventDefault();
        setIsOpen((o) => !o);
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const handleChannelChange = useCallback(
    (id: string) => {
      selectChannel(id);
    },
    [selectChannel]
  );

  if (!user) return null;

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        title="Team Chat (Ctrl+Shift+C)"
        className="fixed bottom-[72px] right-6 z-40 h-11 w-11 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageSquare size={20} />
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
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[92vw] flex flex-col bg-card border-l border-border shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-apple-gray/65 dark:bg-sf-bg-elevatedDark/65">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Team Chat
                  </span>
                  <span className="text-[9px] bg-neutral-500/10 border border-neutral-500/20 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark px-1.5 py-0.5 rounded-full font-bold">
                    Ctrl+Shift+C
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ChannelSelector
                    channels={channels}
                    activeId={activeChannel}
                    onChange={handleChannelChange}
                  />
                  <ConnectionStatusIndicator status={connectionStatus} />
                  <button
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    className="p-1 hover:bg-border/60 rounded-full text-sf-text-secondaryLight"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <MessageFeed
                messages={messages}
                currentUserId={user.id}
                hasMore={hasMore}
                onLoadMore={loadMoreMessages}
                isLoadingMore={isLoadingMore}
              />

              {/* Message Input */}
              <MessageInput
                onSend={sendMessage}
                onUploadImage={uploadImage}
                disabled={!activeChannel}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
