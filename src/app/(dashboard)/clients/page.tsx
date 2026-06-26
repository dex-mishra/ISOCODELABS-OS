'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import {
  Plus, Search, Users, TrendingUp, List, Columns,
  ChevronRight, ArrowRight, Kanban, CheckCircle, Clock, Trash2, X,
  Building2, IndianRupee, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  pipeline_stage: PipelineStage;
  source: string | null;
  value: number | null;
  connected_gmail: boolean;
  connected_whatsapp: boolean;
  last_communication_at: string | null;
  created_at: string;
  industry_id: string | null;
  industry?: { id: string; name: string; icon: string | null } | null;
}

interface Industry {
  id: string;
  name: string;
  icon: string | null;
}

type PipelineStage = 'LEAD' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'ACTIVE' | 'CHURNED';

type PipelineBoard = Record<PipelineStage, Client[]>;

const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; border: string; badge: 'default' | 'secondary' | 'success' | 'warning' | 'danger' }> = {
  LEAD: { label: 'Lead', color: 'text-sky-400', border: 'border-t-2 border-t-sky-500', badge: 'default' },
  CONTACTED: { label: 'Contacted', color: 'text-violet-400', border: 'border-t-2 border-t-violet-500', badge: 'secondary' },
  PROPOSAL: { label: 'Proposal', color: 'text-amber-400', border: 'border-t-2 border-t-amber-500', badge: 'warning' },
  NEGOTIATION: { label: 'Negotiation', color: 'text-orange-400', border: 'border-t-2 border-t-orange-500', badge: 'warning' },
  ACTIVE: { label: 'Active', color: 'text-green-400', border: 'border-t-2 border-t-green-500', badge: 'success' },
  CHURNED: { label: 'Churned', color: 'text-red-400', border: 'border-t-2 border-t-red-500', badge: 'danger' },
};

const STAGES: PipelineStage[] = ['LEAD', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'ACTIVE', 'CHURNED'];

const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  LEAD: ['CONTACTED', 'CHURNED'],
  CONTACTED: ['PROPOSAL', 'CHURNED'],
  PROPOSAL: ['NEGOTIATION', 'CHURNED'],
  NEGOTIATION: ['ACTIVE', 'CHURNED'],
  ACTIVE: ['CHURNED'],
  CHURNED: ['LEAD'],
};

export default function ClientsPage() {
  const { authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();

  const [pipelineBoard, setPipelineBoard] = useState<PipelineBoard>({
    LEAD: [], CONTACTED: [], PROPOSAL: [], NEGOTIATION: [], ACTIVE: [], CHURNED: [],
  });
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '', email: '', phone: '', company: '',
    pipeline_stage: 'LEAD' as PipelineStage,
    source: '', value: '', industry_id: '',
  });

  // Drag state
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pipelineRes, industriesRes] = await Promise.all([
        authFetch('/api/clients/pipeline'),
        authFetch('/api/industries'),
      ]);

      if (pipelineRes.ok) {
        const data: PipelineBoard = await pipelineRes.json();
        setPipelineBoard(data);
        setAllClients(Object.values(data).flat());
      }
      if (industriesRes.ok) {
        setIndustries(await industriesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('clients:update', fetchData);
    return () => { socket.off('clients:update', fetchData); };
  }, [socket, fetchData]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLElement>, clientId: string) => {
    e.dataTransfer.setData('clientId', clientId);
    setDraggedClientId(clientId);
  };

  const handleDragEnd = () => setDraggedClientId(null);

  const handleDrop = async (e: React.DragEvent<HTMLElement>, targetStage: PipelineStage) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    if (!clientId) return;

    // Find current stage
    let currentStage: PipelineStage | null = null;
    for (const [stage, clients] of Object.entries(pipelineBoard)) {
      if (clients.find((c) => c.id === clientId)) {
        currentStage = stage as PipelineStage;
        break;
      }
    }

    if (!currentStage || currentStage === targetStage) return;

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStage];
    if (!allowed.includes(targetStage)) {
      showToast(
        `Cannot move from ${STAGE_CONFIG[currentStage].label} to ${STAGE_CONFIG[targetStage].label}. Valid next steps: ${allowed.map((s) => STAGE_CONFIG[s].label).join(', ')}.`,
        'error'
      );
      return;
    }

    // Optimistic update
    const client = pipelineBoard[currentStage].find((c) => c.id === clientId)!;
    setPipelineBoard((prev) => ({
      ...prev,
      [currentStage!]: prev[currentStage!].filter((c) => c.id !== clientId),
      [targetStage]: [...prev[targetStage], { ...client, pipeline_stage: targetStage }],
    }));

    try {
      const res = await authFetch(`/api/clients/${clientId}/pipeline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: targetStage }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to update stage', 'error');
        fetchData(); // rollback
      } else {
        showToast(`Moved to ${STAGE_CONFIG[targetStage].label}`);
      }
    } catch {
      showToast('Failed to update stage', 'error');
      fetchData();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => e.preventDefault();

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClientData,
          value: newClientData.value ? Number(newClientData.value) : null,
          industry_id: newClientData.industry_id || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to create client', 'error');
        return;
      }

      showToast('Client created successfully!');
      setIsNewModalOpen(false);
      setNewClientData({ name: '', email: '', phone: '', company: '', pipeline_stage: 'LEAD', source: '', value: '', industry_id: '' });
      fetchData();
    } catch {
      showToast('Failed to create client', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list view
  const filteredClients = allClients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'ALL' || c.pipeline_stage === stageFilter;
    return matchSearch && matchStage;
  });

  // Stats
  const totalValue = allClients.reduce((sum, c) => sum + (c.value || 0), 0);
  const activeCount = allClients.filter((c) => c.pipeline_stage === 'ACTIVE').length;
  const leadsCount = allClients.filter((c) => c.pipeline_stage === 'LEAD').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-900/90 text-red-100 border border-red-700'
                : 'bg-neutral-800 text-white border border-neutral-700'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-neutral-400 mt-1">
            CRM pipeline, Gmail & WhatsApp sync, and AI communication insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'pipeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Pipeline view"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="primary" onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Client
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: allClients.length, icon: Users, color: 'text-blue-400' },
          { label: 'Active', value: activeCount, icon: TrendingUp, color: 'text-green-400' },
          { label: 'New Leads', value: leadsCount, icon: ChevronRight, color: 'text-sky-400' },
          {
            label: 'Pipeline Value',
            value: `₹${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
            icon: IndianRupee,
            color: 'text-amber-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg bg-neutral-800 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{stat.label}</p>
              <p className="text-lg font-bold text-white">{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {/* PIPELINE BOARD VIEW */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const stageClients = pipelineBoard[stage] || [];

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-72 bg-neutral-950/60 border border-neutral-800 rounded-2xl ${config.border} flex flex-col`}
                onDrop={(e) => handleDrop(e, stage)}
                onDragOver={handleDragOver}
              >
                {/* Column Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                    <span className="text-xs bg-neutral-800 text-neutral-400 rounded-full px-2 py-0.5">
                      {loading ? '…' : stageClients.length}
                    </span>
                  </div>
                  {stage !== 'CHURNED' && (
                    <span className="text-xs text-neutral-600">
                      ₹{stageClients.reduce((sum, c) => sum + (c.value || 0), 0).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-3 flex-1 min-h-[200px]">
                  {loading
                    ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
                    : stageClients.map((client) => (
                        <motion.div
                          key={client.id}
                          layout
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLElement>, client.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/clients/${client.id}`)}
                          className={`bg-neutral-900 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-colors group ${
                            draggedClientId === client.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar name={client.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                                {client.name}
                              </p>
                              {client.company && (
                                <p className="text-xs text-neutral-500 truncate">{client.company}</p>
                              )}
                              {client.industry && (
                                <span className="inline-flex items-center mt-1 gap-1 text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                                  <Building2 size={10} /> {client.industry.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            {client.value ? (
                              <span className="text-xs font-medium text-amber-400">
                                ₹{client.value.toLocaleString()}
                              </span>
                            ) : <span />}
                            <div className="flex gap-1">
                              {client.connected_gmail && (
                                <span title="Gmail connected" className="text-xs bg-red-900/30 text-red-400 rounded px-1.5 py-0.5">G</span>
                              )}
                              {client.connected_whatsapp && (
                                <span title="WhatsApp connected" className="text-xs bg-green-900/30 text-green-400 rounded px-1.5 py-0.5">W</span>
                              )}
                            </div>
                          </div>

                          {client.last_communication_at && (
                            <p className="text-xs text-neutral-600 mt-2">
                              Last contact {formatDistanceToNow(new Date(client.last_communication_at), { addSuffix: true })}
                            </p>
                          )}
                        </motion.div>
                      ))}

                  {/* Empty drop zone */}
                  {!loading && stageClients.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-neutral-900 rounded-xl flex items-center justify-center p-6">
                      <span className="text-xs text-neutral-700">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  {['Client', 'Company', 'Industry', 'Stage', 'Value', 'Last Contact', 'Channels'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-6 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-neutral-600 text-sm">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate max-w-[150px]" title={client.name}>{client.name}</p>
                            <p className="text-xs text-neutral-500 truncate max-w-[180px]" title={client.email}>{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-400">
                        <div className="truncate max-w-[150px]" title={client.company || ''}>
                          {client.company || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">
                        {client.industry ? (
                          <span className="inline-flex items-center gap-1 bg-neutral-800 px-2 py-0.5 rounded">
                            <Building2 size={10} /> {client.industry.name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STAGE_CONFIG[client.pipeline_stage].badge}>
                          {STAGE_CONFIG[client.pipeline_stage].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-amber-400 font-medium">
                        {client.value ? `₹${client.value.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {client.last_communication_at
                          ? formatDistanceToNow(new Date(client.last_communication_at), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {client.connected_gmail && (
                            <span className="text-xs bg-red-900/30 text-red-400 border border-red-800/30 rounded px-1.5 py-0.5">Gmail</span>
                          )}
                          {client.connected_whatsapp && (
                            <span className="text-xs bg-green-900/30 text-green-400 border border-green-800/30 rounded px-1.5 py-0.5">WhatsApp</span>
                          )}
                          {!client.connected_gmail && !client.connected_whatsapp && (
                            <span className="text-xs text-neutral-700">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW CLIENT MODAL */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                <h2 className="text-lg font-bold">New Client</h2>
                <button onClick={() => setIsNewModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Full Name *</label>
                    <Input
                      required
                      value={newClientData.name}
                      onChange={(e) => setNewClientData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Email *</label>
                    <Input
                      required
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Phone</label>
                    <Input
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Company</label>
                    <Input
                      value={newClientData.company}
                      onChange={(e) => setNewClientData((p) => ({ ...p, company: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Pipeline Stage</label>
                    <select
                      value={newClientData.pipeline_stage}
                      onChange={(e) => setNewClientData((p) => ({ ...p, pipeline_stage: e.target.value as PipelineStage }))}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Industry</label>
                    <select
                      value={newClientData.industry_id}
                      onChange={(e) => setNewClientData((p) => ({ ...p, industry_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select industry...</option>
                      {industries.map((ind) => (
                        <option key={ind.id} value={ind.id}>{ind.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Deal Value (₹)</label>
                    <Input
                      type="number"
                      value={newClientData.value}
                      onChange={(e) => setNewClientData((p) => ({ ...p, value: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Source</label>
                    <select
                      value={newClientData.source}
                      onChange={(e) => setNewClientData((p) => ({ ...p, source: e.target.value }))}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select source...</option>
                      {['Referral', 'Website', 'LinkedIn', 'Cold Outreach', 'Event', 'Partner', 'Other'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
                  <Button variant="secondary" type="button" onClick={() => setIsNewModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" loading={submitting}>
                    {submitting ? 'Creating...' : 'Create Client'}
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
