'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Plus,
  Search,
  Bookmark,
  MessageSquare,
  Sparkles,
  Trash2,
  ExternalLink,
  FileText,
  Video,
  Award,
  Layers,
  CheckCircle,
  X,
  BookOpen,
  Filter,
  RotateCcw,
  CheckSquare,
  BookmarkCheck,
  Send,
  Loader2
} from 'lucide-react';

/* ── Interfaces ─────────────────────────────────────────────────────────── */
enum ExploreResourceType {
  ARTICLE = 'ARTICLE',
  PAPER = 'PAPER',
  TUTORIAL = 'TUTORIAL',
  VIDEO = 'VIDEO',
  BOOK = 'BOOK',
}

interface IndustryOption {
  id: string;
  name: string;
}

interface BookmarkItem {
  id: string;
  note?: string | null;
  highlight_text?: string | null;
}

interface ExploreResource {
  id: string;
  title: string;
  url?: string | null;
  content?: string | null;
  type: ExploreResourceType;
  topic?: string | null;
  industry_id?: string | null;
  industry?: { id: string; name: string; icon?: string | null; color?: string | null } | null;
  ai_summary?: string | null;
  ai_key_points?: any; // JSON array
  tags: string[];
  is_read: boolean;
  created_at: string;
  bookmarks: BookmarkItem[];
}

interface QAMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudyPlanStep {
  resourceId: string;
  order: number;
  objective: string;
  resource: { id: string; title: string; type: string; topic?: string | null } | null;
}

export default function ExplorePage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  // Data State
  const [resources, setResources] = useState<ExploreResource[]>([]);
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ExploreResourceType | 'ALL'>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string | 'ALL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | 'ALL'>('ALL');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [filterReadStatus, setFilterReadStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');

  // Multi-Selection State for Study Plan
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);

  // Active resource detail panel
  const [activeResourceId, setActiveResourceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'bookmarks'>('summary');

  // Bookmarking highlight / note state
  const [highlightText, setHighlightText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Q&A State
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<{ [resourceId: string]: QAMessage[] }>({});
  const [qaLoading, setQaLoading] = useState(false);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<ExploreResource[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Study Plan Modal
  const [studyPlanSteps, setStudyPlanSteps] = useState<StudyPlanStep[]>([]);
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [showStudyPlanModal, setShowStudyPlanModal] = useState(false);

  // Add Resource Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<ExploreResourceType>(ExploreResourceType.ARTICLE);
  const [newTopic, setNewTopic] = useState('');
  const [newIndustryId, setNewIndustryId] = useState('');
  const [newTagsString, setNewTagsString] = useState('');
  const [addingResource, setAddingResource] = useState(false);

  // Fetch all resources
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/explore');
      if (res.ok) {
        setResources(await res.json());
      }
    } catch (e) {
      console.error('Failed to load explore resources', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Fetch industries
  const fetchIndustries = useCallback(async () => {
    try {
      const res = await authFetch('/api/industries');
      if (res.ok) {
        setIndustries(await res.json());
      }
    } catch (e) {
      console.error('Failed to load industries', e);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchResources();
    fetchIndustries();
  }, [fetchResources, fetchIndustries]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchResources();
    };
    socket.on('explore:update', handleUpdate);
    return () => {
      socket.off('explore:update', handleUpdate);
    };
  }, [socket, fetchResources]);

  // Get active resource details
  const activeResource = useMemo(() => {
    return resources.find(r => r.id === activeResourceId) || null;
  }, [resources, activeResourceId]);

  // Derive unique topics and tags from all resources
  const allTopics = useMemo(() => {
    const topics = new Set<string>();
    resources.forEach(r => {
      if (r.topic) topics.add(r.topic);
    });
    return Array.from(topics).sort();
  }, [resources]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    resources.forEach(r => {
      if (Array.isArray(r.tags)) {
        r.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [resources]);

  // Filtered resources
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchesSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.topic || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'ALL' || r.type === selectedType;
      const matchesTopic = selectedTopic === 'ALL' || r.topic === selectedTopic;
      const matchesTag = selectedTag === 'ALL' || r.tags.includes(selectedTag);
      const matchesBookmark = !filterBookmarked || r.bookmarks.length > 0;

      const matchesRead =
        filterReadStatus === 'ALL' ||
        (filterReadStatus === 'READ' && r.is_read) ||
        (filterReadStatus === 'UNREAD' && !r.is_read);

      return matchesSearch && matchesType && matchesTopic && matchesTag && matchesBookmark && matchesRead;
    });
  }, [resources, searchQuery, selectedType, selectedTopic, selectedTag, filterBookmarked, filterReadStatus]);

  // Clear filters helper
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSelectedTopic('ALL');
    setSelectedTag('ALL');
    setFilterBookmarked(false);
    setFilterReadStatus('ALL');
  };

  // Toggle Read Status API call
  const toggleReadStatus = async (resource: ExploreResource) => {
    try {
      const updated = !resource.is_read;
      // Optimistic Update
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, is_read: updated } : r));

      await authFetch(`/api/explore/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: updated }),
      });
    } catch (e) {
      console.error('Failed to update read status', e);
      // Rollback
      fetchResources();
    }
  };

  // Add Resource API call
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setAddingResource(true);
      const tagsArray = newTagsString
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const res = await authFetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          url: newUrl.trim() || undefined,
          content: newContent.trim() || undefined,
          type: newType,
          topic: newTopic.trim() || undefined,
          industry_id: newIndustryId || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setResources(prev => [added, ...prev]);
        setShowAddModal(false);
        // Reset fields
        setNewTitle('');
        setNewUrl('');
        setNewContent('');
        setNewType(ExploreResourceType.ARTICLE);
        setNewTopic('');
        setNewIndustryId('');
        setNewTagsString('');
      }
    } catch (err) {
      console.error('Failed to create resource', err);
    } finally {
      setAddingResource(false);
    }
  };

  // Delete Resource API
  const handleDeleteResource = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      setResources(prev => prev.filter(r => r.id !== id));
      if (activeResourceId === id) setActiveResourceId(null);

      await authFetch(`/api/explore/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete resource', e);
      fetchResources();
    }
  };

  // Bookmark Toggle or highlight/notes save API
  const handleSaveBookmark = async () => {
    if (!activeResourceId) return;

    try {
      setSavingBookmark(true);
      const active = activeResource;
      const currentBookmark = active?.bookmarks?.[0] || null;

      const res = await authFetch('/api/explore/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentBookmark?.id || undefined,
          resource_id: activeResourceId,
          highlight_text: highlightText.trim() || undefined,
          note: noteText.trim() || undefined,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        // Update resources state
        setResources(prev =>
          prev.map(r => {
            if (r.id === activeResourceId) {
              return {
                ...r,
                bookmarks: [
                  {
                    id: saved.id,
                    highlight_text: saved.highlight_text,
                    note: saved.note,
                  },
                ],
              };
            }
            return r;
          })
        );
        // Clear quick inputs
        setHighlightText('');
        setNoteText('');
      }
    } catch (e) {
      console.error('Failed to save bookmark', e);
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      // Optimistic clear
      setResources(prev =>
        prev.map(r => {
          if (r.id === activeResourceId) {
            return { ...r, bookmarks: [] };
          }
          return r;
        })
      );

      await authFetch(`/api/explore/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete bookmark', e);
      fetchResources();
    }
  };

  // Q&A submission API
  const handleSendQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !activeResourceId) return;

    const currentQuestion = qaQuestion.trim();
    const history = qaHistory[activeResourceId] || [];

    // Optimistically add user message
    const updatedHistory: QAMessage[] = [...history, { role: 'user', content: currentQuestion }];
    setQaHistory(prev => ({ ...prev, [activeResourceId]: updatedHistory }));
    setQaQuestion('');
    setQaLoading(true);

    try {
      const res = await authFetch(`/api/explore/${activeResourceId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion, history }),
      });

      if (res.ok) {
        const data = await res.json();
        setQaHistory(prev => ({
          ...prev,
          [activeResourceId]: [...updatedHistory, { role: 'assistant', content: data.answer }],
        }));
      } else {
        setQaHistory(prev => ({
          ...prev,
          [activeResourceId]: [
            ...updatedHistory,
            { role: 'assistant', content: 'Sorry, I failed to process your question at this moment.' },
          ],
        }));
      }
    } catch (err) {
      console.error('Q&A request failed', err);
    } finally {
      setQaLoading(false);
    }
  };

  // Get recommendations based on active resource
  const handleGetRecommendations = async () => {
    if (!activeResource) return;
    try {
      setRecLoading(true);
      // Simulate/derive recommendations in frontend client based on topic/tags matching
      const matches = resources
        .filter(r => r.id !== activeResourceId)
        .map(r => {
          let score = 0;
          if (r.topic === activeResource.topic) score += 3;
          if (r.industry_id === activeResource.industry_id) score += 2;
          // count overlapping tags
          const overlap = r.tags.filter(t => activeResource.tags.includes(t)).length;
          score += overlap * 2;
          return { resource: r, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.resource)
        .slice(0, 3);

      setRecommendations(matches);
    } catch (e) {
      console.error('Recommendations failed', e);
    } finally {
      setRecLoading(false);
    }
  };

  // Compile selected resources into Study Plan path
  const handleGenerateStudyPlan = async () => {
    if (selectedResourceIds.length === 0) return;
    try {
      setStudyPlanLoading(true);
      setShowStudyPlanModal(true);

      const res = await authFetch('/api/explore/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_ids: selectedResourceIds }),
      });

      if (res.ok) {
        setStudyPlanSteps(await res.json());
      }
    } catch (err) {
      console.error('Failed to compile study plan', err);
    } finally {
      setStudyPlanLoading(false);
    }
  };

  const handleToggleResourceSelection = (id: string) => {
    setSelectedResourceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Resource Icon matching
  const getResourceIcon = (type: ExploreResourceType) => {
    switch (type) {
      case ExploreResourceType.VIDEO:
        return <Video size={16} className="text-red-500" />;
      case ExploreResourceType.BOOK:
        return <BookOpen size={16} className="text-orange-500" />;
      case ExploreResourceType.TUTORIAL:
        return <Award size={16} className="text-emerald-500" />;
      case ExploreResourceType.PAPER:
        return <Layers size={16} className="text-indigo-500" />;
      default:
        return <FileText size={16} className="text-sky-500" />;
    }
  };

  // Render Skeletons during initial load
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <div className="flex gap-6 h-[70vh]">
          <div className="w-64 bg-card border border-border p-4 rounded-apple space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto min-h-[85vh]">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-lg text-white">
            <Compass size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Explore & Learning Hub</h1>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Curate digital assets, compile study programs, and query documents with AI.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedResourceIds.length > 0 && (
            <Button
              onClick={handleGenerateStudyPlan}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-apple gap-2"
            >
              <Sparkles size={16} />
              Create Study Plan ({selectedResourceIds.length})
            </Button>
          )}
          <Button onClick={() => setShowAddModal(true)} className="bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple gap-2">
            <Plus size={16} />
            Add Resource
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Left Sidebar (Filters) ────────────────────────────────────────── */}
        <aside className="w-full lg:w-64 bg-card border border-border rounded-xl p-4 shrink-0 space-y-6 shadow-apple-sm">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={12} /> Filters
            </span>
            {(selectedType !== 'ALL' || selectedTopic !== 'ALL' || selectedTag !== 'ALL' || filterBookmarked || filterReadStatus !== 'ALL' || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-apple-blue hover:underline flex items-center gap-1"
              >
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sf-text-secondaryLight" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search resources..."
              className="pl-9 h-9 text-xs rounded-apple"
            />
          </div>

          {/* Types */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-neutral-400">Resource Type</p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedType('ALL')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                  selectedType === 'ALL'
                    ? 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent'
                    : 'bg-transparent text-sf-text-secondaryLight border-border hover:bg-apple-gray dark:hover:bg-neutral-800'
                }`}
              >
                All
              </button>
              {Object.values(ExploreResourceType).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                    selectedType === t
                      ? 'bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent'
                      : 'bg-transparent text-sf-text-secondaryLight border-border hover:bg-apple-gray dark:hover:bg-neutral-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          {allTopics.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-neutral-400">Topic</p>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => setSelectedTopic('ALL')}
                  className={`text-left px-2 py-1 text-xs rounded-lg transition-all ${
                    selectedTopic === 'ALL'
                      ? 'bg-apple-blue/10 text-apple-blue font-semibold'
                      : 'text-sf-text-secondaryLight hover:bg-apple-gray dark:hover:bg-neutral-800/40'
                  }`}
                >
                  All Topics
                </button>
                {allTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className={`text-left px-2 py-1 text-xs rounded-lg transition-all truncate ${
                      selectedTopic === topic
                        ? 'bg-apple-blue/10 text-apple-blue font-semibold'
                        : 'text-sf-text-secondaryLight hover:bg-apple-gray dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-neutral-400">Popular Tags</p>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto no-scrollbar">
                <button
                  onClick={() => setSelectedTag('ALL')}
                  className={`px-2 py-0.5 text-[10px] rounded-md border transition-all ${
                    selectedTag === 'ALL'
                      ? 'bg-apple-blue text-white border-transparent'
                      : 'bg-apple-gray dark:bg-neutral-800 text-sf-text-secondaryLight border-border'
                  }`}
                >
                  All Tags
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2 py-0.5 text-[10px] rounded-md border transition-all truncate ${
                      selectedTag === tag
                        ? 'bg-apple-blue text-white border-transparent'
                        : 'bg-apple-gray dark:bg-neutral-800 text-sf-text-secondaryLight border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Read / Bookmarks Filter Toggles */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label htmlFor="bookmark-toggle" className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium">Bookmarks Only</label>
              <input
                id="bookmark-toggle"
                type="checkbox"
                checked={filterBookmarked}
                onChange={e => setFilterBookmarked(e.target.checked)}
                className="w-4 h-4 text-apple-blue border-gray-300 rounded focus:ring-apple-blue"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-neutral-400">Read Status</p>
              <div className="grid grid-cols-3 gap-1 bg-apple-gray dark:bg-neutral-800 p-0.5 rounded-lg text-center">
                {(['ALL', 'UNREAD', 'READ'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFilterReadStatus(opt)}
                    className={`text-[10px] py-1 rounded-md font-medium transition-all ${
                      filterReadStatus === opt
                        ? 'bg-white dark:bg-neutral-700 shadow-apple-sm text-foreground'
                        : 'text-sf-text-secondaryLight hover:text-foreground'
                    }`}
                  >
                    {opt === 'ALL' ? 'All' : opt === 'UNREAD' ? 'Unread' : 'Read'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content (Grid + Drawer) ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-start w-full">
          {/* Resource Grid */}
          <main className="flex-1 space-y-4 w-full">
            <div className="flex items-center justify-between text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              <span>Showing {filteredResources.length} of {resources.length} resources</span>
              {selectedResourceIds.length > 0 && (
                <button
                  onClick={() => setSelectedResourceIds([])}
                  className="text-apple-blue hover:underline font-semibold"
                >
                  Clear Selection ({selectedResourceIds.length})
                </button>
              )}
            </div>

            {filteredResources.length === 0 ? (
              <Card className="text-center py-16 border-dashed border-2">
                <CardContent className="space-y-3">
                  <BookOpen size={40} className="mx-auto text-sf-text-secondaryLight" />
                  <p className="text-sm font-semibold">No resources match your filters.</p>
                  <Button onClick={resetFilters} variant="secondary" className="rounded-apple text-xs">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredResources.map(resource => {
                    const isSelected = selectedResourceIds.includes(resource.id);
                    const isBookmarked = resource.bookmarks.length > 0;

                    return (
                      <motion.div
                        key={resource.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          className={`relative group border hover:border-apple-blue/40 transition-all shadow-apple-sm rounded-xl overflow-hidden cursor-pointer ${
                            activeResourceId === resource.id ? 'ring-2 ring-apple-blue border-transparent' : ''
                          }`}
                          onClick={() => {
                            setActiveResourceId(resource.id);
                            // Auto trigger recommendation when click
                            setRecommendations([]);
                            setHighlightText('');
                            setNoteText('');
                          }}
                        >
                          <CardContent className="p-4 space-y-3">
                            {/* Top row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {getResourceIcon(resource.type)}
                                <Badge className="text-[9px] uppercase">{resource.type}</Badge>
                              </div>
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {/* Selection checkmark */}
                                <button
                                  onClick={() => handleToggleResourceSelection(resource.id)}
                                  className={`p-1 rounded-md transition-all ${
                                    isSelected
                                      ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
                                      : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-500'
                                  }`}
                                  title="Add to Study Plan"
                                >
                                  <CheckSquare size={14} />
                                </button>
                                {/* Read Checkbox */}
                                <button
                                  onClick={() => toggleReadStatus(resource)}
                                  className={`p-1 rounded-md transition-all ${
                                    resource.is_read
                                      ? 'text-emerald-500'
                                      : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-500'
                                  }`}
                                  title={resource.is_read ? 'Mark as Unread' : 'Mark as Read'}
                                >
                                  <CheckCircle size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Title */}
                            <div>
                              <h3 className="text-xs font-bold leading-snug line-clamp-2 min-h-[32px] group-hover:text-apple-blue transition-colors">
                                {resource.title}
                              </h3>
                              {resource.topic && (
                                <p className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1 font-semibold truncate">
                                  {resource.topic}
                                </p>
                              )}
                            </div>

                            {/* Tags list */}
                            {Array.isArray(resource.tags) && resource.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 max-h-[22px] overflow-hidden">
                                {resource.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-apple-gray dark:bg-neutral-800 text-sf-text-secondaryLight"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {resource.tags.length > 3 && (
                                  <span className="text-[9px] text-neutral-400 font-medium">+{resource.tags.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Footer stats */}
                            <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] text-neutral-400">
                              <span>{new Date(resource.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                {isBookmarked && (
                                  <span title="Bookmarked"><BookmarkCheck size={12} className="text-amber-500" /></span>
                                )}
                                {resource.url && (
                                  <a
                                    href={resource.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:text-apple-blue flex items-center gap-0.5"
                                  >
                                    <ExternalLink size={10} /> Link
                                  </a>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </main>

          {/* Right Detail Panel Drawer */}
          <AnimatePresence>
            {activeResource && (
              <motion.aside
                initial={{ opacity: 0, x: 50, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 380 }}
                exit={{ opacity: 0, x: 50, width: 0 }}
                className="w-full md:w-[380px] bg-card border border-border rounded-xl shadow-apple-md overflow-hidden shrink-0 flex flex-col h-[75vh] sticky top-6"
              >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10">
                  <div className="flex items-center gap-1.5">
                    {getResourceIcon(activeResource.type)}
                    <span className="text-xs font-bold truncate max-w-[200px]">{activeResource.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteResource(activeResource.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete Resource"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setActiveResourceId(null)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-foreground hover:bg-apple-gray dark:hover:bg-neutral-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Tabs Selector */}
                <div className="flex border-b border-border text-center text-xs">
                  {(['summary', 'qa', 'bookmarks'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 font-semibold border-b-2 capitalize transition-all ${
                        activeTab === tab
                          ? 'border-apple-blue text-apple-blue bg-apple-blue/5'
                          : 'border-transparent text-sf-text-secondaryLight hover:text-foreground'
                      }`}
                    >
                      {tab === 'qa' ? 'Q&A Chat' : tab}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {activeTab === 'summary' && (
                    <div className="space-y-4">
                      {/* Summary Section */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">AI Generated Summary</span>
                        <div className="p-3 bg-apple-gray/50 dark:bg-sf-bg-elevatedDark/10 border border-border/60 rounded-xl text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                          {activeResource.ai_summary || 'Generating AI Summary...'}
                        </div>
                      </div>

                      {/* Key takeaways */}
                      {Array.isArray(activeResource.ai_key_points) && activeResource.ai_key_points.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Key takeaways</span>
                          <ul className="space-y-1.5 list-disc pl-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            {activeResource.ai_key_points.map((pt: string, idx: number) => (
                              <li key={idx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* URL / Link section */}
                      {activeResource.url && (
                        <a
                          href={activeResource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-apple-blue/5 border border-apple-blue/20 text-apple-blue rounded-xl text-xs font-semibold hover:bg-apple-blue/10 transition-colors"
                        >
                          <span>Go to Resource Link</span>
                          <ExternalLink size={12} />
                        </a>
                      )}

                      {/* Recommendations block */}
                      <div className="pt-2 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Recommendations</span>
                          <button
                            onClick={handleGetRecommendations}
                            disabled={recLoading}
                            className="text-[10px] text-apple-blue hover:underline flex items-center gap-0.5"
                          >
                            {recLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Get Related
                          </button>
                        </div>
                        {recommendations.length > 0 && (
                          <div className="space-y-2">
                            {recommendations.map(r => (
                              <div
                                key={r.id}
                                onClick={() => setActiveResourceId(r.id)}
                                className="p-2 border border-border rounded-lg hover:border-apple-blue/40 transition-colors cursor-pointer text-xs"
                              >
                                <p className="font-semibold line-clamp-1">{r.title}</p>
                                <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 mt-1">
                                  <span>{r.type}</span>
                                  <span>·</span>
                                  <span>{r.topic}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'qa' && (
                    <div className="flex flex-col h-full space-y-4">
                      {/* Q&A chat history container */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px] max-h-[360px] no-scrollbar">
                        {(qaHistory[activeResource.id] || []).length === 0 ? (
                          <div className="text-center py-8 text-sf-text-secondaryLight">
                            <MessageSquare size={24} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                            <p className="text-[11px]">Ask questions grounded in this resource content.</p>
                          </div>
                        ) : (
                          (qaHistory[activeResource.id] || []).map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col space-y-1 ${
                                msg.role === 'user' ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                                  msg.role === 'user'
                                    ? 'bg-apple-blue text-white rounded-br-none'
                                    : 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-foreground rounded-bl-none'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                        {qaLoading && (
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                            <Loader2 size={12} className="animate-spin text-apple-blue" />
                            <span>AI is analyzing resource and formatting answer...</span>
                          </div>
                        )}
                      </div>

                      {/* Chat form */}
                      <form onSubmit={handleSendQA} className="flex gap-2">
                        <Input
                          value={qaQuestion}
                          onChange={e => setQaQuestion(e.target.value)}
                          placeholder="Ask about this resource..."
                          disabled={qaLoading}
                          className="h-9 text-xs rounded-apple"
                        />
                        <Button
                          type="submit"
                          disabled={qaLoading || !qaQuestion.trim()}
                          className="h-9 w-9 p-0 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple flex items-center justify-center"
                        >
                          <Send size={14} />
                        </Button>
                      </form>
                    </div>
                  )}

                  {activeTab === 'bookmarks' && (
                    <div className="space-y-4">
                      {/* Active Bookmarks */}
                      {activeResource.bookmarks.map((bm, idx) => (
                        <div key={idx} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2 relative">
                          <button
                            onClick={() => handleRemoveBookmark(bm.id)}
                            className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                          {bm.highlight_text && (
                            <div>
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">Highlighted Text</span>
                              <p className="text-[11px] italic text-neutral-600 dark:text-neutral-300 pl-2 border-l-2 border-amber-500">
                                &quot;{bm.highlight_text}&quot;
                              </p>
                            </div>
                          )}
                          {bm.note && (
                            <div>
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">My Note</span>
                              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                                {bm.note}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Bookmark form */}
                      <div className="pt-2 border-t border-border space-y-3">
                        <span className="text-xs font-semibold">New Bookmark/Highlight</span>
                        <div className="space-y-2">
                          <textarea
                            value={highlightText}
                            onChange={e => setHighlightText(e.target.value)}
                            placeholder="Paste text highlight or snippet from resource..."
                            className="w-full p-2.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-apple-blue min-h-[60px]"
                          />
                          <Input
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            placeholder="Add your note/takeaway..."
                            className="h-9 text-xs rounded-apple"
                          />
                          <Button
                            onClick={handleSaveBookmark}
                            disabled={savingBookmark || (!highlightText.trim() && !noteText.trim())}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-apple text-xs gap-1.5"
                          >
                            {savingBookmark ? <Loader2 size={12} className="animate-spin" /> : <Bookmark size={12} />}
                            {activeResource.bookmarks.length > 0 ? 'Update Bookmark' : 'Add Bookmark'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Add Resource Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !addingResource && setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-apple-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <CardHeader className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <span className="font-bold text-sm">Add Learning Resource</span>
                <button
                  onClick={() => !addingResource && setShowAddModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-foreground transition-all"
                  disabled={addingResource}
                >
                  <X size={16} />
                </button>
              </CardHeader>
              <form onSubmit={handleAddResource} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                <div className="space-y-1">
                  <label htmlFor="res-title" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Title *</label>
                  <Input
                    id="res-title"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Enter resource title"
                    required
                    disabled={addingResource}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="res-type" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Type *</label>
                    <select
                      id="res-type"
                      value={newType}
                      onChange={e => setNewType(e.target.value as ExploreResourceType)}
                      className="w-full h-10 px-3 bg-card border border-border rounded-apple text-xs focus:outline-none focus:ring-1 focus:ring-apple-blue"
                      disabled={addingResource}
                    >
                      {Object.values(ExploreResourceType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="res-topic" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Topic/Domain</label>
                    <Input
                      id="res-topic"
                      value={newTopic}
                      onChange={e => setNewTopic(e.target.value)}
                      placeholder="e.g. Frontend, Backend, Sales"
                      disabled={addingResource}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="res-url" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">URL (Optional)</label>
                    <Input
                      id="res-url"
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      disabled={addingResource}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="res-industry" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Linked Industry (Optional)</label>
                    <select
                      id="res-industry"
                      value={newIndustryId}
                      onChange={e => setNewIndustryId(e.target.value)}
                      className="w-full h-10 px-3 bg-card border border-border rounded-apple text-xs focus:outline-none focus:ring-1 focus:ring-apple-blue"
                      disabled={addingResource}
                    >
                      <option value="">Select an Industry</option>
                      {industries.map(ind => (
                        <option key={ind.id} value={ind.id}>{ind.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="res-tags" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Tags (comma separated)</label>
                  <Input
                    id="res-tags"
                    value={newTagsString}
                    onChange={e => setNewTagsString(e.target.value)}
                    placeholder="react, nextjs, routing (autotagged if empty)"
                    disabled={addingResource}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="res-content" className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Content text (For summary/Q&A)</label>
                  <textarea
                    id="res-content"
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="Paste the article contents or transcripts here for complete AI analytics..."
                    className="w-full min-h-[120px] p-3 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-apple-blue"
                    disabled={addingResource}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addingResource || !newTitle.trim()}
                  className="w-full bg-apple-blue hover:bg-apple-blue-hover text-white rounded-apple py-2.5 text-xs font-bold gap-2"
                >
                  {addingResource ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating AI Summaries & Key Points...
                    </>
                  ) : (
                    'Add Resource'
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Study Plan Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showStudyPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !studyPlanLoading && setShowStudyPlanModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-apple-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <CardHeader className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" />
                  <span className="font-bold text-sm">AI Structured Study Plan</span>
                </div>
                <button
                  onClick={() => !studyPlanLoading && setShowStudyPlanModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-foreground transition-all"
                  disabled={studyPlanLoading}
                >
                  <X size={16} />
                </button>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {studyPlanLoading ? (
                  <div className="text-center py-16 space-y-4">
                    <Loader2 size={32} className="animate-spin text-purple-600 mx-auto" />
                    <p className="text-xs text-neutral-500">Analyzing resources and compiling logical learning path...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-3 bg-purple-500/5 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-xs">
                      Gemini arranged your selected items in a logical study sequence to maximize learning efficiency.
                    </div>

                    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-purple-200 dark:before:bg-purple-900/50">
                      {studyPlanSteps.map((step, idx) => (
                        <div key={idx} className="relative space-y-1">
                          {/* Chronological bullet */}
                          <div className="absolute -left-[21px] top-0.5 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold ring-4 ring-white dark:ring-neutral-900">
                            {step.order}
                          </div>
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {step.resource?.title || 'Unknown Resource'}
                            {step.resource && (
                              <Badge className="text-[8px] scale-90">{step.resource.type}</Badge>
                            )}
                          </h4>
                          {step.resource?.topic && (
                            <p className="text-[10px] font-semibold text-neutral-400">{step.resource.topic}</p>
                          )}
                          <p className="text-xs leading-relaxed text-sf-text-secondaryLight dark:text-sf-text-secondaryDark bg-apple-gray/40 dark:bg-sf-bg-elevatedDark/10 p-2.5 rounded-lg border border-border/40">
                            {step.objective}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
                <Button
                  onClick={() => setShowStudyPlanModal(false)}
                  disabled={studyPlanLoading}
                  className="rounded-apple text-xs bg-neutral-800 text-white hover:bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
