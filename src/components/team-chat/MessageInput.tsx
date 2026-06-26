'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string, images?: string[]) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
}

const MAX_CHARS = 5000;
const CHAR_WARNING_THRESHOLD = 4500;
const MAX_LINES = 5;
const LINE_HEIGHT = 24; // px per line
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp';

export default function MessageInput({ onSend, onUploadImage, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const showCharCounter = charCount > CHAR_WARNING_THRESHOLD;
  const canSend = content.trim().length > 0 && !isOverLimit && !isSending && !disabled;

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * MAX_LINES;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        handleSend();
      }
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      await onSend(content.trim(), attachedImages.length > 0 ? attachedImages : undefined);
      setContent('');
      setAttachedImages([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be selected again
    e.target.value = '';

    setIsUploading(true);
    try {
      const url = await onUploadImage(file);
      setAttachedImages((prev) => [...prev, url]);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-3 border-t border-border bg-card">
      {/* Attached image previews */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachedImages.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group">
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                className="h-16 w-16 object-cover rounded-lg border border-border"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label={`Remove attachment ${index + 1}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {isUploading && (
            <div className="h-16 w-16 rounded-lg border border-border bg-apple-gray dark:bg-sf-bg-elevatedDark flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-apple-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <button
          onClick={handleImageClick}
          disabled={disabled || isUploading}
          title="Attach image"
          className="p-2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground hover:bg-border/40 rounded-lg transition-colors disabled:opacity-40 shrink-0 mb-0.5"
        >
          <Paperclip size={18} />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isSending}
            placeholder="Type a message..."
            rows={1}
            className="w-full text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue text-foreground placeholder:text-sf-text-secondaryLight/60 resize-none transition-all disabled:opacity-50"
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              maxHeight: `${LINE_HEIGHT * MAX_LINES}px`,
              overflow: 'auto',
            }}
          />
          {/* Character counter */}
          {showCharCounter && (
            <span
              className={`absolute bottom-1 right-2 text-[10px] font-medium ${
                isOverLimit ? 'text-red-500' : 'text-sf-text-secondaryLight/70'
              }`}
            >
              {charCount}/{MAX_CHARS}
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          title="Send message (Enter)"
          className="p-2.5 bg-apple-blue text-white rounded-xl hover:bg-apple-blueHover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
