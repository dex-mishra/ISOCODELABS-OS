'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import RichTextEditor from '@/components/ui/RichTextEditor';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
  CalendarDays,
  X,
  FileText,
  Video,
  Send,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import AIChatPanel from '@/components/modules/AIChatPanel';

interface Product {
  id: string;
  name: string;
}

interface ContentItem {
  id: string;
  title: string;
  body: string | null;
  type: 'BLOG_POST' | 'SOCIAL_MEDIA' | 'VIDEO' | 'NEWSLETTER' | 'OTHER';
  status: 'IDEA' | 'DRAFT' | 'IN_REVIEW' | 'SCHEDULED' | 'PUBLISHED';
  product_id: string | null;
  product?: { id: string; name: string } | null;
  publish_date: string | null;
  platforms: string[];
  tags: string[];
  created_at: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description: string | null;
  content_type: 'BLOG_POST' | 'SOCIAL_MEDIA' | 'VIDEO' | 'NEWSLETTER' | 'OTHER';
  target_audience: string | null;
  status: 'RAW' | 'VALIDATING' | 'VALIDATED' | 'OUTLINED' | 'IN_DEVELOPMENT' | 'REJECTED';
  tags: string[];
  created_at: string;
  validations?: Array<{ overall_score: number }> | null;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BLOG_POST: <FileText size={14} className="text-sky-400" />,
  SOCIAL_MEDIA: <Send size={14} className="text-violet-400" />,
  VIDEO: <Video size={14} className="text-pink-400" />,
  NEWSLETTER: <MessageSquare size={14} className="text-amber-400" />,
  OTHER: <CalendarDays size={14} className="text-gray-400" />,
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  IDEA: { label: 'Idea', bg: 'bg-gray-500/10', text: 'text-gray-400' },
  DRAFT: { label: 'Draft', bg: 'bg-sky-500/10', text: 'text-sky-400' },
  IN_REVIEW: { label: 'In Review', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  SCHEDULED: { label: 'Scheduled', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  PUBLISHED: { label: 'Published', bg: 'bg-green-500/10', text: 'text-green-400' },
};

const IDEA_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  RAW: { label: 'Raw Idea', bg: 'bg-gray-500/10', text: 'text-gray-400' },
  VALIDATING: { label: 'Validating...', bg: 'bg-blue-500/10', text: 'text-blue-400 animate-pulse' },
  VALIDATED: { label: 'Validated', bg: 'bg-green-500/10', text: 'text-green-400' },
  OUTLINED: { label: 'Outlined', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  IN_DEVELOPMENT: { label: 'In Dev', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-400' },
};

export default function ContentDashboard() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'ideas'>('pipeline');
  const [pipelineView, setPipelineView] = useState<'calendar' | 'list'>('calendar');

  // Data state
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isNewContentModalOpen, setIsNewContentModalOpen] = useState(false);
  const [isNewIdeaModalOpen, setIsNewIdeaModalOpen] = useState(false);
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([]);
  const [isBatchValidating, setIsBatchValidating] = useState(false);

  // Calendar dates
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form states
  const [newContentData, setNewContentData] = useState({
    title: '',
    type: 'BLOG_POST',
    status: 'IDEA',
    product_id: '',
    platforms: [] as string[],
    tags: [] as string[],
    publish_date: '',
    body: '',
  });

  const [newIdeaData, setNewIdeaData] = useState({
    title: '',
    description: '',
    content_type: 'BLOG_POST',
    target_audience: '',
    tags: [] as string[],
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch functions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Products lookup
      const prodRes = await authFetch('/api/products');
      if (prodRes.ok) {
        setProducts(await prodRes.json());
      }

      // Content pipeline list
      const queryParams = new URLSearchParams();
      if (filterType !== 'ALL') queryParams.append('type', filterType);
      if (filterStatus !== 'ALL') queryParams.append('status', filterStatus);
      if (searchQuery) queryParams.append('search', searchQuery);

      const contentRes = await authFetch(`/api/content?${queryParams.toString()}`);
      if (contentRes.ok) {
        setContentItems(await contentRes.json());
      }

      // Content ideas list
      const ideasRes = await authFetch('/api/content/ideas');
      if (ideasRes.ok) {
        setIdeas(await ideasRes.json());
      }
    } catch (error) {
      console.error('Error fetching content data:', error);
      showToast('Failed to load content data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, filterType, filterStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time listeners
  useEffect(() => {
    if (!socket) return;
    const handleContentUpdate = () => fetchData();
    const handleIdeasUpdate = () => fetchData();

    socket.on('content:update', handleContentUpdate);
    socket.on('ideas:update', handleIdeasUpdate);

    return () => {
      socket.off('content:update', handleContentUpdate);
      socket.off('ideas:update', handleIdeasUpdate);
    };
  }, [socket, fetchData]);

  // Calendar math
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Content Operations
  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContentData.title) return;

    try {
      const res = await authFetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContentData),
      });

      if (res.ok) {
        showToast('Content item created successfully!');
        setIsNewContentModalOpen(false);
        setNewContentData({
          title: '',
          type: 'BLOG_POST',
          status: 'IDEA',
          product_id: '',
          platforms: [],
          tags: [],
          publish_date: '',
          body: '',
        });
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to create content item.', 'error');
      }
    } catch {
      showToast('Error creating content item.', 'error');
    }
  };

  const handleUpdateContentDetail = async () => {
    if (!selectedContent) return;
    try {
      const res = await authFetch(`/api/content/${selectedContent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedContent),
      });

      if (res.ok) {
        showToast('Content updated successfully.');
        setSelectedContent(null);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to update content.', 'error');
      }
    } catch {
      showToast('Error updating content.', 'error');
    }
  };

  const handleScheduleContent = async () => {
    if (!selectedContent) return;
    if (!selectedContent.publish_date) {
      showToast('Please select a publish date first.', 'error');
      return;
    }

    try {
      const res = await authFetch(`/api/content/${selectedContent.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_date: selectedContent.publish_date }),
      });

      if (res.ok) {
        showToast('Content scheduled successfully!');
        setSelectedContent(null);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to schedule content.', 'error');
      }
    } catch {
      showToast('Error scheduling content.', 'error');
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return;
    try {
      const res = await authFetch(`/api/content/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Content deleted.');
        setSelectedContent(null);
        fetchData();
      } else {
        showToast('Failed to delete content.', 'error');
      }
    } catch {
      showToast('Error deleting content.', 'error');
    }
  };

  // Idea Operations
  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaData.title) return;

    try {
      const res = await authFetch('/api/content/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newIdeaData),
      });

      if (res.ok) {
        showToast('Content idea logged!');
        setIsNewIdeaModalOpen(false);
        setNewIdeaData({
          title: '',
          description: '',
          content_type: 'BLOG_POST',
          target_audience: '',
          tags: [],
        });
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to log content idea.', 'error');
      }
    } catch {
      showToast('Error logging idea.', 'error');
    }
  };

  const handleBatchValidate = async () => {
    if (selectedIdeaIds.length === 0) return;
    setIsBatchValidating(true);
    showToast(`Validating ${selectedIdeaIds.length} ideas...`);

    try {
      for (const id of selectedIdeaIds) {
        await authFetch(`/api/content/ideas/${id}/validate`, { method: 'POST' });
      }
      showToast('Batch validation complete!');
      setSelectedIdeaIds([]);
      fetchData();
    } catch {
      showToast('Batch validation encountered an error.', 'error');
    } finally {
      setIsBatchValidating(false);
    }
  };

  const handleSelectIdea = (id: string) => {
    setSelectedIdeaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Platform multi-select helpers
  const PLATFORMS = ['Blog', 'Newsletter', 'LinkedIn', 'Twitter', 'YouTube', 'TikTok'];

  const togglePlatformInForm = (platform: string) => {
    setNewContentData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const togglePlatformInEdit = (platform: string) => {
    if (!selectedContent) return;
    const current = selectedContent.platforms || [];
    setSelectedContent({
      ...selectedContent,
      platforms: current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform],
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 pb-16">
      {/* Left Column: Pipeline / Ideas views */}
      <div className="flex-1 min-w-0 space-y-6">
      {/* Toast notification */}
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Studio</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Validate content concepts using Vertex AI, coordinate publish calendars, and write drafts in rich text.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-apple-gray dark:bg-sf-bg-elevatedDark p-1 rounded-apple border border-border">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-apple transition-all ${
              activeTab === 'pipeline'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <CalendarIcon size={12} />
              Content Pipeline
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-apple transition-all ${
              activeTab === 'ideas'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              Content Ideas
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        /* --- PIPELINE CONTENT --- */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-apple">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-apple-gray dark:bg-sf-bg-elevatedDark px-2.5 py-1.5 rounded-apple border border-border">
                <Search size={14} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                <input
                  type="text"
                  placeholder="Search title, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs focus:ring-0 w-40"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue"
              >
                <option value="ALL">All Types</option>
                <option value="BLOG_POST">Blog Post</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="VIDEO">Video</option>
                <option value="NEWSLETTER">Newsletter</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-2.5 py-1.5 text-xs outline-none focus:border-apple-blue"
              >
                <option value="ALL">All Statuses</option>
                <option value="IDEA">Idea</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>

            {/* View Toggle & New Action */}
            <div className="flex items-center gap-3">
              <div className="flex bg-apple-gray dark:bg-sf-bg-elevatedDark p-1 rounded-apple border border-border">
                <button
                  onClick={() => setPipelineView('calendar')}
                  className={`p-1.5 rounded-apple transition-colors ${
                    pipelineView === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
                  }`}
                  title="Calendar View"
                >
                  <CalendarIcon size={14} />
                </button>
                <button
                  onClick={() => setPipelineView('list')}
                  className={`p-1.5 rounded-apple transition-colors ${
                    pipelineView === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
                  }`}
                  title="List View"
                >
                  <ListIcon size={14} />
                </button>
              </div>

              <Button onClick={() => setIsNewContentModalOpen(true)} className="flex items-center gap-1.5">
                <Plus size={14} />
                New Content
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-apple" />
            </div>
          ) : pipelineView === 'list' ? (
            /* LIST VIEW */
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-apple-gray/50 dark:bg-sf-bg-elevatedDark/50 text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        <th className="p-4">Title</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Platforms</th>
                        <th className="p-4">Publish Date</th>
                        <th className="p-4">Product</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {contentItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            No content items match these filters. Click &quot;New Content&quot; to create one.
                          </td>
                        </tr>
                      ) : (
                        contentItems.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedContent(item)}
                            className="text-sm hover:bg-apple-gray/35 dark:hover:bg-sf-bg-elevatedDark/10 cursor-pointer transition-colors"
                          >
                            <td className="p-4 font-medium max-w-xs truncate">{item.title}</td>
                            <td className="p-4">
                              <span className="flex items-center gap-1.5">
                                {TYPE_ICONS[item.type]}
                                <span className="text-xs uppercase tracking-wider font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                                  {item.type.replace('_', ' ')}
                                </span>
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge className={STATUS_CONFIG[item.status]?.bg + ' ' + STATUS_CONFIG[item.status]?.text}>
                                {STATUS_CONFIG[item.status]?.label}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {item.platforms.map((p) => (
                                  <Badge key={p} variant="secondary" className="text-[10px]">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-xs">
                              {item.publish_date ? new Date(item.publish_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="p-4 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                              {item.product?.name || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* CALENDAR VIEW */
            <div className="space-y-4">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between bg-card border border-border px-4 py-3 rounded-apple">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={prevMonth}>
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Today
                  </Button>
                  <Button variant="secondary" size="sm" onClick={nextMonth}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-2">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 auto-rows-[100px]">
                    {/* Empty cells for prefix days */}
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/5 rounded-apple border border-border/40 opacity-40"
                      />
                    ))}

                    {/* Active Days */}
                    {Array.from({ length: getDaysInMonth(currentDate) }).map((_, index) => {
                      const dayNumber = index + 1;
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                      
                      // Filter items scheduled on this day
                      const dayItems = contentItems.filter((item) => {
                        if (!item.publish_date) return false;
                        const itemDate = new Date(item.publish_date);
                        return (
                          itemDate.getDate() === dayNumber &&
                          itemDate.getMonth() === currentDate.getMonth() &&
                          itemDate.getFullYear() === currentDate.getFullYear()
                        );
                      });

                      const isToday =
                        new Date().getDate() === dayNumber &&
                        new Date().getMonth() === currentDate.getMonth() &&
                        new Date().getFullYear() === currentDate.getFullYear();

                      return (
                        <div
                          key={`day-${dayNumber}`}
                          onClick={() => {
                            // Quick create template for selected date
                            setNewContentData((prev) => ({
                              ...prev,
                              publish_date: dateStr,
                              status: 'SCHEDULED',
                            }));
                            setIsNewContentModalOpen(true);
                          }}
                          className={`bg-card rounded-apple border border-border p-2 flex flex-col justify-between overflow-hidden cursor-pointer hover:border-apple-blue/50 hover:bg-apple-gray/25 dark:hover:bg-sf-bg-elevatedDark/10 transition-all ${
                            isToday ? 'ring-2 ring-apple-blue/40 border-apple-blue/60' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-apple-blue text-white' : 'text-foreground'}`}>
                              {dayNumber}
                            </span>
                            {dayItems.length > 0 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 scale-90">
                                {dayItems.length}
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1 overflow-y-auto max-h-[60px] no-scrollbar mt-1">
                            {dayItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedContent(item);
                                }}
                                className="px-1.5 py-0.5 rounded bg-apple-gray dark:bg-sf-bg-elevatedDark text-[10px] font-medium truncate flex items-center gap-1 hover:bg-apple-gray/80 border border-border/50 text-foreground"
                                title={item.title}
                              >
                                {TYPE_ICONS[item.type]}
                                <span className="truncate">{item.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        /* --- CONTENT IDEAS --- */
        <div className="space-y-6">
          {/* Ideas Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-4 rounded-apple">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold pr-2 border-r border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                Logged Concepts
              </h3>
              {selectedIdeaIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchValidate}
                  disabled={isBatchValidating}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 border-0 hover:from-violet-500 hover:to-indigo-500 text-white"
                >
                  <Sparkles size={12} />
                  {isBatchValidating ? 'Validating...' : `Batch Validate Selected (${selectedIdeaIds.length})`}
                </Button>
              )}
            </div>

            <Button onClick={() => setIsNewIdeaModalOpen(true)} className="flex items-center gap-1.5">
              <Plus size={14} />
              Log New Idea
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-40 w-full rounded-apple" />
              <Skeleton className="h-40 w-full rounded-apple" />
              <Skeleton className="h-40 w-full rounded-apple" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.length === 0 ? (
                <div className="col-span-full py-16 text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark bg-card border border-border rounded-apple">
                  No ideas logged yet. Click &quot;Log New Idea&quot; to start validating content with AI.
                </div>
              ) : (
                ideas.map((idea) => {
                  const isSelected = selectedIdeaIds.includes(idea.id);
                  const validationScore = idea.validations?.[0]?.overall_score;

                  return (
                    <motion.div
                      key={idea.id}
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={`relative bg-card border rounded-apple p-5 flex flex-col justify-between h-[180px] shadow-sm hover:shadow-md transition-all ${
                        isSelected ? 'border-apple-blue ring-1 ring-apple-blue/30 bg-apple-gray/10' : 'border-border'
                      }`}
                    >
                      {/* Select Checkbox */}
                      <button
                        onClick={() => handleSelectIdea(idea.id)}
                        className={`absolute top-4 right-4 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-apple-blue border-apple-blue text-white' : 'border-border'
                        }`}
                      >
                        {isSelected && <span className="text-[9px] font-bold">✓</span>}
                      </button>

                      <Link href={`/content/ideas/${idea.id}`} className="block h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2 pr-6">
                            {TYPE_ICONS[idea.content_type]}
                            <Badge className={IDEA_STATUS_CONFIG[idea.status]?.bg + ' ' + IDEA_STATUS_CONFIG[idea.status]?.text}>
                              {IDEA_STATUS_CONFIG[idea.status]?.label}
                            </Badge>
                          </div>

                          <h4 className="font-semibold text-base text-foreground line-clamp-2 pr-6" title={idea.title}>
                            {idea.title}
                          </h4>
                          <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-2 mt-1">
                            {idea.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/60 pt-3 mt-3">
                          <span className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            {new Date(idea.created_at).toLocaleDateString()}
                          </span>

                          {validationScore !== undefined ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                              <Sparkles size={12} />
                              AI Score: {Math.round(validationScore * 100)}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium hover:text-apple-blue flex items-center gap-1">
                              View Concept →
                            </span>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Right Column: AI Discuss/Brainstorm Sidebar */}
      <div className="w-full lg:w-[400px] shrink-0 h-[600px] lg:h-[calc(100vh-140px)] sticky top-[90px] hidden lg:block">
        <AIChatPanel
          contextType="CONTENT"
          contextId={null}
          onLogged={() => {
            showToast('Content item logged successfully!');
            fetchData();
          }}
          embedded={true}
        />
      </div>

      {/* --- CONTENT DETAILS MODAL (TIPTAP EDITOR) --- */}
      <AnimatePresence>
        {selectedContent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-6xl max-h-[90vh] rounded-apple shadow-2xl flex flex-col overflow-hidden text-foreground"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-sm">
                    {TYPE_ICONS[selectedContent.type]}
                    {selectedContent.type.replace('_', ' ')}
                  </span>
                  <Badge className={STATUS_CONFIG[selectedContent.status]?.bg + ' ' + STATUS_CONFIG[selectedContent.status]?.text}>
                    {STATUS_CONFIG[selectedContent.status]?.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDeleteContent(selectedContent.id)}
                    className="text-red-400 hover:text-red-500"
                    title="Delete Content"
                  >
                    <Trash2 size={16} />
                  </Button>
                  <button onClick={() => setSelectedContent(null)} className="p-1 text-sf-text-secondaryLight hover:text-foreground">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Split Workspace */}
              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
                {/* Left side: Metadata and RichTextEditor */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-border h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block mb-1">
                        Title
                      </label>
                      <Input
                        value={selectedContent.title}
                        onChange={(e) => setSelectedContent({ ...selectedContent, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block mb-1">
                        Product
                      </label>
                      <select
                        value={selectedContent.product_id || ''}
                        onChange={(e) => setSelectedContent({ ...selectedContent, product_id: e.target.value || null })}
                        className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue text-foreground"
                      >
                        <option value="">No Product Link</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Platforms selection */}
                  <div>
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block mb-2">
                      Target Platforms
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((platform) => {
                        const isSelected = selectedContent.platforms?.includes(platform);
                        return (
                          <button
                            key={platform}
                            type="button"
                            onClick={() => togglePlatformInEdit(platform)}
                            className={`px-3 py-1 rounded-full text-xs border font-medium transition-colors ${
                              isSelected
                                ? 'bg-apple-blue border-apple-blue text-white'
                                : 'bg-apple-gray dark:bg-sf-bg-elevatedDark border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
                            }`}
                          >
                            {platform}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tiptap rich text body */}
                  <div>
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block mb-2">
                      Content Draft Body
                    </label>
                    <RichTextEditor
                      content={selectedContent.body || ''}
                      onChange={(bodyText) => setSelectedContent({ ...selectedContent, body: bodyText })}
                    />
                  </div>

                  {/* Scheduling tools */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                    <div>
                      <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block mb-1">
                        Publish Date
                      </label>
                      <input
                        type="date"
                        value={selectedContent.publish_date ? selectedContent.publish_date.split('T')[0] : ''}
                        onChange={(e) => setSelectedContent({ ...selectedContent, publish_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue text-foreground"
                      />
                    </div>

                    <div className="flex items-end justify-end gap-3">
                      <Button variant="secondary" onClick={() => setSelectedContent(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleScheduleContent}
                        className="bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
                      >
                        Schedule Publish
                      </Button>
                      <Button onClick={handleUpdateContentDetail}>
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right side: AI Content Brainstorm Panel */}
                <div className="w-full lg:w-[380px] shrink-0 h-full flex flex-col border-t lg:border-t-0 border-border">
                  <AIChatPanel
                    contextType="CONTENT"
                    contextId={selectedContent.id}
                    onInsertBody={(insertedText) => {
                      setSelectedContent((prev) =>
                        prev
                          ? {
                              ...prev,
                              body: prev.body ? prev.body + '\n' + insertedText : insertedText,
                            }
                          : null
                      );
                      showToast('Inserted script draft into editor!');
                    }}
                    embedded={true}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NEW CONTENT MODAL --- */}
      <AnimatePresence>
        {isNewContentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-apple shadow-2xl overflow-hidden text-foreground"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10">
                <span className="font-semibold text-base">New Content Planner</span>
                <button onClick={() => setIsNewContentModalOpen(false)} className="p-1 text-sf-text-secondaryLight hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateContent} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Title</label>
                  <Input
                    required
                    value={newContentData.title}
                    onChange={(e) => setNewContentData({ ...newContentData, title: e.target.value })}
                    placeholder="E.g., 5 SaaS Trends to Watch in 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Content Type</label>
                    <select
                      value={newContentData.type}
                      onChange={(e) => setNewContentData({ ...newContentData, type: e.target.value })}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue"
                    >
                      <option value="BLOG_POST">Blog Post</option>
                      <option value="SOCIAL_MEDIA">Social Media</option>
                      <option value="VIDEO">Video</option>
                      <option value="NEWSLETTER">Newsletter</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Product Link</label>
                    <select
                      value={newContentData.product_id}
                      onChange={(e) => setNewContentData({ ...newContentData, product_id: e.target.value })}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue"
                    >
                      <option value="">No Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-2">Publish Channels</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => {
                      const isSelected = newContentData.platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatformInForm(platform)}
                          className={`px-3 py-1 rounded-full text-xs border font-medium transition-colors ${
                            isSelected
                              ? 'bg-apple-blue border-apple-blue text-white'
                              : 'bg-apple-gray dark:bg-sf-bg-elevatedDark border-border text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'
                          }`}
                        >
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Publish Date</label>
                    <input
                      type="date"
                      value={newContentData.publish_date}
                      onChange={(e) => setNewContentData({ ...newContentData, publish_date: e.target.value })}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Initial Status</label>
                    <select
                      value={newContentData.status}
                      onChange={(e) => setNewContentData({ ...newContentData, status: e.target.value })}
                      className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue"
                    >
                      <option value="IDEA">Idea Concept</option>
                      <option value="DRAFT">Drafting</option>
                      <option value="IN_REVIEW">Ready for Review</option>
                      <option value="SCHEDULED">Scheduled</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border pt-4 mt-6">
                  <Button type="button" variant="secondary" onClick={() => setIsNewContentModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Item
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NEW IDEA MODAL --- */}
      <AnimatePresence>
        {isNewIdeaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-lg rounded-apple shadow-2xl overflow-hidden text-foreground"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10">
                <span className="font-semibold text-base">Log New Content Concept</span>
                <button onClick={() => setIsNewIdeaModalOpen(false)} className="p-1 text-sf-text-secondaryLight hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateIdea} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Concept Title</label>
                  <Input
                    required
                    value={newIdeaData.title}
                    onChange={(e) => setNewIdeaData({ ...newIdeaData, title: e.target.value })}
                    placeholder="E.g., Why we migrated our auth to JWT"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Target Audience</label>
                  <Input
                    value={newIdeaData.target_audience}
                    onChange={(e) => setNewIdeaData({ ...newIdeaData, target_audience: e.target.value })}
                    placeholder="E.g., Junior software developers, CTOs, B2B founders"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Description / Notes</label>
                  <textarea
                    value={newIdeaData.description}
                    onChange={(e) => setNewIdeaData({ ...newIdeaData, description: e.target.value })}
                    placeholder="Describe what this piece should cover and the main angle..."
                    className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue min-h-[80px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider block mb-1">Intended Format</label>
                  <select
                    value={newIdeaData.content_type}
                    onChange={(e) => setNewIdeaData({ ...newIdeaData, content_type: e.target.value as 'BLOG_POST' | 'SOCIAL_MEDIA' | 'VIDEO' | 'NEWSLETTER' | 'OTHER' })}
                    className="w-full bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple px-3 py-2 text-sm outline-none focus:border-apple-blue"
                  >
                    <option value="BLOG_POST">Blog Post</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="VIDEO">Video</option>
                    <option value="NEWSLETTER">Newsletter</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border pt-4 mt-6">
                  <Button type="button" variant="secondary" onClick={() => setIsNewIdeaModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Log Concept
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
