'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import {
  List,
  Kanban,
  Plus,
  Search,
  Calendar,
  Folder,
  Link as LinkIcon,
  CheckSquare,
  AlertCircle,
  X,
  Trash2,
  ArrowUpDown,
  ArrowUpRight,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Assignee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Meeting {
  id: string;
  title: string;
}

interface SubTask {
  id?: string;
  title: string;
  is_completed: boolean;
  assignee_id?: string | null;
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  due_date: string | null;
  assignee_id?: string | null;
  assignee?: Assignee | null;
  project_id?: string | null;
  project?: Project | null;
  meeting_id?: string | null;
  meeting?: Meeting | null;
  tags: string[];
  sub_tasks: SubTask[];
  created_at: string;
}

interface TaskStats {
  counts: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  overdueCount: number;
  assigneeBreakdown: Array<{
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    counts: {
      total: number;
      TODO: number;
      IN_PROGRESS: number;
      IN_REVIEW: number;
      DONE: number;
    };
  }>;
}

const COLUMNS: Array<{ id: Task['status']; name: string; color: string }> = [
  { id: 'TODO', name: 'To Do', color: 'border-t-2 border-t-gray-500' },
  { id: 'IN_PROGRESS', name: 'In Progress', color: 'border-t-2 border-t-blue-500' },
  { id: 'IN_REVIEW', name: 'In Review', color: 'border-t-2 border-t-yellow-500' },
  { id: 'DONE', name: 'Completed', color: 'border-t-2 border-t-green-500' },
];

export default function TasksPage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  // Tasks and Lists Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [users, setUsers] = useState<Assignee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [ventures, setVentures] = useState<{ id: string; name: string }[]>([]);

  // Page Controls
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  // Sort states (for list view)
  const [sortField, setSortField] = useState<keyof Task>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail Slide-over Panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  // Completed tasks collapse state
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    status: 'TODO' as Task['status'],
    priority: 'MEDIUM' as Task['priority'],
    assignee_id: '',
    project_id: '',
    meeting_id: '',
    venture_id: '',
    due_date: '',
    tagsString: '',
  });

  // Fetch Tasks with filters applied
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (assigneeFilter !== 'ALL') params.append('assigneeId', assigneeFilter);
      if (projectFilter !== 'ALL') params.append('projectId', projectFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await authFetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [authFetch, priorityFilter, assigneeFilter, projectFilter, searchQuery]);

  // Fetch stats separately
  const fetchStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/tasks/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load task stats:', err);
    }
  }, [authFetch]);

  // Fetch options (users, projects, meetings, ventures)
  const fetchOptions = useCallback(async () => {
    try {
      const [uRes, pRes, mRes, vRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/projects'),
        authFetch('/api/meetings'),
        authFetch('/api/ventures'),
      ]);

      if (uRes.ok) setUsers(await uRes.json());
      if (pRes.ok) setProjects(await pRes.json());
      if (mRes.ok) setMeetings(await mRes.json());
      if (vRes.ok) setVentures(await vRes.json());
    } catch (err) {
      console.error('Failed to load form options:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchOptions();
  }, [fetchTasks, fetchStats, fetchOptions]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchTasks();
      fetchStats();
      // If a task is open in details, refresh it too
      if (selectedTask) {
        authFetch(`/api/tasks/${selectedTask.id}`)
          .then((res) => {
            if (res.ok) return res.json();
          })
          .then((data) => {
            if (data) setSelectedTask(data);
          })
          .catch(console.error);
      }
    };

    socket.on('tasks:update', handleUpdate);
    socket.on('projects:update', handleUpdate); // Refresh projects links if updated

    return () => {
      socket.off('tasks:update', handleUpdate);
      socket.off('projects:update', handleUpdate);
    };
  }, [socket, fetchTasks, fetchStats, selectedTask, authFetch]);

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent<HTMLElement>, id: string) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );

    try {
      const res = await authFetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error('Failed to update task status');
      }
      fetchStats();
    } catch (err) {
      console.error(err);
      fetchTasks(); // rollback
    }
  };

  // Reassignment helper
  const handleAssigneeChange = async (taskId: string, assigneeId: string) => {
    try {
      const res = await authFetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee_id: assigneeId || null }),
      });
      if (!res.ok) throw new Error('Failed to reassign task');
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Status toggle handler
  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const res = await authFetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Sort list view helper
  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  // Inline SubTask additions
  const handleAddSubTask = async () => {
    if (!selectedTask || !newSubTaskTitle.trim()) return;

    try {
      const res = await authFetch(`/api/tasks/${selectedTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubTaskTitle.trim() }),
      });

      if (res.ok) {
        setNewSubTaskTitle('');
        // Re-fetch the task to get updated subtasks
        const taskRes = await authFetch(`/api/tasks/${selectedTask.id}`);
        if (taskRes.ok) {
          const updated = await taskRes.json();
          setSelectedTask(updated);
          fetchTasks();
        }
      }
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  // SubTask checkbox toggle
  const handleToggleSubTask = async (subTaskId: string, isCompleted: boolean) => {
    if (!selectedTask) return;

    // Optimistic update
    setSelectedTask((prev) =>
      prev
        ? {
            ...prev,
            sub_tasks: prev.sub_tasks.map((st) =>
              st.id === subTaskId ? { ...st, is_completed: isCompleted } : st
            ),
          }
        : prev
    );

    try {
      await authFetch(`/api/tasks/${selectedTask.id}/subtasks/${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: isCompleted }),
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
    }
  };

  // SubTask delete
  const handleDeleteSubTask = async (subTaskId: string) => {
    if (!selectedTask) return;
    try {
      const res = await authFetch(`/api/tasks/${selectedTask.id}/subtasks/${subTaskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSelectedTask((prev) =>
          prev
            ? { ...prev, sub_tasks: prev.sub_tasks.filter((st) => st.id !== subTaskId) }
            : prev
        );
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  // Convert subtask to full task
  const handleConvertSubTask = async (subTaskId: string) => {
    if (!selectedTask) return;
    if (!confirm('Convert this sub-task to a full standalone task?')) return;
    try {
      const res = await authFetch(`/api/tasks/${selectedTask.id}/subtasks/${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      });
      if (res.ok) {
        // Re-fetch this task to update its subtask list
        const taskRes = await authFetch(`/api/tasks/${selectedTask.id}`);
        if (taskRes.ok) {
          const updated = await taskRes.json();
          setSelectedTask(updated);
        }
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to convert subtask:', err);
    }
  };

  // Task inline edit auto-save
  const handleInlineSave = async (updatedFields: Partial<Task>) => {
    if (!selectedTask) return;

    const merged = { ...selectedTask, ...updatedFields };

    try {
      const res = await authFetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: merged.title,
          description: merged.description,
          status: merged.status,
          priority: merged.priority,
          assignee_id: merged.assignee_id,
          project_id: merged.project_id,
          meeting_id: merged.meeting_id,
          due_date: merged.due_date,
          tags: merged.tags,
          subTasks: merged.sub_tasks,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTask(updated);
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  // Task deletion
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedTask(null);
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // New Task form submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const tags = newTaskData.tagsString
        ? newTaskData.tagsString.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTaskData,
          tags,
          assignee_id: newTaskData.assignee_id || null,
          project_id: newTaskData.project_id || null,
          meeting_id: newTaskData.meeting_id || null,
          venture_id: newTaskData.venture_id || null,
          due_date: newTaskData.due_date ? new Date(newTaskData.due_date).toISOString() : null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create task');

      setIsNewModalOpen(false);
      setNewTaskData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        assignee_id: '',
        project_id: '',
        meeting_id: '',
        venture_id: '',
        due_date: '',
        tagsString: '',
      });
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tasks Workspace</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Sprint management, kanban board, list view, and assignment flows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'kanban' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="Kanban Board"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="primary" onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-neutral-900/40 border-neutral-800 p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">To Do</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.counts.TODO}</div>
          </Card>
          <Card className="bg-neutral-900/40 border-neutral-800 p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">In Progress</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{stats.counts.IN_PROGRESS}</div>
          </Card>
          <Card className="bg-neutral-900/40 border-neutral-800 p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">In Review</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.counts.IN_REVIEW}</div>
          </Card>
          <Card className="bg-neutral-900/40 border-neutral-800 p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Completed</div>
            <div className="text-2xl font-bold text-green-400 mt-1">{stats.counts.DONE}</div>
          </Card>
          <Card className={`border-neutral-800 p-4 col-span-2 md:col-span-1 ${stats.overdueCount > 0 ? 'bg-red-950/20 border-red-900/50' : 'bg-neutral-900/40'}`}>
            <div className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-neutral-500">
              {stats.overdueCount > 0 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-400">Overdue</span>
                </>
              ) : (
                'Overdue'
              )}
            </div>
            <div className={`text-2xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-red-500' : 'text-white'}`}>
              {stats.overdueCount}
            </div>
          </Card>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search tasks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900/50 border-neutral-800 text-sm text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
          >
            <option value="ALL">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
          >
            <option value="ALL">All Projects</option>
            <option value="none">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Board / List Workspace */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-neutral-850 rounded-xl bg-neutral-900/20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Failed to load tasks</h3>
          <p className="text-sm text-neutral-400 mt-1 mb-4">{error}</p>
          <Button onClick={fetchTasks} variant="secondary">
            Retry
          </Button>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            // For DONE column: show only 5 most recent unless expanded
            const MAX_VISIBLE_COMPLETED = 5;
            const isDoneColumn = col.id === 'DONE';
            const sortedColumnTasks = isDoneColumn
              ? [...columnTasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              : columnTasks;
            const visibleTasks = isDoneColumn && !showAllCompleted && sortedColumnTasks.length > MAX_VISIBLE_COMPLETED
              ? sortedColumnTasks.slice(0, MAX_VISIBLE_COMPLETED)
              : sortedColumnTasks;
            const hiddenCount = isDoneColumn ? sortedColumnTasks.length - MAX_VISIBLE_COMPLETED : 0;

            return (
              <div
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-neutral-950/40 border border-neutral-900 rounded-xl p-4 min-h-[500px] flex flex-col gap-4 ${col.color}`}
                style={{ minWidth: '280px', width: '280px' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-300">{col.name}</span>
                  <Badge variant="secondary" className="bg-neutral-900 text-neutral-400">
                    {columnTasks.length}
                  </Badge>
                </div>

                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  {columnTasks.length === 0 ? (
                    <div className="flex-1 border-2 border-dashed border-neutral-900 rounded-xl flex items-center justify-center p-6 text-center">
                      <span className="text-xs text-neutral-600">Drag items here</span>
                    </div>
                  ) : (
                    <>
                    {visibleTasks.map((task) => {
                      const isTaskOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'DONE';
                      return (
                        <motion.div
                          key={task.id}
                          layoutId={`card-${task.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLElement>, task.id)}
                          onClick={() => setSelectedTask(task)}
                          className={`bg-neutral-900/80 border border-neutral-850 hover:border-neutral-700 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-colors space-y-3 relative overflow-hidden group ${
                            isTaskOverdue ? 'border-red-950 hover:border-red-900' : ''
                          }`}
                        >
                          {isTaskOverdue && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-bl-lg bg-red-500" />
                          )}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-white line-clamp-2 leading-relaxed">
                              {task.title}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                task.priority === 'URGENT'
                                  ? 'danger'
                                  : task.priority === 'HIGH'
                                  ? 'warning'
                                  : 'secondary'
                              }
                              className="text-[10px] py-0.5 px-2"
                            >
                              {task.priority}
                            </Badge>
                            {task.project && (
                              <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-purple-950/20 text-purple-400 border border-purple-900/30">
                                <Folder className="w-2.5 h-2.5 mr-1" />
                                {task.project.name}
                              </Badge>
                            )}
                            {task.meeting && (
                              <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-blue-950/20 text-blue-400 border border-blue-900/30">
                                <LinkIcon className="w-2.5 h-2.5 mr-1" />
                                Meet
                              </Badge>
                            )}
                          </div>

                          {/* Sub-task progress bar */}
                          {task.sub_tasks.length > 0 && (() => {
                            const done = task.sub_tasks.filter((st) => st.is_completed).length;
                            const total = task.sub_tasks.length;
                            const pct = Math.round((done / total) * 100);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                                  <span className="flex items-center gap-0.5">
                                    <CheckSquare className="w-3 h-3" />
                                    {done}/{total} subtasks
                                  </span>
                                  <span className={pct === 100 ? 'text-green-400' : ''}>{pct}%</span>
                                </div>
                                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct === 100 ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between border-t border-neutral-850/50 pt-3 text-[10px] text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                            </span>
                            <div className="flex items-center gap-2">
                              {task.sub_tasks.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <CheckSquare className="w-3 h-3 text-neutral-500" />
                                  {task.sub_tasks.filter((st) => st.is_completed).length}/{task.sub_tasks.length}
                                </span>
                              )}
                              <Avatar
                                src={task.assignee?.avatar_url || ''}
                                name={task.assignee?.name || 'Unassigned'}
                                size="sm"
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {/* Show more / Show less toggle for completed column */}
                    {isDoneColumn && hiddenCount > 0 && (
                      <button
                        onClick={() => setShowAllCompleted(!showAllCompleted)}
                        className="w-full py-2 px-3 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900/50 hover:bg-neutral-800/60 border border-neutral-800 rounded-lg transition-colors text-center"
                      >
                        {showAllCompleted ? 'Show less' : `Show ${hiddenCount} more completed tasks`}
                      </button>
                    )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* List View */
        <Card className="bg-neutral-900/30 border-neutral-800 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-xs text-neutral-500 font-semibold bg-neutral-950/50">
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('title')}>
                    Task <ArrowUpDown className="w-3 h-3 inline-block ml-1" />
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('status')}>
                    Status <ArrowUpDown className="w-3 h-3 inline-block ml-1" />
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('priority')}>
                    Priority <ArrowUpDown className="w-3 h-3 inline-block ml-1" />
                  </th>
                  <th className="p-4 cursor-pointer" onClick={() => handleSort('due_date')}>
                    Due Date <ArrowUpDown className="w-3 h-3 inline-block ml-1" />
                  </th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm text-neutral-300">
                {sortedTasks.map((task) => {
                  const isTaskOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'DONE';
                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`hover:bg-neutral-900/50 transition-colors cursor-pointer ${
                        isTaskOverdue ? 'bg-red-950/5' : ''
                      }`}
                    >
                      <td className="p-4 font-medium text-white">
                        <div className="flex flex-col gap-0.5 max-w-[250px] min-w-0">
                          <span className="truncate block" title={task.title}>{task.title}</span>
                          {task.project && (
                            <span className="text-[10px] text-purple-400 font-normal truncate block" title={task.project.name}>Project: {task.project.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            task.status === 'DONE'
                              ? 'success'
                              : task.status === 'IN_PROGRESS'
                              ? 'default'
                              : task.status === 'IN_REVIEW'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            task.priority === 'URGENT'
                              ? 'danger'
                              : task.priority === 'HIGH'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className={`p-4 ${isTaskOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <Avatar
                          src={task.assignee?.avatar_url || ''}
                          name={task.assignee?.name || 'Unassigned'}
                          size="sm"
                        />
                        <span>{task.assignee?.name || 'Unassigned'}</span>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-neutral-500 hover:text-red-400 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Task Detail Slide-over Sidebar Panel */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-neutral-900 border-l border-neutral-800 p-6 overflow-y-auto z-50 shadow-2xl flex flex-col gap-6"
            >
              {/* Slide-over Header */}
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold tracking-wider">
                    Task Workspace
                  </span>
                  <input
                    value={selectedTask.title}
                    onChange={(e) => handleInlineSave({ title: e.target.value })}
                    className="text-xl font-bold bg-transparent text-white border-0 outline-none w-full mt-1 focus:ring-1 focus:ring-neutral-700 rounded p-1"
                  />
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase">Description</label>
                  <textarea
                    rows={4}
                    value={selectedTask.description || ''}
                    onChange={(e) => handleInlineSave({ description: e.target.value })}
                    placeholder="Enter description here..."
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 mt-1.5 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status selection */}
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase">Status</label>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleStatusChange(selectedTask.id, e.target.value as Task['status'])}
                      className="w-full bg-neutral-950 border border-neutral-850 text-sm text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700 mt-1.5"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>

                  {/* Priority selection */}
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase">Priority</label>
                    <select
                      value={selectedTask.priority}
                      onChange={(e) => handleInlineSave({ priority: e.target.value as Task['priority'] })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-sm text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700 mt-1.5"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Assignee selection */}
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase">Assignee</label>
                    <select
                      value={selectedTask.assignee_id || ''}
                      onChange={(e) => handleAssigneeChange(selectedTask.id, e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-850 text-sm text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700 mt-1.5"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date selection */}
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase">Due Date</label>
                    <input
                      type="date"
                      value={selectedTask.due_date ? selectedTask.due_date.substring(0, 10) : ''}
                      onChange={(e) =>
                        handleInlineSave({
                          due_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                      className="w-full bg-neutral-950 border border-neutral-850 text-sm text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700 mt-1.5"
                    />
                  </div>
                </div>

                {/* Linked Project / Meeting Indicators */}
                <div className="grid grid-cols-2 gap-4 bg-neutral-950/50 p-4 border border-neutral-850 rounded-xl">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Linked Project</span>
                    <div className="text-sm font-medium text-white mt-1 flex items-center gap-1.5">
                      <Folder className="w-4 h-4 text-purple-400" />
                      {selectedTask.project?.name || 'None'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">Linked Meeting</span>
                    <div className="text-sm font-medium text-white mt-1 flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-blue-400" />
                      {selectedTask.meeting?.title || 'None'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Tasks Checklist Section */}
              <div className="border-t border-neutral-850 pt-4 flex-1 flex flex-col gap-3">
                <label className="text-[11px] text-neutral-500 font-semibold uppercase">Sub-Tasks Checklist</label>

                {/* Checklist list */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {(selectedTask.sub_tasks || []).length === 0 ? (
                    <p className="text-xs text-neutral-600 italic">No checklist items yet.</p>
                  ) : (
                    selectedTask.sub_tasks.map((st) => (
                      <div key={st.id} className="flex items-center justify-between bg-neutral-950/20 p-2.5 border border-neutral-850/50 rounded-lg group">
                        <label className="flex items-center gap-3 cursor-pointer text-sm text-neutral-300 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={st.is_completed}
                            onChange={(e) => handleToggleSubTask(st.id!, e.target.checked)}
                            className="rounded border-neutral-800 bg-neutral-950 text-blue-500 focus:ring-0 w-4 h-4 shrink-0"
                          />
                          <span className={`truncate ${st.is_completed ? 'line-through text-neutral-500' : ''}`}>{st.title}</span>
                        </label>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button
                            onClick={() => handleConvertSubTask(st.id!)}
                            title="Convert to full task"
                            className="p-1 rounded text-neutral-500 hover:text-blue-400 transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubTask(st.id!)}
                            title="Delete subtask"
                            className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add subtask input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add sub-task item..."
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubTask();
                    }}
                    className="bg-neutral-950 border-neutral-850 text-xs text-white"
                  />
                  <Button onClick={handleAddSubTask} variant="secondary" className="px-3">
                    Add
                  </Button>
                </div>
              </div>

              {/* Slide-over Footer Delete Action */}
              <div className="border-t border-neutral-850 pt-4 flex justify-between items-center mt-auto">
                <span className="text-[10px] text-neutral-600">
                  Created at {new Date(selectedTask.created_at).toLocaleDateString()}
                </span>
                <Button onClick={() => handleDeleteTask(selectedTask.id)} variant="secondary" className="text-red-400 hover:text-red-300 hover:bg-red-950/20 border-red-900/30">
                  Delete Task
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* "New Task" Modal Form Dialog */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <h3 className="text-lg font-bold text-white">Schedule New Task</h3>
                <button onClick={() => setIsNewModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Task Title</label>
                  <Input
                    required
                    placeholder="Enter task name..."
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Task details..."
                    value={newTaskData.description}
                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Priority</label>
                    <select
                      value={newTaskData.priority}
                      onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value as Task['priority'] })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTaskData.due_date}
                      onChange={(e) => setNewTaskData({ ...newTaskData, due_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Assignee</label>
                    <select
                      value={newTaskData.assignee_id}
                      onChange={(e) => setNewTaskData({ ...newTaskData, assignee_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Link to Project</label>
                    <select
                      value={newTaskData.project_id}
                      onChange={(e) => setNewTaskData({ ...newTaskData, project_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">No Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Link to Meeting</label>
                    <select
                      value={newTaskData.meeting_id}
                      onChange={(e) => setNewTaskData({ ...newTaskData, meeting_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">No Meeting</option>
                      {meetings.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Venture</label>
                    <select
                      value={newTaskData.venture_id}
                      onChange={(e) => setNewTaskData({ ...newTaskData, venture_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">None</option>
                      {ventures.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Tags (comma-separated)</label>
                  <Input
                    placeholder="e.g. Design, Frontend"
                    value={newTaskData.tagsString}
                    onChange={(e) => setNewTaskData({ ...newTaskData, tagsString: e.target.value })}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setIsNewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Task'}
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
