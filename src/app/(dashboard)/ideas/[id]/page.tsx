'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Clock,
  User,
  X,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AIChatPanel from '@/components/modules/AIChatPanel';


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

interface Validation {
  id: string;
  type: string; // 'VALIDATION' | 'FACT_CHECK'
  prompt: string;
  response: string; // JSON string
  confidence: number;
  claims: unknown; // parsed response details or list of claims
  created_at: string;
}

interface IdeaDetails {
  id: string;
  title: string;
  description: string | null;
  category: 'PRODUCT' | 'FEATURE' | 'CONTENT' | 'BUSINESS' | 'OTHER';
  status: 'RAW' | 'VALIDATED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  impact: number;
  effort: number;
  tags: string[];
  created_at: string;
  creator: { id: string; name: string; avatar_url?: string | null };
  validations: Validation[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PRODUCT: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/25' },
  FEATURE: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/25' },
  CONTENT: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25' },
  BUSINESS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  OTHER: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/25' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  RAW: { label: 'Raw Idea', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  VALIDATED: { label: 'Validated', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  APPROVED: { label: 'Approved', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  IMPLEMENTED: { label: 'Implemented', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const STAGES = ['RAW', 'VALIDATED', 'APPROVED', 'IMPLEMENTED'] as const;

// Simple Custom Markdown Renderer
function Markdown({ text }: { text: string }) {
  const parseMarkdown = (str: string) => {
    let html = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/```([\s\S]+?)```/g, '<pre class="bg-neutral-900 text-neutral-100 p-2.5 rounded-apple text-[11px] my-2 overflow-x-auto font-mono"><code>$1</code></pre>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-foreground mt-3 mb-1.5 uppercase tracking-wider">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-foreground mt-4 mb-2 border-b border-border/45 pb-0.5">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-base font-bold text-foreground mt-4 mb-2">$1</h1>');
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="list-disc ml-4 my-0.5 text-xs">$1</li>');
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

export default function IdeaDetailsPage({ params }: { params: { id: string } }) {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();

  const [idea, setIdea] = useState<IdeaDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat and Sidebar states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Status transition loader
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchIdea = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/ideas/${params.id}`);
      if (res.ok) {
        const data = (await res.json()) as IdeaDetails;
        setIdea(data);
      } else {
        showToast('Idea not found.', 'error');
        router.push('/ideas');
      }
    } catch (error) {
      console.error('Fetch idea detail error:', error);
      showToast('Error loading idea details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, params.id, router]);

  const fetchChatMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/ai/chat/IDEA/${params.id}`);
      if (res.ok) {
        setChatMessages(await res.json());
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  }, [authFetch, params.id]);

  useEffect(() => {
    fetchIdea();
    fetchChatMessages();
  }, [fetchIdea, fetchChatMessages]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchIdea();
      fetchChatMessages();
    };

    socket.on('ideas:update', handleUpdate);
    socket.on('idea:update', handleUpdate);
    return () => {
      socket.off('ideas:update', handleUpdate);
      socket.off('idea:update', handleUpdate);
    };
  }, [socket, fetchIdea, fetchChatMessages]);

  const handleUpdateStatus = async (newStatus: 'APPROVED' | 'REJECTED' | 'IMPLEMENTED') => {
    setIsUpdatingStatus(true);
    try {
      const res = await authFetch(`/api/ideas/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Idea marked as ${newStatus.toLowerCase()}!`);
        await fetchIdea();
      } else {
        showToast('Failed to update status.', 'error');
      }
    } catch {
      showToast('Error updating status.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteIdea = async () => {
    if (!confirm('Are you sure you want to delete this idea?')) return;
    try {
      const res = await authFetch(`/api/ideas/${params.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Idea deleted.');
        router.push('/ideas');
      } else {
        showToast('Failed to delete idea.', 'error');
      }
    } catch {
      showToast('Error deleting idea.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-44 w-full rounded-apple" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-80 md:col-span-2 rounded-apple" />
          <Skeleton className="h-80 rounded-apple" />
        </div>
      </div>
    );
  }

  if (!idea) return null;



  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 text-foreground">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-apple shadow-lg flex items-center gap-2 border text-sm ${
              toast.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to list */}
      <div>
        <Link
          href="/ideas"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Product Ideas
        </Link>
      </div>

      {/* Main header block */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${CATEGORY_COLORS[idea.category]?.bg} ${CATEGORY_COLORS[idea.category]?.text} ${CATEGORY_COLORS[idea.category]?.border} border`}>
                  {idea.category}
                </Badge>
                <Badge className={`${STATUS_CONFIG[idea.status]?.bg} ${STATUS_CONFIG[idea.status]?.text} ${STATUS_CONFIG[idea.status]?.border} border`}>
                  {STATUS_CONFIG[idea.status]?.label}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">{idea.title}</h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  Created by: <strong className="text-foreground">{idea.creator.name}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Logged: {new Date(idea.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Delete button */}
            <Button variant="secondary" onClick={handleDeleteIdea} className="text-red-400 hover:text-red-300 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 shrink-0 self-start md:self-center">
              <Trash2 size={14} className="mr-1.5" />
              Delete Idea
            </Button>
          </div>

          {/* Description Display */}
          <div className="border-t border-border/60 mt-5 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-2">
              Concept / Notes
            </h4>
            <div
              className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: idea.description || '<i>No detailed description provided.</i>' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress timeline */}
      <div className="bg-card border border-border p-4 rounded-apple shadow-sm">
        <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-medium">
          {STAGES.map((s, idx) => {
            const isCompleted = STAGES.indexOf(idea.status as unknown as typeof STAGES[number]) >= idx;
            const isCurrent = idea.status === s;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isCurrent
                        ? 'border-apple-blue bg-apple-blue text-white ring-4 ring-apple-blue/20 font-bold'
                        : isCompleted
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
                    }`}
                  >
                    {isCompleted && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span className={isCurrent ? 'text-apple-blue font-semibold' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'}>
                    {s}
                  </span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-2 transition-colors ${STAGES.indexOf(idea.status as unknown as typeof STAGES[number]) > idx ? 'bg-green-500/50' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Grid Workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left cols: Interactive Discussion Logs */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <MessageSquare size={16} className="text-apple-blue" />
                AI Interactive Discussion
              </span>
              <Button size="sm" onClick={() => setIsChatOpen(true)} className="flex items-center gap-1 shadow-sm">
                <Sparkles size={12} />
                Continue Discussion
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark space-y-3">
                  <p>No discussion history logged for this idea.</p>
                  <Button size="sm" variant="secondary" onClick={() => setIsChatOpen(true)}>
                    Start Conversation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                  {chatMessages.map((msg) => {
                    const isUser = msg.role === 'USER' || msg.role === 'user';
                    return (
                      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-apple p-3 border shadow-sm ${
                          isUser ? 'bg-apple-blue border-apple-blue/15 text-white' : 'bg-apple-gray/40 dark:bg-sf-bg-elevatedDark/30 border-border text-foreground'
                        }`}>
                          {msg.images && msg.images.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {msg.images.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Attachment"
                                  className="h-16 max-w-full rounded object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {isUser ? (
                            <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <Markdown text={msg.content} />
                          )}
                          <div className="text-[9px] mt-1.5 opacity-60 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right col: Stats & Action statuses */}
        <div className="space-y-6">
          {/* Status changes card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <Compass size={16} className="text-indigo-400" />
                Idea Stage Control
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                Transition this concept through the progression stages. APPROVED status implies planning is complete.
              </p>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <Button
                  disabled={isUpdatingStatus || idea.status === 'APPROVED'}
                  onClick={() => handleUpdateStatus('APPROVED')}
                  className="w-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-1.5 text-xs py-1.5 shadow-sm"
                >
                  <CheckCircle2 size={13} />
                  Approve Concept
                </Button>

                <Button
                  disabled={isUpdatingStatus || idea.status === 'IMPLEMENTED'}
                  onClick={() => handleUpdateStatus('IMPLEMENTED')}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 text-xs py-1.5 shadow-sm"
                >
                  <FileCheck size={13} />
                  Mark Implemented
                </Button>

                <Button
                  disabled={isUpdatingStatus || idea.status === 'REJECTED'}
                  onClick={() => handleUpdateStatus('REJECTED')}
                  className="w-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 text-xs py-1.5 shadow-sm"
                >
                  <X size={13} />
                  Reject Idea
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validation History */}
          <Card className="border-border shadow-sm">
            <CardHeader
              onClick={() => setHistoryOpen(!historyOpen)}
              className="border-b border-border/60 pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-apple-gray/20 dark:hover:bg-sf-bg-elevatedDark/10 transition-colors select-none"
            >
              <span className="text-base font-semibold flex items-center gap-1.5">
                <Clock size={16} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                Validation Audit Log
              </span>
              {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </CardHeader>
            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="p-4 space-y-4">
                    {idea.validations.length === 0 ? (
                      <div className="text-center py-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        No validations run yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/60 text-xs">
                        {idea.validations.map((v) => (
                          <div key={v.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold uppercase text-[9px] px-1 bg-apple-gray dark:bg-sf-bg-elevatedDark text-foreground rounded">
                                {v.type.replace('_', ' ')}
                              </span>
                              <span className="text-sf-text-secondaryLight/70 text-[9px]">
                                {new Date(v.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="opacity-80">AI Confidence:</span>
                              <strong className="font-semibold text-foreground">
                                {Math.round(v.confidence * 100)}%
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* Slide-out AIChatPanel Drawer */}
      <AIChatPanel
        contextType="IDEA"
        contextId={idea.id}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        embedded={false}
      />
    </div>
  );
}


