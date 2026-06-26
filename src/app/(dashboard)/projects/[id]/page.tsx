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
  Plus,
  ArrowLeft,
  X,
  Link as LinkIcon,
  Trash2,
  AlertCircle,
  IndianRupee
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface Client {
  id: string;
  name: string;
  company?: string | null;
  email: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date?: string | null;
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  client: Client;
  industry?: { id: string; name: string } | null;
  creator: User;
  milestones: Milestone[];
  tasks: Task[];
  transactions?: { id: string; amount: number; type: 'INCOME' | 'EXPENSE'; category: string; date: string; description?: string | null }[];
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();
  const { id } = params;

  // Project data
  const [project, setProject] = useState<Project | null>(null);
  const [unlinkedTasks, setUnlinkedTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);

  // Form states
  const [milestoneSubmitting, setMilestoneSubmitting] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
    status: 'PENDING' as Milestone['status'],
  });

  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [newProjectTask, setNewProjectTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignee_id: '',
    due_date: '',
  });

  const [linkingTaskId, setLinkingTaskId] = useState('');

  // Transaction logging states
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().substring(0, 10));
  const [submittingTx, setSubmittingTx] = useState(false);

  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/projects/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Project not found');
        throw new Error('Failed to retrieve project details');
      }
      const data = await res.json();
      setProject(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  const handleLogProjectTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txCategory) return;
    setSubmittingTx(true);
    try {
      const res = await authFetch('/api/money/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(txAmount),
          type: txType,
          category: txCategory,
          date: new Date(txDate).toISOString(),
          description: txDescription || `${txType === 'INCOME' ? 'Income' : 'Expense'} for project ${project?.name}`,
          project_id: id,
          client_id: project?.client.id || null,
          industry_id: project?.industry?.id || null,
        }),
      });

      if (res.ok) {
        setTxAmount('');
        setTxCategory('');
        setTxDescription('');
        setTxDate(new Date().toISOString().substring(0, 10));
        setShowTxModal(false);
        fetchProjectDetails();
        alert('Transaction recorded successfully!');
      } else {
        alert('Failed to record transaction.');
      }
    } catch (err) {
      console.error(err);
      alert('Error recording transaction.');
    } finally {
      setSubmittingTx(false);
    }
  };

  const fetchUnlinkedTasks = useCallback(async () => {
    try {
      const res = await authFetch('/api/tasks?projectId=none');
      if (res.ok) {
        setUnlinkedTasks(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchProjectDetails();
    fetchUnlinkedTasks();
    fetchUsers();
  }, [fetchProjectDetails, fetchUnlinkedTasks, fetchUsers]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchProjectDetails();
      fetchUnlinkedTasks();
    };

    socket.on('projects:update', handleUpdate);
    socket.on('tasks:update', handleUpdate);

    return () => {
      socket.off('projects:update', handleUpdate);
      socket.off('tasks:update', handleUpdate);
    };
  }, [socket, fetchProjectDetails, fetchUnlinkedTasks]);

  // Project Status transition handler
  const handleProjectStatusChange = async (status: Project['status']) => {
    if (!project) return;
    try {
      const res = await authFetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          client_id: project.client.id,
          status,
          start_date: project.start_date,
          end_date: project.end_date,
          budget: project.budget,
        }),
      });
      if (res.ok) {
        fetchProjectDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Milestone Status toggle handler
  const handleMilestoneStatusChange = async (milestone: Milestone, status: Milestone['status']) => {
    try {
      const res = await authFetch(`/api/projects/${id}/milestones/${milestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: milestone.title,
          description: milestone.description,
          due_date: milestone.due_date,
          status,
        }),
      });
      if (res.ok) {
        fetchProjectDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Milestone form submit
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMilestoneSubmitting(true);
      const res = await authFetch(`/api/projects/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMilestone,
          due_date: newMilestone.due_date ? new Date(newMilestone.due_date).toISOString() : null,
        }),
      });
      if (res.ok) {
        setIsMilestoneModalOpen(false);
        setNewMilestone({ title: '', description: '', due_date: '', status: 'PENDING' });
        fetchProjectDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  // Link Task submit
  const handleLinkTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTaskId) return;

    try {
      // Fetch the task first to preserve details
      const taskRes = await authFetch(`/api/tasks/${linkingTaskId}`);
      if (!taskRes.ok) throw new Error('Task not found');
      const task = await taskRes.json();

      // Put update with project_id
      const res = await authFetch(`/api/tasks/${linkingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          project_id: id,
          assignee_id: task.assignee?.id || null,
          meeting_id: task.meeting?.id || null,
          subTasks: task.sub_tasks,
        }),
      });

      if (res.ok) {
        setIsLinkTaskModalOpen(false);
        setLinkingTaskId('');
        fetchProjectDetails();
        fetchUnlinkedTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create pre-linked task submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTaskSubmitting(true);
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProjectTask,
          project_id: id,
          assignee_id: newProjectTask.assignee_id || null,
          due_date: newProjectTask.due_date ? new Date(newProjectTask.due_date).toISOString() : null,
        }),
      });

      if (res.ok) {
        setIsCreateTaskModalOpen(false);
        setNewProjectTask({
          title: '',
          description: '',
          priority: 'MEDIUM',
          assignee_id: '',
          due_date: '',
        });
        fetchProjectDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Unlink Task helper
  const handleUnlinkTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to unlink this task from this project?')) return;
    try {
      const taskRes = await authFetch(`/api/tasks/${taskId}`);
      if (!taskRes.ok) throw new Error('Task not found');
      const task = await taskRes.json();

      const res = await authFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...task,
          project_id: null,
          assignee_id: task.assignee?.id || null,
          meeting_id: task.meeting?.id || null,
          subTasks: task.sub_tasks,
        }),
      });

      if (res.ok) {
        fetchProjectDetails();
        fetchUnlinkedTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This will remove milestones and unlink all project tasks.')) return;
    try {
      const res = await authFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/projects');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'PLANNING':
        return <Badge className="bg-blue-950/20 text-blue-400 border border-blue-900/30">PLANNING</Badge>;
      case 'ACTIVE':
        return <Badge className="bg-green-950/20 text-green-400 border border-green-900/30">ACTIVE</Badge>;
      case 'ON_HOLD':
        return <Badge className="bg-yellow-950/20 text-yellow-400 border border-yellow-900/30">ON HOLD</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-purple-950/20 text-purple-400 border border-purple-900/30">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-950/20 text-red-400 border border-red-900/30">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-16 border border-neutral-900 rounded-2xl bg-neutral-950/20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white">Project error</h3>
        <p className="text-sm text-neutral-400 mt-1 mb-4">{error || 'Project not found'}</p>
        <Link href="/projects">
          <Button variant="secondary" className="flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate project statistics
  const totalMilestones = project.milestones.length;
  const completedMilestones = project.milestones.filter((m) => m.status === 'COMPLETED').length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header breadcrumb & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-850 pb-6">
        <div className="space-y-2">
          <Link href="/projects" className="text-xs text-neutral-500 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
            {getStatusBadge(project.status)}
            {project.industry && (
              <Badge variant="secondary" className="bg-apple-blue/10 text-apple-blue border-apple-blue/20 font-medium">
                💼 {project.industry.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Client: <span className="text-neutral-300 font-medium">{project.client.name}</span>
            {project.client.company && ` (${project.client.company})`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status flow controls */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-0.5 flex items-center">
            {(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as Project['status'][]).map((st) => (
              <button
                key={st}
                onClick={() => handleProjectStatusChange(st)}
                className={`text-[10px] px-3 py-1.5 rounded-md font-semibold tracking-wider transition-colors ${
                  project.status === st
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Button onClick={handleDeleteProject} variant="secondary" className="text-red-400 hover:text-red-300 border-red-900/30">
            Delete Project
          </Button>
        </div>
      </div>

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Milestones and Timeline */}
        <div className="md:col-span-2 space-y-6">
          {/* Timeline chart visualization */}
          <Card className="bg-neutral-900/30 border-neutral-850 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-300">Milestone Roadmap Timeline</h3>
                <p className="text-[11px] text-neutral-500">Milestones arranged chronologically by target dates.</p>
              </div>
              <Badge variant="secondary" className="bg-neutral-900 text-blue-400 border-neutral-800 font-bold">
                {progress}% Finished
              </Badge>
            </div>

            {totalMilestones === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-600 italic">
                No milestones added to compile timeline.
              </div>
            ) : (
              <div className="space-y-6 relative pl-4 border-l border-neutral-800 ml-2 py-2">
                {project.milestones.map((ms) => {
                  const isCompleted = ms.status === 'COMPLETED';
                  const isInProgress = ms.status === 'IN_PROGRESS';
                  const isOverdue = ms.due_date && isPast(new Date(ms.due_date)) && !isCompleted;

                  return (
                    <div key={ms.id} className="relative group">
                      {/* Node point */}
                      <span
                        className={`absolute -left-[25px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-neutral-900'
                            : isInProgress
                            ? 'bg-blue-900/80 border-blue-500 text-blue-400'
                            : 'bg-neutral-950 border-neutral-700 text-neutral-500'
                        }`}
                        style={{ width: '18px', height: '18px' }}
                      >
                        {isCompleted && <span className="text-[9px] font-bold">✓</span>}
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isCompleted ? 'text-neutral-500 line-through' : 'text-white'}`}>
                              {ms.title}
                            </span>
                            {isOverdue && (
                              <Badge className="bg-red-950/20 text-red-500 border-red-900/30 text-[9px] py-0 px-1.5 font-bold">
                                OVERDUE
                              </Badge>
                            )}
                          </div>
                          {ms.description && (
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{ms.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {ms.due_date ? format(new Date(ms.due_date), 'MMM d, yyyy') : 'No target date'}
                          </span>
                          
                          {/* Toggle dropdown or buttons to quickly update milestone status */}
                          <select
                            value={ms.status}
                            onChange={(e) => handleMilestoneStatusChange(ms, e.target.value as Milestone['status'])}
                            className="bg-neutral-900 border border-neutral-850 text-[10px] text-neutral-400 rounded p-1 outline-none cursor-pointer focus:border-neutral-700"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">Progress</option>
                            <option value="COMPLETED">Finished</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end mt-4 border-t border-neutral-850/50 pt-4">
              <Button onClick={() => setIsMilestoneModalOpen(true)} variant="secondary" className="text-xs py-1.5 px-3 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </Button>
            </div>
          </Card>

          {/* Project Details / Metadata Card */}
          <Card className="bg-neutral-900/30 border-neutral-850 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-300">Project Parameters</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {project.description || 'No project scope notes provided.'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-neutral-850/50 pt-4">
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Budget</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {project.budget ? `₹${project.budget.toLocaleString()}` : 'No budget'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Timeline start</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : 'TBD'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Target Delivery</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : 'TBD'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Created By</span>
                <span className="text-sm font-bold text-white mt-1 block">{project.creator.name}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Linked Tasks Panel */}
        <div className="space-y-6">
          {/* Project Financials Card */}
          <Card className="bg-neutral-900/30 border-neutral-850 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-300">Project Financials</h3>
              <Badge variant="success">Active Ledger</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs border-b border-neutral-850/50 pb-2">
                <span className="text-neutral-500 font-medium">Budget:</span>
                <span className="font-semibold text-white">
                  {project.budget ? `₹${project.budget.toLocaleString()}` : 'No Budget'}
                </span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-850/50 pb-2">
                <span className="text-neutral-500 font-medium">Income Received:</span>
                <span className="font-semibold text-apple-green">
                  +₹{(project.transactions?.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0) || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-850/50 pb-2">
                <span className="text-neutral-500 font-medium">Expenses Incurred:</span>
                <span className="font-semibold text-apple-red">
                  -₹{(project.transactions?.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0) || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs border-b border-neutral-850/50 pb-2">
                <span className="text-neutral-500 font-medium">Remaining Margin:</span>
                <span className={`font-semibold ${
                  (project.budget || 0) - (project.transactions?.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0) || 0) >= 0
                    ? 'text-apple-green'
                    : 'text-apple-red'
                }`}>
                  ₹{((project.budget || 0) - (project.transactions?.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTxType('INCOME');
                  setTxCategory('Project Milestone');
                  setShowTxModal(true);
                }}
                className="w-full bg-apple-green hover:bg-apple-green/90 text-white font-bold text-xs py-2 rounded-apple flex items-center justify-center gap-1 shadow-apple-sm transition-all"
              >
                + Record Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType('EXPENSE');
                  setTxCategory('Freelancer Payment');
                  setShowTxModal(true);
                }}
                className="w-full bg-apple-red hover:bg-apple-red/90 text-white font-bold text-xs py-2 rounded-apple flex items-center justify-center gap-1 shadow-apple-sm transition-all"
              >
                - Record Expense
              </button>
            </div>
          </Card>

          <Card className="bg-neutral-900/30 border-neutral-850 p-6 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300">Project Tasks</h3>
                  <p className="text-[11px] text-neutral-500">Tasks associated with this project contract.</p>
                </div>
                <Badge className="bg-purple-950/20 text-purple-400 border border-purple-900/30 font-bold">
                  {project.tasks.length}
                </Badge>
              </div>

              {/* Tasks List */}
              <div className="space-y-3 overflow-y-auto max-h-[400px]">
                {project.tasks.length === 0 ? (
                  <p className="text-xs text-neutral-600 italic py-6 text-center">No tasks linked to this project.</p>
                ) : (
                  project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-neutral-900/50 border border-neutral-850 hover:border-neutral-750 p-3 rounded-lg flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="space-y-1">
                        <Link href="/tasks" className="text-xs font-semibold text-white hover:text-blue-400 block transition-colors line-clamp-1">
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] py-0 px-1">
                            {task.status}
                          </Badge>
                          <Badge variant={task.priority === 'URGENT' ? 'danger' : task.priority === 'HIGH' ? 'warning' : 'secondary'} className="text-[9px] py-0 px-1">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Avatar src={task.assignee?.avatar_url || ''} name={task.assignee?.name || 'Unassigned'} size="sm" />
                        <button
                          onClick={() => handleUnlinkTask(task.id)}
                          className="text-neutral-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Unlink from Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 border-t border-neutral-850/50 pt-4 mt-6">
              <Button onClick={() => setIsLinkTaskModalOpen(true)} variant="secondary" className="text-xs py-2 flex items-center justify-center gap-1">
                <LinkIcon className="w-3.5 h-3.5" /> Link Task
              </Button>
              <Button onClick={() => setIsCreateTaskModalOpen(true)} variant="primary" className="text-xs py-2 flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Create Task
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {isMilestoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMilestoneModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <h3 className="text-lg font-bold text-white">Add Project Milestone</h3>
                <button onClick={() => setIsMilestoneModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMilestone} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Milestone Title</label>
                  <Input
                    required
                    placeholder="e.g. Design Handshake Mockup"
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Details</label>
                  <textarea
                    rows={3}
                    placeholder="Describe target objectives for this milestone..."
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Status</label>
                    <select
                      value={newMilestone.status}
                      onChange={(e) => setNewMilestone({ ...newMilestone, status: e.target.value as Milestone['status'] })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Target Date</label>
                    <input
                      type="date"
                      value={newMilestone.due_date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setIsMilestoneModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={milestoneSubmitting}>
                    {milestoneSubmitting ? 'Adding...' : 'Add Milestone'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Task Modal */}
      <AnimatePresence>
        {isLinkTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLinkTaskModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <h3 className="text-lg font-bold text-white">Link Task to Project</h3>
                <button onClick={() => setIsLinkTaskModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLinkTask} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Select Task</label>
                  <select
                    required
                    value={linkingTaskId}
                    onChange={(e) => setLinkingTaskId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                  >
                    <option value="">Choose task...</option>
                    {unlinkedTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status} - {t.priority})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setIsLinkTaskModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={!linkingTaskId}>
                    Associate Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Pre-linked Task Modal */}
      <AnimatePresence>
        {isCreateTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateTaskModalOpen(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <h3 className="text-lg font-bold text-white">Create Task for Project</h3>
                <button onClick={() => setIsCreateTaskModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Task Title</label>
                  <Input
                    required
                    placeholder="Enter task name..."
                    value={newProjectTask.title}
                    onChange={(e) => setNewProjectTask({ ...newProjectTask, title: e.target.value })}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Task details..."
                    value={newProjectTask.description}
                    onChange={(e) => setNewProjectTask({ ...newProjectTask, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Priority</label>
                    <select
                      value={newProjectTask.priority}
                      onChange={(e) => setNewProjectTask({ ...newProjectTask, priority: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Assignee</label>
                    <select
                      value={newProjectTask.assignee_id}
                      onChange={(e) => setNewProjectTask({ ...newProjectTask, assignee_id: e.target.value })}
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
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newProjectTask.due_date}
                      onChange={(e) => setNewProjectTask({ ...newProjectTask, due_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setIsCreateTaskModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={taskSubmitting}>
                    {taskSubmitting ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Project Transaction Modal */}
      <AnimatePresence>
        {showTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTxModal(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                <h3 className="text-lg font-bold text-white">
                  Record Project {txType === 'INCOME' ? 'Income' : 'Expense'}
                </h3>
                <button onClick={() => setShowTxModal(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogProjectTransaction} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Amount (₹)</label>
                  <Input
                    type="number"
                    required
                    step="0.01"
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Category</label>
                  <select
                    required
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                  >
                    {txType === 'INCOME' ? (
                      <>
                        <option value="Project Milestone">Project Milestone</option>
                        <option value="Monthly Retainer">Monthly Retainer</option>
                        <option value="Consulting Fee">Consulting Fee</option>
                        <option value="Other">Other</option>
                      </>
                    ) : (
                      <>
                        <option value="Freelancer Payment">Freelancer Payment</option>
                        <option value="Software Licensing">Software Licensing</option>
                        <option value="Travel">Travel</option>
                        <option value="Advertising">Advertising</option>
                        <option value="Operations">Operations</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description..."
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setShowTxModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submittingTx}>
                    {submittingTx ? 'Recording...' : 'Record Transaction'}
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


