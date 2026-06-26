'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Users,
  Briefcase,
  Package,
  X,
  ChevronRight,
  Edit2,
  Trash2,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

interface Industry {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  _count: {
    clients: number;
    projects: number;
    products: number;
  };
  products: { id: string; name: string }[];
}

interface IndustryDetail extends Industry {
  clients: {
    id: string;
    name: string;
    email: string;
    company: string | null;
    pipeline_stage: string;
    value: number | null;
  }[];
  projects: {
    id: string;
    name: string;
    status: string;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    client: { id: string; name: string };
  }[];
}

const DEFAULT_ICONS = ['🏥', '💻', '🎓', '🏦', '🛒', '🏭', '🌱', '✈️', '🎨', '⚡', '🏗️', '📱', '🔬', '🎯', '🌐'];

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead', CONTACTED: 'Contacted', PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation', ACTIVE: 'Active', CHURNED: 'Churned',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'text-gray-400', ACTIVE: 'text-green-400',
  ON_HOLD: 'text-yellow-400', COMPLETED: 'text-blue-400', CANCELLED: 'text-red-400',
};

export default function IndustriesPage() {
  const { authFetch } = useAuth();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndustry, setEditingIndustry] = useState<Industry | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: '🏢', color: '#3B82F6' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchIndustries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/industries');
      if (res.ok) {
        const data = await res.json();
        setIndustries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchIndustryDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await authFetch(`/api/industries/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedIndustry(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  const openCreateModal = () => {
    setEditingIndustry(null);
    setFormData({ name: '', icon: '🏢', color: '#3B82F6' });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (industry: Industry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndustry(industry);
    setFormData({
      name: industry.name,
      icon: industry.icon || '🏢',
      color: industry.color || '#3B82F6',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const url = editingIndustry ? `/api/industries/${editingIndustry.id}` : '/api/industries';
      const method = editingIndustry ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save industry');
      }

      setIsModalOpen(false);
      fetchIndustries();
      showToast(editingIndustry ? 'Industry updated!' : 'Industry created!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this industry? Clients and projects will be unlinked.')) return;
    try {
      const res = await authFetch(`/api/industries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchIndustries();
        if (selectedIndustry?.id === id) setSelectedIndustry(null);
        showToast('Industry deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalClients = industries.reduce((s, i) => s + i._count.clients, 0);
  const totalProjects = industries.reduce((s, i) => s + i._count.projects, 0);
  const totalProducts = industries.reduce((s, i) => s + i._count.products, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Industry Portfolios</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Organise clients, projects, and products by industry vertical.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Industry
        </Button>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Industries</div>
            <div className="text-2xl font-bold text-white mt-1">{industries.length}</div>
          </div>
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Clients</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{totalClients}</div>
          </div>
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Projects</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{totalProjects}</div>
          </div>
        </div>
      )}

      {/* Main content — grid or detail */}
      {selectedIndustry ? (
        /* ── Detail View ── */
        <div className="space-y-6">
          <button
            onClick={() => setSelectedIndustry(null)}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all industries
          </button>

          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Industry header card */}
              <div
                className="rounded-2xl border border-neutral-800 p-6 flex items-center gap-5"
                style={{ background: `linear-gradient(135deg, ${selectedIndustry.color || '#3B82F6'}15, transparent)` }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: `${selectedIndustry.color || '#3B82F6'}20`, border: `1px solid ${selectedIndustry.color || '#3B82F6'}40` }}
                >
                  {selectedIndustry.icon || '🏢'}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedIndustry.name}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-neutral-400">
                      <span className="font-semibold text-white">{selectedIndustry._count.clients}</span> clients
                    </span>
                    <span className="text-sm text-neutral-400">
                      <span className="font-semibold text-white">{selectedIndustry._count.projects}</span> projects
                    </span>
                    <span className="text-sm text-neutral-400">
                      <span className="font-semibold text-white">{selectedIndustry._count.products}</span> products
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clients */}
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Users className="w-4 h-4 text-blue-400" />
                      Clients ({selectedIndustry.clients.length})
                    </div>
                  </div>
                  <div className="divide-y divide-neutral-800/50 max-h-80 overflow-y-auto">
                    {selectedIndustry.clients.length === 0 ? (
                      <div className="p-6 text-center text-sm text-neutral-500">No clients in this industry</div>
                    ) : (
                      selectedIndustry.clients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{client.name}</p>
                            <p className="text-xs text-neutral-500">{client.company || client.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {client.value && (
                              <span className="text-xs text-green-400 font-semibold">
                                ₹{client.value.toLocaleString()}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px]">
                              {STAGE_LABELS[client.pipeline_stage] || client.pipeline_stage}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Projects */}
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Briefcase className="w-4 h-4 text-purple-400" />
                      Projects ({selectedIndustry.projects.length})
                    </div>
                  </div>
                  <div className="divide-y divide-neutral-800/50 max-h-80 overflow-y-auto">
                    {selectedIndustry.projects.length === 0 ? (
                      <div className="p-6 text-center text-sm text-neutral-500">No projects in this industry</div>
                    ) : (
                      selectedIndustry.projects.map((project) => (
                        <div key={project.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{project.name}</p>
                            <p className="text-xs text-neutral-500">{project.client.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {project.budget && (
                              <span className="text-xs text-neutral-400">
                                ₹{project.budget.toLocaleString()}
                              </span>
                            )}
                            <span className={`text-xs font-semibold ${STATUS_COLORS[project.status] || 'text-gray-400'}`}>
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Products */}
              {selectedIndustry.products.length > 0 && (
                <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800 text-sm font-semibold text-white">
                    <Package className="w-4 h-4 text-amber-400" />
                    Products ({selectedIndustry.products.length})
                  </div>
                  <div className="p-5 flex flex-wrap gap-2">
                    {selectedIndustry.products.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ── Grid View ── */
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : industries.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-neutral-800 rounded-2xl">
              <Building2 className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No industries yet</h3>
              <p className="text-sm text-neutral-500 mb-6">Create your first industry portfolio to organise clients and projects.</p>
              <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" /> Create Industry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {industries.map((industry) => (
                <motion.div
                  key={industry.id}
                  layoutId={`industry-${industry.id}`}
                  onClick={() => fetchIndustryDetail(industry.id)}
                  whileHover={{ y: -2, scale: 1.01 }}
                  className="group relative bg-neutral-900/60 border border-neutral-800 hover:border-neutral-600 rounded-2xl p-6 cursor-pointer overflow-hidden transition-colors"
                >
                  {/* Color accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                    style={{ background: industry.color || '#3B82F6' }}
                  />

                  {/* Background glow */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
                    style={{ background: industry.color || '#3B82F6' }}
                  />

                  {/* Edit / Delete controls */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-10">
                    <button
                      onClick={(e) => openEditModal(industry, e)}
                      className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(industry.id, e)}
                      className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                    style={{ background: `${industry.color || '#3B82F6'}20`, border: `1px solid ${industry.color || '#3B82F6'}35` }}
                  >
                    {industry.icon || '🏢'}
                  </div>

                  {/* Name */}
                  <h3 className="text-lg font-bold text-white mb-3">{industry.name}</h3>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-semibold text-neutral-300">{industry._count.clients}</span> clients
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="font-semibold text-neutral-300">{industry._count.projects}</span> projects
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      <span className="font-semibold text-neutral-300">{industry._count.products}</span> products
                    </span>
                  </div>

                  {/* Products preview */}
                  {industry.products.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {industry.products.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400"
                        >
                          {p.name}
                        </span>
                      ))}
                      {industry.products.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500">
                          +{industry.products.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-end text-neutral-600 group-hover:text-neutral-400 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              ))}

              {/* Add new card */}
              <motion.button
                onClick={openCreateModal}
                whileHover={{ y: -2 }}
                className="border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-neutral-600 hover:text-neutral-400 transition-colors min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">Add Industry</span>
              </motion.button>
            </div>
          )}

          {/* Revenue by Industry widget */}
          {!loading && industries.length > 0 && (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white">Distribution by Industry</h3>
              </div>
              <div className="space-y-3">
                {industries
                  .sort((a, b) => b._count.clients - a._count.clients)
                  .map((industry) => {
                    const maxClients = Math.max(...industries.map((i) => i._count.clients), 1);
                    const pct = (industry._count.clients / maxClients) * 100;
                    return (
                      <div key={industry.id} className="flex items-center gap-3">
                        <span className="text-lg w-7 shrink-0">{industry.icon || '🏢'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-neutral-300">{industry.name}</span>
                            <span className="text-xs text-neutral-500">{industry._count.clients} clients</span>
                          </div>
                          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: industry.color || '#3B82F6' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <h3 className="text-lg font-bold text-white">
                  {editingIndustry ? 'Edit Industry' : 'New Industry'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-1.5">
                    Industry Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. Healthcare, SaaS, E-Commerce"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-neutral-950 border-neutral-800 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-2">
                    Icon (emoji)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DEFAULT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${
                          formData.icon === icon
                            ? 'bg-neutral-700 ring-2 ring-white/20'
                            : 'bg-neutral-800 hover:bg-neutral-700'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type any emoji..."
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="bg-neutral-950 border-neutral-800 text-white"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-500 font-semibold uppercase block mb-2">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${
                          formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : ''
                        }`}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="bg-neutral-950 border-neutral-800 text-white font-mono text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border border-neutral-800"
                  style={{ background: `${formData.color}10` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${formData.color}20`, border: `1px solid ${formData.color}40` }}
                  >
                    {formData.icon || '🏢'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{formData.name || 'Industry name'}</p>
                    <p className="text-xs text-neutral-500">Preview</p>
                  </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
                  <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : editingIndustry ? 'Save Changes' : 'Create Industry'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-xl z-50 ${
              toast.type === 'success'
                ? 'bg-neutral-900 border border-neutral-700 text-white'
                : 'bg-red-950 border border-red-800 text-red-200'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden summary for nav */}
      <div className="hidden" aria-hidden>
        {totalProducts} products tracked
      </div>
    </div>
  );
}
