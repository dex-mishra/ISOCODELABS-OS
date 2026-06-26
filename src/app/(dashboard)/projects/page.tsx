'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Folder,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  X,
  IndianRupee,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  company?: string | null;
}

interface Milestone {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
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
  milestones: Milestone[];
  industry_id?: string | null;
  industry?: { id: string; name: string } | null;
}

export default function ProjectsPage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [industries, setIndustries] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    client_id: '',
    industry_id: '',
    status: 'PLANNING' as Project['status'],
    start_date: '',
    end_date: '',
    budget: '',
  });

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await authFetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to retrieve projects');
      const data = await res.json();
      setProjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [authFetch, statusFilter, searchQuery]);

  const fetchMeta = useCallback(async () => {
    try {
      const [clientRes, indRes] = await Promise.all([
        authFetch('/api/clients'),
        authFetch('/api/industries'),
      ]);
      if (clientRes.ok) {
        setClients(await clientRes.json());
      }
      if (indRes.ok) {
        setIndustries(await indRes.json());
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchProjects();
    fetchMeta();
  }, [fetchProjects, fetchMeta]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchProjects();
    };

    socket.on('projects:update', handleUpdate);

    return () => {
      socket.off('projects:update', handleUpdate);
    };
  }, [socket, fetchProjects]);

  // Project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProjectData,
          start_date: newProjectData.start_date || null,
          end_date: newProjectData.end_date || null,
          budget: newProjectData.budget || null,
          industry_id: newProjectData.industry_id || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to create project');

      setIsNewModalOpen(false);
      setNewProjectData({
        name: '',
        description: '',
        client_id: '',
        industry_id: '',
        status: 'PLANNING',
        start_date: '',
        end_date: '',
        budget: '',
      });
      fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-blue-950/20 text-blue-400 border border-blue-900/30';
      case 'ACTIVE':
        return 'bg-green-950/20 text-green-400 border border-green-900/30';
      case 'ON_HOLD':
        return 'bg-yellow-950/20 text-yellow-400 border border-yellow-900/30';
      case 'COMPLETED':
        return 'bg-purple-950/20 text-purple-400 border border-purple-900/30';
      case 'CANCELLED':
        return 'bg-red-950/20 text-red-400 border border-red-900/30';
      default:
        return 'bg-neutral-900 text-neutral-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Client Projects</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Manage client project pipelines, milestone progression, and financials.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
          <Input
            placeholder="Search projects by name, details, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-neutral-900/50 border-neutral-800 text-sm text-white"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Projects Grid Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : error ? (
        <div className="text-center py-12 border border-neutral-850 rounded-xl bg-neutral-900/20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Failed to load projects</h3>
          <p className="text-sm text-neutral-400 mt-1 mb-4">{error}</p>
          <Button onClick={fetchProjects} variant="secondary">
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border border-neutral-900 rounded-2xl bg-neutral-950/20">
          <Folder className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No projects found</h3>
          <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
            Get started by creating a client contract project and tracking milestones.
          </p>
          <Button onClick={() => setIsNewModalOpen(true)} variant="secondary" className="mt-4">
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project) => {
            const total = project.milestones.length;
            const completed = project.milestones.filter((m) => m.status === 'COMPLETED').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`} passHref>
                <Card className="bg-neutral-900/40 border-neutral-850 hover:border-neutral-750 transition-all cursor-pointer h-full flex flex-col group relative overflow-hidden">
                  <CardHeader className="flex justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider truncate" title={project.client?.company || project.client?.name || ''}>
                          {project.client?.company || project.client?.name}
                        </span>
                        {project.industry && (
                          <>
                            <span className="text-neutral-600 text-[10px] font-semibold">•</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                              {project.industry.name}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors leading-snug truncate" title={project.name}>
                        {project.name}
                      </h3>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1 flex flex-col justify-between pt-0">
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                        <span>Milestones Progress</span>
                        <span>
                          {completed}/{total} ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Project Footer Meta */}
                    <div className="border-t border-neutral-850/50 pt-3 flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        {project.start_date
                          ? format(new Date(project.start_date), 'MMM yy')
                          : 'TBD'}{' '}
                        →{' '}
                        {project.end_date ? format(new Date(project.end_date), 'MMM yy') : 'TBD'}
                      </span>
                      {project.budget !== null && project.budget !== undefined && (
                        <span className="flex items-center text-neutral-300 font-semibold">
                          <IndianRupee className="w-3 h-3 text-neutral-500" />
                          {project.budget.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* "New Project" Modal */}
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
                <h3 className="text-lg font-bold text-white">Initialize Client Project</h3>
                <button onClick={() => setIsNewModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Project Name</label>
                  <Input
                    required
                    placeholder="e.g. MedScheduler App V1"
                    value={newProjectData.name}
                    onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                    className="bg-neutral-950 border-neutral-850 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe scope, objectives, or key integrations..."
                    value={newProjectData.description}
                    onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-850 text-sm rounded-lg p-3 text-white outline-none focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Client Profile</label>
                    <select
                      required
                      value={newProjectData.client_id}
                      onChange={(e) => setNewProjectData({ ...newProjectData, client_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">Select client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Industry</label>
                    <select
                      value={newProjectData.industry_id}
                      onChange={(e) => setNewProjectData({ ...newProjectData, industry_id: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="">Select industry...</option>
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Project Status</label>
                    <select
                      value={newProjectData.status}
                      onChange={(e) => setNewProjectData({ ...newProjectData, status: e.target.value as Project['status'] })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newProjectData.start_date}
                      onChange={(e) => setNewProjectData({ ...newProjectData, start_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Target End Date</label>
                    <input
                      type="date"
                      value={newProjectData.end_date}
                      onChange={(e) => setNewProjectData({ ...newProjectData, end_date: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-850 text-xs text-neutral-300 rounded-lg p-2.5 outline-none focus:border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1">Budget (₹)</label>
                    <Input
                      type="number"
                      placeholder="INR"
                      value={newProjectData.budget}
                      onChange={(e) => setNewProjectData({ ...newProjectData, budget: e.target.value })}
                      className="bg-neutral-950 border-neutral-850 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-850">
                  <Button variant="secondary" type="button" onClick={() => setIsNewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Launch Project'}
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
