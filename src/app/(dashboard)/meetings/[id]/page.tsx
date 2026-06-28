'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

import { useRealtime } from '@/contexts/RealtimeContext';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import RichTextEditor from '@/components/ui/RichTextEditor';
import {
  Calendar,
  Clock,
  Video,
  ArrowLeft,
  Play,
  Check,
  CheckCircle,
  FileText,
  MessageSquare,
  Plus,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface MeetingAttendee {
  user: UserDetail;
}

interface MeetingTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee?: UserDetail | null;
}

interface MeetingDetails {
  id: string;
  title: string;
  description?: string | null;
  agenda?: string | null;
  scheduled_at: string;
  duration: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  google_meet_link?: string | null;
  fathom_link?: string | null;
  fathom_summary?: string | null;
  fathom_transcript?: string | null;
  fathom_imported_at?: string | null;
  notes?: string | null;
  creator: UserDetail;
  attendees: MeetingAttendee[];
  tasks: MeetingTask[];
}

export default function MeetingDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();

  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [notesContent, setNotesContent] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Fathom link input state
  const [fathomLinkInput, setFathomLinkInput] = useState('');
  const [savingFathomLink, setSavingFathomLink] = useState(false);
  const [fathomLinkError, setFathomLinkError] = useState<string | null>(null);

  // Fathom import modal state
  const [isFathomModalOpen, setIsFathomModalOpen] = useState(false);
  const [fathomSummary, setFathomSummary] = useState('');
  const [fathomTranscript, setFathomTranscript] = useState('');
  const [importingFathom, setImportingFathom] = useState(false);

  // Fathom Accordion view states
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Create task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assigneeId: '',
    due_date: '',
  });

  // Delete meeting state
  const [deleting, setDeleting] = useState(false);

  const handleDeleteMeeting = async () => {
    if (!confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) return;
    try {
      setDeleting(true);
      const res = await authFetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete meeting.');
      }
      router.push('/meetings');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete meeting.';
      alert(msg);
      setDeleting(false);
    }
  };

  const fetchMeetingDetails = useCallback(async () => {
    try {
      const res = await authFetch(`/api/meetings/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Meeting not found.');
        throw new Error('Failed to retrieve meeting details.');
      }
      const data = await res.json();
      setMeeting(data);
      setNotesContent(data.notes || '');
      setFathomLinkInput(data.fathom_link || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

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
    fetchMeetingDetails();
    fetchUsers();
  }, [fetchMeetingDetails, fetchUsers]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleMeetingUpdate = (data: { meetingId: string }) => {
      if (data.meetingId === id) {
        fetchMeetingDetails();
      }
    };

    const handleTasksUpdate = (data: { meetingId: string }) => {
      if (data.meetingId === id) {
        fetchMeetingDetails();
      }
    };

    socket.on('meetings:update', handleMeetingUpdate);
    socket.on('tasks:update', handleTasksUpdate);

    return () => {
      socket.off('meetings:update', handleMeetingUpdate);
      socket.off('tasks:update', handleTasksUpdate);
    };
  }, [socket, id, fetchMeetingDetails]);

  const handleStartMeeting = async () => {
    if (!meeting) return;
    try {
      // Open Meet in new tab
      if (meeting.google_meet_link) {
        window.open(meeting.google_meet_link, '_blank');
      }

      const res = await authFetch(`/api/meetings/${id}/start`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start meeting.');
      fetchMeetingDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start meeting.';
      alert(msg);
    }
  };

  const handleEndMeeting = async () => {
    try {
      const res = await authFetch(`/api/meetings/${id}/end`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to end meeting.');
      fetchMeetingDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to end meeting.';
      alert(msg);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      const res = await authFetch(`/api/meetings/${id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesContent }),
      });
      if (!res.ok) throw new Error('Failed to save notes.');
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save notes.';
      alert(msg);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveFathomLink = async () => {
    try {
      setSavingFathomLink(true);
      setFathomLinkError(null);
      const res = await authFetch(`/api/meetings/${id}/fathom-link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fathom_link: fathomLinkInput }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save Fathom link.');
      }
      fetchMeetingDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save Fathom link.';
      setFathomLinkError(msg);
    } finally {
      setSavingFathomLink(false);
    }
  };

  const handleImportFathomData = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportingFathom(true);
      const res = await authFetch(`/api/meetings/${id}/fathom-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: fathomSummary,
          transcript: fathomTranscript,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to import Fathom data.');
      }

      setIsFathomModalOpen(false);
      setFathomSummary('');
      setFathomTranscript('');
      fetchMeetingDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import Fathom data.';
      alert(msg);
    } finally {
      setImportingFathom(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingTask(true);
      const res = await authFetch(`/api/meetings/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create task.');
      }

      setIsTaskModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assigneeId: '',
        due_date: '',
      });
      fetchMeetingDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task.';
      alert(msg);
    } finally {
      setSubmittingTask(false);
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'IN_PROGRESS':
        return 'bg-apple-blue/10 text-apple-blue border-apple-blue/20';
      case 'IN_REVIEW':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20';
    }
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-apple-red/10 text-apple-red border-apple-red/20';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-xl font-semibold text-apple-red">Error Loading Meeting</h1>
        <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{error || 'Meeting not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/meetings')}>
          <ArrowLeft size={16} className="mr-2" /> Back to Meetings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <button
        onClick={() => router.push('/meetings')}
        className="flex items-center gap-1.5 text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground transition-all"
      >
        <ArrowLeft size={14} /> Back to Meetings
      </button>

      {/* Header Info */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{meeting.title}</h1>
                <Badge
                  variant="default"
                  className={
                    meeting.status === 'IN_PROGRESS'
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse'
                      : meeting.status === 'COMPLETED'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : 'bg-apple-blue/10 text-apple-blue border-apple-blue/20'
                  }
                >
                  {meeting.status.charAt(0) + meeting.status.slice(1).toLowerCase().replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {format(new Date(meeting.scheduled_at), 'PPP p')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  Duration: {meeting.duration} mins
                </span>
              </div>

              {meeting.description && (
                <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark max-w-3xl">
                  {meeting.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {meeting.status === 'SCHEDULED' && (
                <Button
                  onClick={handleStartMeeting}
                  className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm flex items-center gap-2"
                >
                  <Play size={16} /> Start Meeting
                </Button>
              )}

              {meeting.status === 'IN_PROGRESS' && (
                <>
                  {meeting.google_meet_link && (
                    <a
                      href={meeting.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-apple text-sm font-semibold bg-apple-blue/10 hover:bg-apple-blue/20 text-apple-blue transition-all"
                    >
                      <Video size={16} /> Join Meet Link
                    </a>
                  )}
                  <Button
                    onClick={handleEndMeeting}
                    className="bg-green-600 hover:bg-green-600/90 text-white shadow-apple-sm flex items-center gap-2"
                  >
                    <Check size={16} /> End Meeting
                  </Button>
                </>
              )}

              {meeting.status === 'COMPLETED' && (
                <div className="flex items-center gap-1.5 text-xs text-green-500 font-semibold bg-green-500/10 px-3 py-1.5 rounded-apple border border-green-500/20">
                  <CheckCircle size={14} /> Complete
                </div>
              )}

              <Button
                onClick={handleDeleteMeeting}
                disabled={deleting}
                variant="outline"
                className="flex items-center gap-2 text-apple-red border-apple-red/20 hover:bg-apple-red/10 hover:border-apple-red/40"
              >
                <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Meeting'}
              </Button>
            </div>
          </div>

          {/* Stepper Tracker */}
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-border">
            <span className="text-[10px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
              Timeline:
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${meeting.status === 'SCHEDULED' ? 'bg-apple-blue text-white border-apple-blue' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-secondaryLight border-border'}`}>
                1. Scheduled
              </span>
              <span className="text-sf-text-secondaryLight/40">→</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${meeting.status === 'IN_PROGRESS' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-secondaryLight border-border'}`}>
                2. In Progress
              </span>
              <span className="text-sf-text-secondaryLight/40">→</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${meeting.status === 'COMPLETED' ? 'bg-green-500 text-white border-green-500' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark text-sf-text-secondaryLight border-border'}`}>
                3. Completed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Notes & Fathom */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rich Text Notes */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-base font-semibold flex items-center gap-2">
                <FileText size={16} /> Meeting Notes
              </span>
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm text-xs"
              >
                {savingNotes ? 'Saving...' : notesSaved ? 'Saved!' : 'Save Notes'}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <RichTextEditor content={notesContent} onChange={setNotesContent} />
            </CardContent>
          </Card>

          {/* Fathom Section */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-base font-semibold flex items-center gap-2">
                <MessageSquare size={16} /> Fathom AI Integration
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Input
                    placeholder="https://fathom.video/share/..."
                    value={fathomLinkInput}
                    onChange={(e) => setFathomLinkInput(e.target.value)}
                    className="text-xs h-8 pr-12"
                  />
                  <button
                    onClick={handleSaveFathomLink}
                    disabled={savingFathomLink || !fathomLinkInput}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-apple-blue disabled:opacity-50 hover:underline"
                  >
                    {savingFathomLink ? '...' : 'Save'}
                  </button>
                </div>
                {meeting.fathom_link && (
                  <Button
                    size="sm"
                    onClick={() => setIsFathomModalOpen(true)}
                    className="bg-apple-blue text-white shadow-apple-sm text-xs h-8"
                  >
                    Import Data
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {fathomLinkError && (
                <p className="text-xs font-semibold text-apple-red bg-apple-red/5 p-2 rounded-apple border border-apple-red/10">
                  {fathomLinkError}
                </p>
              )}

              {!meeting.fathom_link && (
                <div className="text-center py-6 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  <p className="text-xs">No Fathom link attached yet.</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Attach a fathom.video share link above to enable import.</p>
                </div>
              )}

              {meeting.fathom_link && !meeting.fathom_imported_at && (
                <div className="text-center py-6 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  <p className="text-xs font-semibold">Fathom link linked successfully!</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Click &quot;Import Data&quot; to paste summary and transcript details.</p>
                </div>
              )}

              {/* Fathom Data Accordions */}
              {meeting.fathom_imported_at && (
                <div className="space-y-3">
                  {/* AI Summary Accordion */}
                  <div className="border border-border rounded-apple overflow-hidden">
                    <button
                      onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                      className="w-full flex items-center justify-between p-3.5 bg-apple-gray dark:bg-sf-bg-elevatedDark text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5 text-foreground">
                        <FileText size={14} className="text-apple-blue" />
                        Fathom AI Summary
                      </span>
                      {isSummaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isSummaryOpen && (
                      <div className="p-4 bg-card text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark whitespace-pre-wrap leading-relaxed border-t border-border prose dark:prose-invert max-w-none">
                        {meeting.fathom_summary}
                      </div>
                    )}
                  </div>

                  {/* Transcript Accordion */}
                  <div className="border border-border rounded-apple overflow-hidden">
                    <button
                      onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                      className="w-full flex items-center justify-between p-3.5 bg-apple-gray dark:bg-sf-bg-elevatedDark text-xs font-semibold"
                    >
                      <span className="flex items-center gap-1.5 text-foreground">
                        <MessageSquare size={14} className="text-purple-500" />
                        Meeting Transcript
                      </span>
                      {isTranscriptOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {isTranscriptOpen && (
                      <div className="p-4 bg-card text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark whitespace-pre-wrap leading-relaxed border-t border-border max-h-[300px] overflow-y-auto no-scrollbar font-mono">
                        {meeting.fathom_transcript}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Attendees & Tasks */}
        <div className="space-y-6">
          {/* Attendees */}
          <Card>
            <CardHeader>
              <span className="text-base font-semibold flex items-center gap-2">
                <Users size={16} /> Attendees
              </span>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {meeting.attendees.map((att) => (
                  <div key={att.user.id} className="flex items-center gap-3">
                    <Avatar name={att.user.name} src={att.user.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground leading-none">{att.user.name}</p>
                      <p className="text-[10px] text-sf-text-secondaryLight truncate mt-0.5">{att.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Linked Tasks Outcomes */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-base font-semibold flex items-center gap-2">
                <CheckCircle size={16} /> Outcome Tasks
              </span>
              <Button
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm text-xs p-1 px-2.5 h-8 flex items-center gap-1"
              >
                <Plus size={12} /> Add Task
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {meeting.tasks.length === 0 ? (
                <div className="text-center py-6 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                  <p className="text-xs font-medium">No tasks generated yet</p>
                  <p className="text-[10px] opacity-75 mt-0.5">Generate checklist outcomes from this meeting.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meeting.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border border-border bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 rounded-apple space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{task.title}</p>
                        <Badge className={`text-[9px] px-1.5 py-0.5 leading-none shrink-0 ${getTaskStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                        <Badge className={`text-[9px] px-1.5 py-0.5 leading-none ${getTaskPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>

                        {task.assignee ? (
                          <div className="flex items-center gap-1" title={`Assigned to ${task.assignee.name}`}>
                            <Avatar name={task.assignee.name} src={task.assignee.avatar_url} size="sm" />
                            <span className="truncate max-w-[80px] font-medium">{task.assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] opacity-70">Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fathom Data Import Modal */}
      <AnimatePresence>
        {isFathomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-apple w-full max-w-xl overflow-hidden shadow-apple-lg flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Import Fathom Data</h2>
                <button
                  onClick={() => setIsFathomModalOpen(false)}
                  className="p-1 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleImportFathomData} className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Fathom AI Summary
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue placeholder:text-neutral-400 font-sans"
                    placeholder="Paste the bullet points or summary text here..."
                    value={fathomSummary}
                    onChange={(e) => setFathomSummary(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Full Meeting Transcript
                  </label>
                  <textarea
                    required
                    rows={6}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue placeholder:text-neutral-400 font-mono"
                    placeholder="Paste the conversation transcript here..."
                    value={fathomTranscript}
                    onChange={(e) => setFathomTranscript(e.target.value)}
                  />
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFathomModalOpen(false)}
                    disabled={importingFathom}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm"
                    disabled={importingFathom}
                  >
                    {importingFathom ? 'Importing...' : 'Save & Import'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Outcome Task Add Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-apple w-full max-w-md overflow-hidden shadow-apple-lg flex flex-col"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Add Outcome Task</h2>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  className="p-1 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Task Title
                  </label>
                  <Input
                    required
                    placeholder="Task details..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue placeholder:text-neutral-400"
                    placeholder="Describe task parameters..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Assignee
                    </label>
                    <select
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                      value={newTask.assigneeId}
                      onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                    >
                      <option value="">Select assignee...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Priority
                    </label>
                    <select
                      className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTaskModalOpen(false)}
                    disabled={submittingTask}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-apple-blue hover:bg-apple-blue/90 text-white shadow-apple-sm"
                    disabled={submittingTask}
                  >
                    {submittingTask ? 'Creating...' : 'Create Task'}
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


