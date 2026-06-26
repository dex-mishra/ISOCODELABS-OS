'use client';

import React from 'react';

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

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onImageClick: (src: string) => void;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ sender }: { sender: MessageSender }) {
  const initials = sender.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (sender.avatar_url) {
    return (
      <img
        src={sender.avatar_url}
        alt={sender.name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-bold text-white leading-none">
        {initials || '?'}
      </span>
    </div>
  );
}

export default function MessageBubble({
  message,
  isOwnMessage,
  onImageClick,
}: MessageBubbleProps) {
  return (
    <div
      className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar for received messages */}
      {!isOwnMessage && <Avatar sender={message.sender} />}

      <div
        className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}
      >
        {/* Sender name for received messages */}
        {!isOwnMessage && (
          <span className="text-[11px] font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-0.5 ml-1">
            {message.sender.name}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm border ${
            isOwnMessage
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 border-violet-500/20 text-white'
              : 'bg-card border-border/75 text-foreground'
          }`}
        >
          {/* Text content */}
          {message.content && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Image thumbnails */}
          {message.images && message.images.length > 0 && (
            <div
              className={`flex flex-wrap gap-1.5 ${message.content ? 'mt-2' : ''}`}
            >
              {message.images.map((src, idx) => (
                <button
                  key={`${message.id}-img-${idx}`}
                  onClick={() => onImageClick(src)}
                  className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1"
                  aria-label={`View image ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt={`Shared image ${idx + 1}`}
                    className="max-w-[320px] w-full h-auto rounded-lg object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1 mx-1">
          {formatTimestamp(message.created_at)}
        </span>
      </div>
    </div>
  );
}
