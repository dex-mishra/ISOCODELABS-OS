'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Video, Plus, Calendar, Clock, Users, ArrowRight, VideoOff, RefreshCw, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingAttendee {
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  agenda?: string | null;
  scheduled_at: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  google_meet_link?: string | null;
  creator: {
    id: string;
    name: string;
  };
  attendees: MeetingAttendee[];
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

export default function MeetingsPage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    agenda: '',
    scheduled_at: '',
    duration: '30',
    attendeeIds: [] as string[],
  });

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/meetings';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;

      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error('Failed to retrieve meetings.');
      }
      const data = await res.json();
      setMeetings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [authFetch, statusFilter, searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, [fetchMeetings, fetchUsers]);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchMeetings();
    };

    socket.on('meetings:update', handleUpdate);

    return () => {
      socket.off('meetings:update', handleUpdate);
    };
  }, [socket, fetchMeetings]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await authFetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMeeting,
          scheduled_at: new Date(newMeeting.scheduled_at).toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create meeting.');
      }

      setIsModalOpen(false);
      setNewMeeting({
        title: '',
        description: '',
        agenda: '',
        scheduled_at: '',
        duration: '30',
        attendeeIds: [],
      });
      fetchMeetings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create meeting.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      setDeletingId(meetingId);
      const res = await authFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete meeting.');
      }
      fetchMeetings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete meeting.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleAttendee = (userId: string) => {
    setNewMeeting((prev) => {
      const alreadySelected = prev.attendeeIds.includes(userId);
      if (alreadySelected) {
        return { ...prev, attendeeIds: prev.attendeeIds.filter((id) => id !== userId) };
      } else {
        return { ...prev, attendeeIds: [...prev.attendeeIds, userId] };
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="default" className="bg-apple-blue/10 text-apple-blue border-apple-blue/20">Scheduled</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-apple-red/10 text-apple-red border-apple-red/20">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Manage your schedule, Google Meet integrations, and Fathom AI summaries.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 self-start md:self-auto bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm">
          <Plus size={16} />
          Schedule Meeting
        </Button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-4 rounded-apple border border-border">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
            onKeyDown={(e) => e.key === 'Enter' && fetchMeetings()}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); fetchMeetings(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-sf-text-secondaryLight hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar py-1">
          {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-apple text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab
                  ? 'bg-apple-blue text-white shadow-apple-sm'
                  : 'text-sf-text-secondaryLight hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>

        <Button variant="secondary" onClick={fetchMeetings} className="p-2 sm:ml-auto aspect-square" title="Refresh List">
          <RefreshCw size={14} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-apple-red/20 bg-apple-red/5">
          <CardContent className="p-6 text-center">
            <p className="text-sm font-semibold text-apple-red">Failed to load meetings</p>
            <p className="text-xs text-apple-red/70 mt-1">{error}</p>
            <Button variant="outline" className="mt-4 border-apple-red/20 text-apple-red hover:bg-apple-red/10" onClick={fetchMeetings}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && meetings.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center justify-center">
            <div className="p-4 bg-apple-gray dark:bg-sf-bg-elevatedDark rounded-full text-sf-text-secondaryLight">
              <VideoOff size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground mt-4">No meetings found</p>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
              Try adjusting your filter or create a new scheduled meeting.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      {!loading && !error && meetings.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {meetings.map((meeting) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group"
            >
              <Card className="hover:border-apple-blue/30 hover:shadow-apple-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-apple-blue transition-colors">
                          {meeting.title}
                        </h3>
                        {getStatusBadge(meeting.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {format(new Date(meeting.scheduled_at), 'PPP p')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {meeting.duration} mins
                        </span>
                        {meeting.attendees.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Users size={14} />
                            {meeting.attendees.length} Attendees
                          </span>
                        )}
                      </div>

                      {meeting.description && (
                        <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-2 max-w-2xl">
                          {meeting.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
                      {meeting.google_meet_link && (
                        <a
                          href={meeting.google_meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-apple text-xs font-semibold bg-apple-blue/10 hover:bg-apple-blue/20 text-apple-blue transition-all"
                        >
                          <Video size={14} />
                          Join Meet
                        </a>
                      )}
                      <Button
                        onClick={() => router.push(`/meetings/${meeting.id}`)}
                        variant="outline"
                        className="flex items-center gap-1.5 text-xs py-1.5 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark"
                      >
                        Details
                        <ArrowRight size={14} />
                      </Button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting.id); }}
                        disabled={deletingId === meeting.id}
                        className="p-1.5 rounded-apple text-sf-text-secondaryLight hover:text-apple-red hover:bg-apple-red/10 transition-all disabled:opacity-50"
                        title="Delete Meeting"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Attendees avatar strip */}
                  {meeting.attendees.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-4 border-t border-border pt-4">
                      <div className="flex -space-x-1.5">
                        {meeting.attendees.map((att) => (
                          <div key={att.user.id} title={att.user.name}>
                            <Avatar
                              name={att.user.name}
                              src={att.user.avatar_url}
                              size="sm"
                              className="border-2 border-card"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        Attendees: {meeting.attendees.map((att) => att.user.name).join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-apple w-full max-w-lg overflow-hidden shadow-apple-lg flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Schedule Meeting</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateMeeting} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Meeting Title
                  </label>
                  <Input
                    required
                    placeholder="E.g., Weekly Sync"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue placeholder:text-neutral-400"
                    placeholder="Short description of the meeting..."
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Agenda (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue placeholder:text-neutral-400"
                    placeholder="Outline the meeting agenda points..."
                    value={newMeeting.agenda}
                    onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                      value={newMeeting.scheduled_at}
                      onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_at: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Duration (Minutes)
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                      value={newMeeting.duration}
                      onChange={(e) => setNewMeeting({ ...newMeeting, duration: e.target.value })}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Select Attendees
                  </label>
                  <div className="grid grid-cols-2 gap-2 border border-border p-3 rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10">
                    {users.map((user) => {
                      const isSelected = newMeeting.attendeeIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleAttendee(user.id)}
                          className={`flex items-center gap-2.5 p-2 rounded-apple border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-apple-blue/50 bg-apple-blue/5 text-foreground'
                              : 'border-border bg-card text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark'
                          }`}
                        >
                          <Avatar name={user.name} src={user.avatar_url} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-none mb-0.5">{user.name}</p>
                            <p className="text-[10px] truncate opacity-70 leading-none">{user.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-border flex justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Schedule'}
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
