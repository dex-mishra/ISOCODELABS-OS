'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Send,
  Sparkles,
  Image as ImageIcon,
  X,
  Plus,
  ArrowUpRight,
  Copy,
  PlusCircle,
  Lightbulb,
  FileText,
  Minimize2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatMessage {
  id: string;
  context_type: string;
  context_id: string | null;
  role: string;
  content: string;
  model_used: string;
  images: string[];
  created_at: string;
}

interface AIChatPanelProps {
  contextType: 'IDEA' | 'CONTENT';
  contextId?: string | null;
  onLogged?: (data: unknown) => void;
  onInsertBody?: (content: string) => void;
  embedded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

// Simple Custom Markdown Renderer
function Markdown({ text }: { text: string }) {
  const parseMarkdown = (str: string) => {
    // Escape simple tags to prevent breaking layout
    let html = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-neutral-900 text-neutral-100 p-2.5 rounded-apple text-[11px] my-2 overflow-x-auto font-mono"><code>$1</code></pre>');
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-foreground mt-3 mb-1.5 uppercase tracking-wider">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-foreground mt-4 mb-2 border-b border-border/45 pb-0.5">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-bold text-foreground mt-4 mb-2">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    
    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');

    // Bullet Lists
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="list-disc ml-4 my-0.5 text-xs">$1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  return (
    <div 
      className="text-xs leading-relaxed space-y-1 text-foreground break-words prose prose-sm dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}
    />
  );
}

// Mock Nanobana Image History presets
const MOCK_NANOBANA_HISTORY = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&auto=format&fit=crop&q=60',
];

export default function AIChatPanel({
  contextType,
  contextId = null,
  onLogged,
  onInsertBody,
  embedded = false,
  isOpen = true,
  onClose,
}: AIChatPanelProps) {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [model, setModel] = useState<'gemini-pro' | 'gemini-1.5-flash'>('gemini-pro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);

  interface ExtractedData {
    title?: string;
    description?: string;
    body?: string;
    category?: string;
    type?: string;
  }

  // Extraction dialogs
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);

  // Form details state
  const [logTitle, setLogTitle] = useState('');
  const [logCategory, setLogCategory] = useState('PRODUCT');
  const [logContentType, setLogContentType] = useState('BLOG_POST');
  const [logDescription, setLogDescription] = useState('');
  const [logImpact, setLogImpact] = useState(5);
  const [logEffort, setLogEffort] = useState(5);
  const [logTagsText, setLogTagsText] = useState('');

  const feedRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll helper
  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  };

  const fetchChatHistory = useCallback(async () => {
    if (!contextId) {
      setMessages([]);
      return;
    }
    try {
      const res = await authFetch(`/api/ai/chat/${contextType}/${contextId}`);
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [authFetch, contextType, contextId]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data: { contextId: string | null }) => {
      if (data.contextId === contextId) {
        fetchChatHistory();
      }
    };
    const eventName = `${contextType.toLowerCase()}:update`;
    socket.on(eventName, handleUpdate);
    return () => {
      socket.off(eventName, handleUpdate);
    };
  }, [socket, contextType, contextId, fetchChatHistory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachedImages.length === 0) return;

    const currentInputText = inputText;
    const currentAttachedImages = [...attachedImages];
    setInputText('');
    setAttachedImages([]);
    setShowImagePicker(false);
    setIsGenerating(true);

    try {
      // Map history for API
      const conversationHistory = messages.map((m) => ({
        role: m.role as 'user' | 'model',
        content: m.content,
        images: m.images,
      }));

      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInputText,
          context_type: contextType,
          context_id: contextId,
          model,
          conversation_history: conversationHistory,
          images: currentAttachedImages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Append user and ai messages
        setMessages((prev) => [...prev, data.userMessage, data.aiMessage]);
      } else {
        const err = await res.json();
        // Insert artificial error block
        const errMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          context_type: contextType,
          context_id: contextId,
          role: 'AI',
          content: `⚠️ **Error:** ${err.error || 'AI Service is currently unavailable. Please verify credentials or simulate offline settings.'}`,
          model_used: model,
          images: [],
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMessage]);
      }
    } catch {
      const errMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        context_type: contextType,
        context_id: contextId,
        role: 'AI',
        content: `⚠️ **Error:** Failed to connect to server. Please try again.`,
        model_used: model,
        images: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract structured details
  const handleExtractDetails = async () => {
    if (messages.length === 0) return;
    setIsExtracting(true);

    try {
      const history = messages.map((m) => ({
        role: m.role as 'user' | 'model',
        content: m.content,
        images: m.images,
      }));

      const endpoint = contextType === 'IDEA' ? '/api/ai/chat/extract-idea' : '/api/ai/chat/extract-content';
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_history: history }),
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedData(data);
        setLogTitle(data.title || '');
        setLogDescription(data.description || data.body || '');
        if (contextType === 'IDEA') {
          setLogCategory(data.category || 'PRODUCT');
        } else {
          setLogContentType(data.type || 'BLOG_POST');
        }
        setShowLogModal(true);
      }
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  // Submit new item
  const handleSaveExtractedItem = async () => {
    if (!logTitle.trim()) return;

    try {
      // Collect message IDs of the conversation to link them
      const messageIds = messages.map((m) => m.id);

      const endpoint = contextType === 'IDEA' ? '/api/ideas' : '/api/content';
      const payload = contextType === 'IDEA' ? {
        title: logTitle,
        description: logDescription,
        category: logCategory,
        impact: logImpact,
        effort: logEffort,
        tags: logTagsText.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
        chat_message_ids: messageIds,
      } : {
        title: logTitle,
        body: logDescription,
        type: logContentType,
        status: 'IDEA',
        platforms: [],
        tags: logTagsText.split(',').map((t) => t.trim()).filter((t) => t.length > 0),
        chat_message_ids: messageIds,
      };

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedItem = await res.json();
        setShowLogModal(false);
        setMessages([]);
        if (onLogged) {
          onLogged(savedItem);
        }
      }
    } catch (error) {
      console.error('Failed to save concept:', error);
    }
  };

  // Handle local image uploads as Base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachedImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(files[i]);
    }
  };

  // Markdown copy utility
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen && !embedded) return null;

  const showLogBtn = !contextId && messages.length >= 2;

  return (
    <div
      className={`flex flex-col bg-card/75 border border-border backdrop-blur-md overflow-hidden ${
        embedded ? 'w-full h-full rounded-apple shadow-sm' : 'fixed top-[70px] right-0 bottom-0 z-40 w-[420px] shadow-2xl animate-in slide-in-from-right duration-300'
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-apple-gray/65 dark:bg-sf-bg-elevatedDark/65">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-apple-blue" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            {contextType === 'IDEA' ? 'Product AI Discuss' : 'Content Brainstorm'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Model selection */}
          <div className="flex items-center gap-1 bg-apple-gray dark:bg-sf-bg-elevatedDark px-2 py-0.5 border border-border rounded-full scale-90">
            <span className="text-[10px] font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Model:
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as 'gemini-pro' | 'gemini-1.5-flash')}
              className="bg-transparent border-0 text-[10px] outline-none font-bold text-apple-blue cursor-pointer focus:ring-0"
            >
              <option value="gemini-pro">Gemini Pro</option>
              <option value="gemini-1.5-flash">Gemini Flash</option>
            </select>
          </div>

          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-border/60 rounded-full transition-colors text-sf-text-secondaryLight"
              title="Close panel"
            >
              <Minimize2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-3.5">
            <div className="p-4 bg-apple-gray dark:bg-sf-bg-elevatedDark rounded-full text-apple-blue">
              <Sparkles size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">
                {contextType === 'IDEA' ? 'Discuss your product ideas' : 'Brainstorm your copy'}
              </h4>
              <p className="text-xs text-sf-text-secondaryLight max-w-xs leading-relaxed">
                {contextType === 'IDEA'
                  ? "Describe your product vision. AI will validation check your assertions, research competitors, and structure it."
                  : "Draft scripts, outlines, blog headers, or social media posts interactively before copy-pasting."}
              </p>
            </div>

            {/* Suggestions */}
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs pt-2">
              <button
                onClick={() => setInputText(contextType === 'IDEA' ? 'I have an idea for a fitness tracking app with wearable integration.' : 'Help me outline a blog post about real-time web development.')}
                className="text-[11px] text-left px-3 py-2 rounded-apple bg-apple-gray/50 dark:bg-sf-bg-elevatedDark/40 hover:bg-apple-gray border border-border/40 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground transition-all truncate"
              >
                💡 {contextType === 'IDEA' ? 'Fitness tracking app idea...' : 'Outline blog post...'}
              </button>
              <button
                onClick={() => setInputText(contextType === 'IDEA' ? 'Differentiate a block-based collaborative workspace editor.' : 'Write a YouTube video script intro about building custom CRM tools.')}
                className="text-[11px] text-left px-3 py-2 rounded-apple bg-apple-gray/50 dark:bg-sf-bg-elevatedDark/40 hover:bg-apple-gray border border-border/40 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground transition-all truncate"
              >
                💡 {contextType === 'IDEA' ? 'Collaborative workspace idea...' : 'CRM YouTube script intro...'}
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'USER' || msg.role === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-apple p-3 border shadow-sm ${
                    isUser
                      ? 'bg-apple-blue border-apple-blue/15 text-white'
                      : 'bg-card border-border/75 text-foreground'
                  }`}
                >
                  {/* Attached Images inline preview */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {msg.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Attachment"
                          className="h-20 max-w-full rounded border border-white/20 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Message body */}
                  {isUser ? (
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <Markdown text={msg.content} />
                  )}

                  {/* Actions for AI responses */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 justify-end">
                      {onInsertBody && msg.content.includes('Script') && (
                        <button
                          onClick={() => onInsertBody(msg.content)}
                          className="text-[10px] font-bold text-apple-blue hover:underline flex items-center gap-0.5"
                          title="Insert Script to editor"
                        >
                          <PlusCircle size={10} /> Insert Script
                        </button>
                      )}
                      <button
                        onClick={() => handleCopyCode(msg.content)}
                        className="text-[10px] font-semibold text-sf-text-secondaryLight hover:text-foreground flex items-center gap-0.5"
                        title="Copy text"
                      >
                        <Copy size={10} /> Copy
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing State indicator */}
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

      {/* Action panel to log as idea/content */}
      {showLogBtn && (
        <div className="px-4 py-2 border-t border-border bg-apple-blue/5 flex items-center justify-between">
          <span className="text-[10px] text-sf-text-secondaryLight font-medium">
            Ready to log this concept?
          </span>
          <Button
            size="sm"
            onClick={handleExtractDetails}
            disabled={isExtracting}
            className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 border-0 hover:from-violet-500 hover:to-indigo-500 text-white animate-pulse"
          >
            <ArrowUpRight size={11} className="mr-1" />
            {isExtracting ? 'Analyzing...' : contextType === 'IDEA' ? 'Log This Idea' : 'Log as Content'}
          </Button>
        </div>
      )}

      {/* Input panel */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card">
        {/* Attached image preview area */}
        {attachedImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-apple-gray dark:bg-sf-bg-elevatedDark rounded-apple border border-border/50">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative h-12 w-12 rounded border border-border overflow-hidden shrink-0">
                <img src={img} alt="Attached preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white p-0.5 rounded-full hover:bg-black/85"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {/* File attachment toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowImagePicker(!showImagePicker)}
              className={`p-2.5 rounded-apple border border-border bg-apple-gray dark:bg-sf-bg-elevatedDark hover:bg-border/60 transition-all ${
                showImagePicker ? 'text-apple-blue ring-1 ring-apple-blue/45' : 'text-sf-text-secondaryLight'
              }`}
            >
              <ImageIcon size={14} />
            </button>

            {/* Custom image attachment choices drawer */}
            {showImagePicker && (
              <div className="absolute bottom-12 left-0 z-50 bg-card border border-border shadow-2xl rounded-apple p-3 w-56 space-y-3 animate-in slide-in-from-bottom duration-200 text-foreground">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-sf-text-secondaryLight/80">
                    Upload Local File
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-xs"
                  >
                    <Plus size={11} className="mr-1" /> Choose Image
                  </Button>
                </div>

                <div className="space-y-1.5 border-t border-border pt-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-sf-text-secondaryLight/80">
                    Imagen History
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {MOCK_NANOBANA_HISTORY.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAttachedImages((prev) => [...prev, url]);
                          setShowImagePicker(false);
                        }}
                        className="h-10 border border-border hover:border-apple-blue rounded overflow-hidden"
                      >
                        <img src={url} alt="mock imagen" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Text Input area */}
          <Input
            type="text"
            placeholder={
              contextType === 'IDEA'
                ? 'Type to discuss idea details...'
                : 'Write scripts or post drafts...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isGenerating}
            className="flex-1 text-xs"
          />

          <button
            type="submit"
            disabled={isGenerating || (!inputText.trim() && attachedImages.length === 0)}
            className="bg-apple-blue text-white p-2.5 rounded-apple hover:bg-apple-blueHover disabled:opacity-50 disabled:hover:bg-apple-blue transition-all shrink-0 shadow-sm"
          >
            <Send size={12} />
          </button>
        </div>
      </form>

      {/* CONFIRMATION LOGGING MODAL */}
      {showLogModal && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border w-full max-w-lg rounded-apple shadow-2xl p-5 space-y-4 text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-semibold text-base flex items-center gap-1.5">
                {contextType === 'IDEA' ? <Lightbulb className="text-yellow-400" size={16} /> : <FileText className="text-apple-blue" size={16} />}
                Confirm Extracted Concept
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-1 hover:bg-border/60 rounded-full transition-colors text-sf-text-secondaryLight"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto max-h-[60vh] pr-1">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                  Title
                </label>
                <Input
                  type="text"
                  value={logTitle}
                  onChange={(e) => setLogTitle(e.target.value)}
                />
              </div>

              {/* Categorization selectors */}
              {contextType === 'IDEA' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                      Category
                    </label>
                    <select
                      value={logCategory}
                      onChange={(e) => setLogCategory(e.target.value)}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
                    >
                      <option value="PRODUCT">Product Idea</option>
                      <option value="FEATURE">Feature / Enh</option>
                      <option value="CONTENT">Content Theme</option>
                      <option value="BUSINESS">Business Model</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                      Tags
                    </label>
                    <Input
                      type="text"
                      placeholder="comma, separated"
                      value={logTagsText}
                      onChange={(e) => setLogTagsText(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                      Content Type
                    </label>
                    <select
                      value={logContentType}
                      onChange={(e) => setLogContentType(e.target.value)}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
                    >
                      <option value="BLOG_POST">Blog Post</option>
                      <option value="SOCIAL_MEDIA">Social Media</option>
                      <option value="VIDEO">Video Script</option>
                      <option value="NEWSLETTER">Newsletter</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                      Tags
                    </label>
                    <Input
                      type="text"
                      placeholder="comma, separated"
                      value={logTagsText}
                      onChange={(e) => setLogTagsText(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Slider ratings for Ideas only */}
              {contextType === 'IDEA' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border/80 p-3 rounded-apple bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/10">
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Impact</span>
                      <span className="text-indigo-400">{logImpact}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={logImpact}
                      onChange={(e) => setLogImpact(parseInt(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span>Effort</span>
                      <span className="text-sky-400">{logEffort}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={logEffort}
                      onChange={(e) => setLogEffort(parseInt(e.target.value))}
                      className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* Description Body */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px] text-sf-text-secondaryLight">
                  Extracted Body Context (HTML)
                </label>
                <textarea
                  rows={6}
                  value={logDescription}
                  onChange={(e) => setLogDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => setShowLogModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveExtractedItem}>
                Save & Log
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
