'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Sparkles,
  Search,
  Grid,
  TrendingUp,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import AIChatPanel from '@/components/modules/AIChatPanel';

interface Validation {
  id: string;
  confidence: number;
}

interface Creator {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: 'PRODUCT' | 'FEATURE' | 'CONTENT' | 'BUSINESS' | 'OTHER';
  status: 'RAW' | 'VALIDATED' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
  impact: number;
  effort: number;
  tags: string[];
  created_at: string;
  creator: Creator;
  validations?: Validation[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PRODUCT: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/25' },
  FEATURE: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/25' },
  CONTENT: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25' },
  BUSINESS: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/25' },
  OTHER: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/25' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  RAW: { label: 'Raw Idea', bg: 'bg-gray-500/10', text: 'text-gray-400' },
  VALIDATED: { label: 'Validated', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  APPROVED: { label: 'Approved', bg: 'bg-green-500/10', text: 'text-green-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-400' },
  IMPLEMENTED: { label: 'Implemented', bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

export default function IdeasDashboard() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  const [activeTab, setActiveTab] = useState<'grid' | 'matrix'>('grid');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterConfidence, setFilterConfidence] = useState('ALL');
  const [sortOption, setSortOption] = useState('newest');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Hover state for matrix view tooltip
  const [hoveredIdea, setHoveredIdea] = useState<Idea | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterCategory !== 'ALL') queryParams.append('category', filterCategory);
      if (filterStatus !== 'ALL') queryParams.append('status', filterStatus);
      if (searchQuery) queryParams.append('search', searchQuery);
      queryParams.append('sort', sortOption);

      const res = await authFetch(`/api/ideas?${queryParams.toString()}`);
      if (res.ok) {
        let fetchedIdeas = (await res.json()) as Idea[];

        // Apply confidence filter in-memory
        if (filterConfidence !== 'ALL') {
          fetchedIdeas = fetchedIdeas.filter((idea) => {
            const conf = idea.validations?.[0]?.confidence;
            if (conf === undefined) return false;
            
            if (filterConfidence === 'high') return conf >= 0.75;
            if (filterConfidence === 'medium') return conf >= 0.5 && conf < 0.75;
            if (filterConfidence === 'low') return conf < 0.5;
            return true;
          });
        }

        setIdeas(fetchedIdeas);
      } else {
        showToast('Failed to retrieve ideas.', 'error');
      }
    } catch (error) {
      console.error('Fetch ideas error:', error);
      showToast('Error loading ideas.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, filterCategory, filterStatus, filterConfidence, searchQuery, sortOption]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchIdeas();
    };

    socket.on('ideas:update', handleUpdate);
    return () => {
      socket.off('ideas:update', handleUpdate);
    };
  }, [socket, fetchIdeas]);

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.75) return { text: 'High', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
    if (confidence >= 0.5) return { text: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: 'Low', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 pb-16">
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

      {/* Left Column: Ideas List / Matrix */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Ideas</h1>
            <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
              Capture, map, and fact-check product and feature concepts using Vertex AI evaluation models.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-apple-gray dark:bg-sf-bg-elevatedDark p-1 rounded-apple border border-border">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-apple transition-all ${
                activeTab === 'grid'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Grid size={12} />
                Grid View
              </span>
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-apple transition-all ${
                activeTab === 'matrix'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp size={12} />
                Matrix (2x2)
              </span>
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-apple shadow-sm">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-apple-gray dark:bg-sf-bg-elevatedDark px-2.5 py-1.5 rounded-apple border border-border">
              <Search size={14} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
              <input
                type="text"
                placeholder="Search title, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs focus:ring-0 w-44"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
            >
              <option value="ALL">All Categories</option>
              <option value="PRODUCT">Product</option>
              <option value="FEATURE">Feature</option>
              <option value="CONTENT">Content</option>
              <option value="BUSINESS">Business</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
            >
              <option value="ALL">All Statuses</option>
              <option value="RAW">Raw Idea</option>
              <option value="VALIDATED">Validated</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="IMPLEMENTED">Implemented</option>
            </select>

            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
            >
              <option value="ALL">All Confidence Levels</option>
              <option value="high">High (≥ 75%)</option>
              <option value="medium">Medium (50% - 74%)</option>
              <option value="low">Low (&lt; 50%)</option>
            </select>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue text-foreground"
            >
              <option value="newest">Newest First</option>
              <option value="highest_confidence">Highest Confidence</option>
              <option value="highest_impact">Highest Impact</option>
              <option value="lowest_effort">Lowest Effort</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[220px] w-full rounded-apple" />
            <Skeleton className="h-[220px] w-full rounded-apple" />
            <Skeleton className="h-[220px] w-full rounded-apple" />
          </div>
        ) : activeTab === 'grid' ? (
          /* --- GRID VIEW --- */
          <div>
            {ideas.length === 0 ? (
              <div className="py-20 text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark bg-card border border-border rounded-apple shadow-sm">
                <Info size={28} className="mx-auto mb-2 text-sf-text-secondaryLight/60" />
                No ideas found matching the active filters. Use the AI chat panel on the right to brainstorm and log a new idea.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ideas.map((idea) => {
                  const latestValidation = idea.validations?.[0];
                  const hasConfidence = latestValidation?.confidence !== undefined;
                  const confidenceObj = hasConfidence ? getConfidenceLevel(latestValidation.confidence) : null;

                  return (
                    <motion.div
                      key={idea.id}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="bg-card border border-border rounded-apple p-5 flex flex-col justify-between h-[230px] hover:shadow-md hover:border-apple-blue/40 transition-all cursor-pointer relative"
                    >
                      <Link href={`/ideas/${idea.id}`} className="flex flex-col justify-between h-full">
                        <div>
                          {/* Tags & Meta Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              <Badge className={`${CATEGORY_COLORS[idea.category]?.bg} ${CATEGORY_COLORS[idea.category]?.text} ${CATEGORY_COLORS[idea.category]?.border} border font-medium`}>
                                {idea.category}
                              </Badge>
                              <Badge className={`${STATUS_CONFIG[idea.status]?.bg} ${STATUS_CONFIG[idea.status]?.text} border border-transparent`}>
                                {STATUS_CONFIG[idea.status]?.label}
                              </Badge>
                            </div>

                            {/* Confidence Indicator */}
                            {hasConfidence && confidenceObj && (
                              <Badge className={`${confidenceObj.color} border flex items-center gap-1 scale-90`}>
                                <Sparkles size={10} />
                                {Math.round(latestValidation.confidence * 100)}% Conf
                              </Badge>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-apple-blue transition-colors">
                            {idea.title}
                          </h3>

                          {/* Description Preview */}
                          <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-3 mt-1.5 leading-relaxed">
                            {idea.description ? idea.description.replace(/<[^>]*>/g, '') : 'No description provided.'}
                          </p>
                        </div>

                        {/* Footer: Matrix Indicator & Creator */}
                        <div className="border-t border-border/60 pt-3 flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-4 text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            <span className="flex items-center gap-1">
                              <span className="opacity-75">Impact:</span>
                              <span className="text-foreground">{idea.impact}/10</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="opacity-75">Effort:</span>
                              <span className="text-foreground">{idea.effort}/10</span>
                            </span>
                          </div>

                          {/* tags */}
                          {idea.tags.length > 0 && (
                            <div className="flex gap-1 overflow-hidden max-w-[120px] justify-end truncate">
                              {idea.tags.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark px-1.5 py-0.5 rounded-full font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* --- MATRIX VIEW --- */
          <Card className="border-border overflow-hidden">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg text-foreground">Impact vs. Effort Matrix</h3>
                <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  Visualize product ideas mapped by complexity and value. Hover over dots to inspect.
                </p>
              </div>

              {/* Matrix Container */}
              <div className="relative w-full max-w-2xl mx-auto border border-border/80 rounded-apple aspect-square bg-apple-gray/25 dark:bg-sf-bg-elevatedDark/10 p-8">
                {/* Quadrant Labels */}
                <div className="absolute top-2 left-2 text-[10px] uppercase font-bold tracking-wider text-green-400/80 bg-green-500/5 px-2 py-0.5 border border-green-500/10 rounded">
                  Quick Wins (High Impact, Low Effort)
                </div>
                <div className="absolute top-2 right-2 text-[10px] uppercase font-bold tracking-wider text-indigo-400/80 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                  Strategic Bets (High Impact, High Effort)
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] uppercase font-bold tracking-wider text-amber-400/80 bg-amber-500/5 px-2 py-0.5 border border-amber-500/10 rounded">
                  Incremental (Low Impact, Low Effort)
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] uppercase font-bold tracking-wider text-red-400/80 bg-red-500/5 px-2 py-0.5 border border-red-500/10 rounded">
                  Money Pit / Reconsider (Low Impact, High Effort)
                </div>

                {/* Grid Lines */}
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] border-t border-dashed border-border/60" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] border-l border-dashed border-border/60" />

                {/* Axis Labels */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold uppercase tracking-widest text-sf-text-secondaryLight dark:text-sf-text-secondaryDark select-none">
                  Impact (Y-Axis)
                </div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-sf-text-secondaryLight dark:text-sf-text-secondaryDark select-none">
                  Effort (X-Axis)
                </div>

                {/* Matrix Plot Area */}
                <div className="relative w-full h-full">
                  {ideas.map((idea) => {
                    // Coordinate mappings (scores are 1-10)
                    const leftPercentage = ((idea.effort - 1) / 9) * 100;
                    const topPercentage = (1 - (idea.impact - 1) / 9) * 100;

                    return (
                      <motion.div
                        key={idea.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.4, zIndex: 10 }}
                        style={{
                          position: 'absolute',
                          left: `${leftPercentage}%`,
                          top: `${topPercentage}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onMouseEnter={(e) => {
                          setHoveredIdea(idea);
                          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                          if (rect) {
                            setTooltipPos({
                              x: e.clientX - rect.left + 15,
                              y: e.clientY - rect.top - 65,
                            });
                          }
                        }}
                        onMouseLeave={() => setHoveredIdea(null)}
                        className="cursor-pointer"
                      >
                        <Link href={`/ideas/${idea.id}`}>
                          <div
                            className={`w-4 h-4 rounded-full border border-card shadow-sm transition-all duration-300 ${
                              idea.category === 'PRODUCT'
                                ? 'bg-indigo-500 shadow-indigo-500/40'
                                : idea.category === 'FEATURE'
                                ? 'bg-sky-500 shadow-sky-500/40'
                                : idea.category === 'CONTENT'
                                ? 'bg-amber-500 shadow-amber-500/40'
                                : idea.category === 'BUSINESS'
                                ? 'bg-emerald-500 shadow-emerald-500/40'
                                : 'bg-gray-400 shadow-gray-400/40'
                            }`}
                          />
                        </Link>
                      </motion.div>
                    );
                  })}

                  {/* Tooltip Popup on Hover */}
                  {hoveredIdea && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                      }}
                      className="z-50 bg-black/90 text-white rounded-apple p-3 shadow-xl border border-white/10 w-56 pointer-events-none text-xs backdrop-blur-md"
                    >
                      <div className="font-bold truncate">{hoveredIdea.title}</div>
                      <div className="flex gap-1.5 items-center mt-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/10 font-bold uppercase text-[9px]">
                          {hoveredIdea.category}
                        </span>
                        <span className="opacity-80">
                          ({hoveredIdea.impact} Impact, {hoveredIdea.effort} Effort)
                        </span>
                      </div>
                      {hoveredIdea.validations?.[0]?.confidence !== undefined && (
                        <div className="mt-1.5 flex items-center gap-1 text-green-400 font-semibold">
                          <Sparkles size={11} />
                          AI Score: {Math.round(hoveredIdea.validations[0].confidence * 100)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: AI Discuss Sidebar */}
      <div className="w-full lg:w-[400px] shrink-0 h-[600px] lg:h-[calc(100vh-140px)] sticky top-[90px]">
        <AIChatPanel
          contextType="IDEA"
          contextId={null}
          onLogged={() => {
            showToast('Product idea captured successfully!');
            fetchIdeas();
          }}
          embedded={true}
        />
      </div>
    </div>
  );
}
