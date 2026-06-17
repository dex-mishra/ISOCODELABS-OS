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
  TrendingUp,
  FileText,
  Lightbulb,
  Clock,
  Compass,
  Zap,
  BookOpen,
  User,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


interface Validation {
  id: string;
  feasibility_score: number;
  audience_fit_score: number;
  originality_score: number;
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  created_at: string;
}

interface Outline {
  id: string;
  sections: Array<{ title: string; keyPoints: string[] }>;
  estimated_word_count: number;
  estimated_read_time: number;
  created_at: string;
}

interface IdeaDetails {
  id: string;
  title: string;
  description: string | null;
  content_type: 'BLOG_POST' | 'SOCIAL_MEDIA' | 'VIDEO' | 'NEWSLETTER' | 'OTHER';
  target_audience: string | null;
  status: 'RAW' | 'VALIDATING' | 'VALIDATED' | 'OUTLINED' | 'IN_DEVELOPMENT' | 'REJECTED';
  tags: string[];
  created_at: string;
  validations: Validation[];
  outlines: Outline[];
  creator: { id: string; name: string };
}

interface Suggestions {
  format: string;
  angle: string;
  distribution: string[];
  timing: string;
}

interface TrendAnalysis {
  isTrending: boolean;
  trendingScore: number;
  relatedTrends: string[];
  competitorContent: string;
  recommendedTiming: string;
}

const STAGES = ['RAW', 'VALIDATING', 'VALIDATED', 'OUTLINED', 'IN_DEVELOPMENT'] as const;

const IDEA_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  RAW: { label: 'Raw Idea', bg: 'bg-gray-500/10', text: 'text-gray-400 border-gray-500/25' },
  VALIDATING: { label: 'Validating...', bg: 'bg-blue-500/10', text: 'text-blue-400 border-blue-500/25 animate-pulse' },
  VALIDATED: { label: 'Validated', bg: 'bg-green-500/10', text: 'text-green-400 border-green-500/25' },
  OUTLINED: { label: 'Outlined', bg: 'bg-violet-500/10', text: 'text-violet-400 border-violet-500/25' },
  IN_DEVELOPMENT: { label: 'In Dev', bg: 'bg-amber-500/10', text: 'text-amber-400 border-amber-500/25' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-400 border-red-500/25' },
};

const getScoreColorClass = (score: number) => {
  if (score >= 0.75) return 'text-green-400 border-green-500/20 bg-green-500/5';
  if (score >= 0.5) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
  return 'text-red-400 border-red-500/20 bg-red-500/5';
};

export default function IdeaDetailsPage({ params }: { params: { id: string } }) {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();

  const [idea, setIdea] = useState<IdeaDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic AI features
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);

  // Loading states
  const [isValidating, setIsValidating] = useState(false);
  const [isOutlining, setIsOutlining] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchIdea = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/content/ideas/${params.id}`);
      if (res.ok) {
        setIdea(await res.json());
      } else {
        showToast('Idea not found.', 'error');
        router.push('/content');
      }
    } catch {
      showToast('Error loading idea details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, params.id, router]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  useEffect(() => {
    if (!socket) return;
    const handleIdeasUpdate = (data: { ideaId: string }) => {
      if (data.ideaId === params.id) fetchIdea();
    };

    socket.on('ideas:update', handleIdeasUpdate);
    return () => {
      socket.off('ideas:update', handleIdeasUpdate);
    };
  }, [socket, params.id, fetchIdea]);

  // AI Operations
  const handleValidateIdea = async () => {
    setIsValidating(true);
    showToast('AI is validating concept. Analyzing feasibility & originality...');
    try {
      const res = await authFetch(`/api/content/ideas/${params.id}/validate`, { method: 'POST' });
      if (res.ok) {
        showToast('Concept validated successfully!');
        fetchIdea();
      } else {
        showToast('Failed to validate concept.', 'error');
      }
    } catch {
      showToast('Error during validation.', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateOutline = async () => {
    setIsOutlining(true);
    showToast('AI is structuring outline. Drafting sections & key points...');
    try {
      const res = await authFetch(`/api/content/ideas/${params.id}/outline`, { method: 'POST' });
      if (res.ok) {
        showToast('Content outline created!');
        fetchIdea();
      } else {
        showToast('Failed to generate outline.', 'error');
      }
    } catch {
      showToast('Error generating outline.', 'error');
    } finally {
      setIsOutlining(false);
    }
  };

  const handleFetchSuggestions = async () => {
    setIsFetchingSuggestions(true);
    showToast('AI is generating format & delivery blueprints...');
    try {
      const res = await authFetch(`/api/content/ideas/${params.id}/suggestions`, { method: 'POST' });
      if (res.ok) {
        setSuggestions(await res.json());
        showToast('Suggestions updated!');
      } else {
        showToast('Failed to fetch suggestions.', 'error');
      }
    } catch {
      showToast('Error fetching suggestions.', 'error');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleFetchTrends = async () => {
    setIsFetchingTrends(true);
    showToast('AI is validating concept against market search metrics...');
    try {
      const res = await authFetch(`/api/content/ideas/${params.id}/trend-validate`, { method: 'POST' });
      if (res.ok) {
        setTrendAnalysis(await res.json());
        showToast('Trends analyzed!');
      } else {
        showToast('Failed to check trends.', 'error');
      }
    } catch {
      showToast('Error checking trends.', 'error');
    } finally {
      setIsFetchingTrends(false);
    }
  };

  const handlePromoteToPipeline = async () => {
    if (!idea) return;
    setIsPromoting(true);
    showToast('Creating content item in pipeline...');
    try {
      // 1. Create content item
      const createRes = await authFetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: idea.title,
          type: idea.content_type,
          status: 'IDEA',
          platforms: suggestions?.distribution || [],
          tags: idea.tags,
          body: `<h3>Concept Outline</h3>\n${
            idea.outlines?.[0]
              ? idea.outlines[0].sections
                  .map(
                    (s: { title: string; keyPoints: string[] }) =>
                      `<h4>${s.title}</h4>\n<ul>\n${s.keyPoints.map((kp: string) => `<li>${kp}</li>`).join('\n')}\n</ul>`
                  )
                  .join('\n')
              : '<p>Outline pending draft.</p>'
          }`,
        }),
      });

      if (createRes.ok) {
        // 2. Set status of idea to IN_DEVELOPMENT
        await authFetch(`/api/content/ideas/${idea.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_DEVELOPMENT' }),
        });

        showToast('Concept promoted to pipeline draft!');
        router.push('/content');
      } else {
        showToast('Failed to promote concept.', 'error');
      }
    } catch {
      showToast('Error promoting concept.', 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-16 max-w-5xl mx-auto">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-full rounded-apple" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-40 col-span-2 rounded-apple" />
          <Skeleton className="h-40 rounded-apple" />
        </div>
      </div>
    );
  }

  if (!idea) return null;

  const currentValidation = idea.validations?.[0];
  const currentOutline = idea.outlines?.[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16 max-w-5xl mx-auto text-foreground">
      {/* Toast notifications */}
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

      {/* Back button */}
      <div>
        <Link
          href="/content"
          className="inline-flex items-center gap-2 text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Content Studio
        </Link>
      </div>

      {/* Concept Header */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={IDEA_STATUS_CONFIG[idea.status]?.bg + ' ' + IDEA_STATUS_CONFIG[idea.status]?.text + ' border'}>
                  {IDEA_STATUS_CONFIG[idea.status]?.label}
                </Badge>
                <Badge variant="secondary" className="text-xs uppercase tracking-wider font-semibold">
                  {idea.content_type.replace('_', ' ')}
                </Badge>
              </div>

              <h2 className="text-2xl font-bold tracking-tight">{idea.title}</h2>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  Audience: <strong className="text-foreground">{idea.target_audience || 'General public'}</strong>
                </span>
                <span>•</span>
                <span>Created: {new Date(idea.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Main promotion button */}
            {idea.status !== 'IN_DEVELOPMENT' && (
              <Button
                onClick={handlePromoteToPipeline}
                disabled={isPromoting}
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 border-0 hover:from-sky-400 hover:to-blue-500 text-white shadow-sm"
              >
                <Plus size={14} />
                Promote to Pipeline
              </Button>
            )}
          </div>

          <div className="border-t border-border mt-5 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">
              Description / Notes
            </h4>
            <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark leading-relaxed">
              {idea.description || 'No detailed description provided.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Idea Status Progression timeline */}
      <div className="bg-card border border-border p-4 rounded-apple">
        <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-medium">
          {STAGES.map((s, idx) => {
            const isCompleted = STAGES.indexOf(idea.status as typeof STAGES[number]) >= idx;
            const isCurrent = idea.status === s;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isCurrent
                        ? 'border-apple-blue bg-apple-blue text-white ring-4 ring-apple-blue/20'
                        : isCompleted
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
                    }`}
                  >
                    {isCompleted && !isCurrent ? '✓' : idx + 1}
                  </div>
                  <span className={isCurrent ? 'text-apple-blue font-semibold' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'}>
                    {s.replace('_', ' ')}
                  </span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-2 transition-colors ${STAGES.indexOf(idea.status as typeof STAGES[number]) > idx ? 'bg-green-500/50' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT TWO COLUMNS: validation and outline */}
        <div className="md:col-span-2 space-y-6">
          {/* AI VALIDATION BOX */}
          <Card className="border-border">
            <CardHeader className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <Lightbulb size={16} className="text-violet-400" />
                AI Validation & Scoring
              </span>
              <Button size="sm" onClick={handleValidateIdea} disabled={isValidating} className="flex items-center gap-1">
                <Zap size={12} />
                {isValidating ? 'Validating...' : 'Validate with AI'}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {!currentValidation ? (
                <div className="text-center py-8 text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Click &quot;Validate with AI&quot; to prompt Gemini to assess this concept.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Scores grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`border rounded-apple p-3 text-center ${getScoreColorClass(currentValidation.feasibility_score)}`}>
                      <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Feasibility</span>
                      <strong className="text-2xl font-bold mt-1 block">{Math.round(currentValidation.feasibility_score * 100)}%</strong>
                    </div>
                    <div className={`border rounded-apple p-3 text-center ${getScoreColorClass(currentValidation.audience_fit_score)}`}>
                      <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Audience Fit</span>
                      <strong className="text-2xl font-bold mt-1 block">{Math.round(currentValidation.audience_fit_score * 100)}%</strong>
                    </div>
                    <div className={`border rounded-apple p-3 text-center ${getScoreColorClass(currentValidation.originality_score)}`}>
                      <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Originality</span>
                      <strong className="text-2xl font-bold mt-1 block">{Math.round(currentValidation.originality_score * 100)}%</strong>
                    </div>
                    <div className={`border rounded-apple p-3 text-center ${getScoreColorClass(currentValidation.overall_score)}`}>
                      <span className="block text-[10px] uppercase font-bold tracking-wider opacity-85">Overall AI Score</span>
                      <strong className="text-2xl font-bold mt-1 block">{Math.round(currentValidation.overall_score * 100)}%</strong>
                    </div>
                  </div>

                  {/* Strengths & weaknesses list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">Strengths</h4>
                      <ul className="list-disc pl-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark space-y-1">
                        {currentValidation.strengths.map((str, idx) => (
                          <li key={idx}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">Weaknesses</h4>
                      <ul className="list-disc pl-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark space-y-1">
                        {currentValidation.weaknesses.map((weak, idx) => (
                          <li key={idx}>{weak}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="border-t border-border/60 pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-apple-blue mb-2">AI Optimization Strategy</h4>
                    <ul className="list-decimal pl-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark space-y-1.5">
                      {currentValidation.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI OUTLINE BOX */}
          <Card className="border-border">
            <CardHeader className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <FileText size={16} className="text-sky-400" />
                Structured Content Outline
              </span>
              <Button size="sm" onClick={handleGenerateOutline} disabled={isOutlining} className="flex items-center gap-1">
                <Sparkles size={12} />
                {isOutlining ? 'Outlining...' : 'Generate Outline'}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {!currentOutline ? (
                <div className="text-center py-8 text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Click &quot;Generate Outline&quot; to let Gemini build a structured draft outline.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Outline Stats Header */}
                  <div className="flex items-center gap-4 bg-apple-gray dark:bg-sf-bg-elevatedDark px-3 py-2 rounded-apple text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <BookOpen size={12} />
                      Est. Words: <strong className="text-foreground">{currentOutline.estimated_word_count}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Est. Read Time: <strong className="text-foreground">{currentOutline.estimated_read_time} min</strong>
                    </span>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-4 pt-2">
                    {(currentOutline.sections as unknown as Array<{ title: string; keyPoints: string[] }> || []).map((sec, idx) => (
                      <div key={idx} className="border-l-2 border-apple-blue/40 pl-4 py-1">
                        <h5 className="font-semibold text-sm text-foreground mb-1.5">{sec.title}</h5>
                        <ul className="list-disc pl-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark space-y-1">
                          {(sec.keyPoints || []).map((pt: string, pIdx: number) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: suggestions and trends */}
        <div className="space-y-6">
          {/* AI DEVELOPMENT SUGGESTIONS */}
          <Card className="border-border">
            <CardHeader className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <Compass size={16} className="text-amber-400" />
                Format & Delivery
              </span>
              <Button size="sm" variant="secondary" onClick={handleFetchSuggestions} disabled={isFetchingSuggestions}>
                {isFetchingSuggestions ? 'Loading...' : 'Get Tips'}
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {!suggestions ? (
                <div className="text-center py-6 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Click &quot;Get Tips&quot; to check distribution options and recommended styles.
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1">
                      Recommended Format
                    </h5>
                    <p className="text-foreground leading-relaxed bg-apple-gray dark:bg-sf-bg-elevatedDark p-2.5 rounded-apple border border-border/60">
                      {suggestions.format}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1">
                      Hook/Angle
                    </h5>
                    <p className="text-foreground leading-relaxed bg-apple-gray dark:bg-sf-bg-elevatedDark p-2.5 rounded-apple border border-border/60">
                      {suggestions.angle}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1.5">
                      Distribution channels
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.distribution.map((d) => (
                        <Badge key={d} variant="secondary" className="scale-95">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1">
                      Timing Recommendation
                    </h5>
                    <p className="text-foreground italic">{suggestions.timing}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI MARKET TREND VALIDATION */}
          <Card className="border-border">
            <CardHeader className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-base font-semibold flex items-center gap-1.5">
                <TrendingUp size={16} className="text-green-400" />
                Market Trend Check
              </span>
              <Button size="sm" variant="secondary" onClick={handleFetchTrends} disabled={isFetchingTrends}>
                {isFetchingTrends ? 'Loading...' : 'Check Trends'}
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {!trendAnalysis ? (
                <div className="text-center py-6 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Click &quot;Check Trends&quot; to check search metrics and competitor themes.
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="font-semibold text-xs">Trending Status:</span>
                    {trendAnalysis.isTrending ? (
                      <Badge className="bg-green-500/10 text-green-400 border border-green-500/25 flex items-center gap-1">
                        <TrendingUp size={12} />
                        Trending Topic
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Stable Interest</Badge>
                    )}
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1.5">
                      Related Search Trends
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {trendAnalysis.relatedTrends.map((t) => (
                        <Badge key={t} variant="secondary" className="scale-95 bg-green-500/5 border-green-500/10 text-green-400">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1">
                      Competitor Landscape
                    </h5>
                    <p className="text-foreground leading-relaxed bg-apple-gray dark:bg-sf-bg-elevatedDark p-2.5 rounded-apple border border-border/60">
                      {trendAnalysis.competitorContent}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold uppercase tracking-wider text-sf-text-secondaryLight dark:text-sf-text-secondaryDark text-[10px] mb-1">
                      Recommended Launch Window
                    </h5>
                    <p className="text-foreground font-semibold">{trendAnalysis.recommendedTiming}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


