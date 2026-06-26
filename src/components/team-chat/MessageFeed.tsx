'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import ImageLightbox from './ImageLightbox';

interface MessageSender {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  images: string[];
  created_at: string;
  sender: MessageSender;
}

interface MessageFeedProps {
  messages: Message[];
  currentUserId: string;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore?: boolean;
}

export default function MessageFeed({
  messages,
  currentUserId,
  hasMore,
  onLoadMore,
  isLoadingMore = false,
}: MessageFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(messages.length);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive (appended at the end)
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;

    // New messages appended (not loaded from top via pagination)
    if (currentCount > prevCount && prevCount > 0) {
      const container = containerRef.current;
      if (container) {
        // Only auto-scroll if user is near the bottom already
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    const container = containerRef.current;
    if (container && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length === 0]);

  // Infinite scroll UP detection
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.scrollTop < 80 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleImageClick = useCallback((src: string) => {
    setLightboxSrc(src);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
  }, []);

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
          No messages yet
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
      >
        {/* Loading spinner at top for pagination */}
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Messages in chronological order (oldest at top) */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.sender.id === currentUserId}
            onImageClick={handleImageClick}
          />
        ))}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />
        )}
      </AnimatePresence>
    </>
  );
}
