'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  X,
  Rocket,
  Users,
  Briefcase,
  CheckSquare,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

interface Venture {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  creator: { id: string; name: string; email: string; avatar_url: string | null };
  _count: {
    tasks: number;
    projects: number;
    clients: number;
    meetings: number;
    assets: number;
    funding_rounds: number;
  };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  PLANNING: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  PAUSED: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  ARCHIVED: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PRODUCT: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Product' },
  SISTER_COMPANY: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Sister Company' },
};

export default function VenturesPage() {
  const { authFetch } = useAuth();
  const router = useRouter();

  const [ventures, setVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'PRODUCT',
    status: 'ACTIVE',
    website: '',
  });

  const fetchVentures = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await authFetch(`/api/ventures?${params.toString()}`);
      if (res.ok) setVentures(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchVentures();
  }, [fetchVentures]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/ventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          type: form.type,
          status: form.status,
          website: form.website || undefined,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: '', description: '', type: 'PRODUCT', status: 'ACTIVE', website: '' });
        fetchVentures();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Rocket className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventures</h1>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Products &amp; sister companies under Isocodelabs
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <Plus size={15} className="mr-1.5" />
          Create Venture
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
          <Input
            placeholder="Search ventures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-card border border-border text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue"
          >
            <option value="ALL">All Types</option>
            <option value="PRODUCT">Product</option>
            <option value="SISTER_COMPANY">Sister Company</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border border-border text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Ventures Grid */}
      {ventures.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-2xl bg-card">
          <Rocket size={40} className="mx-auto mb-3 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark opacity-40" />
          <h3 className="text-lg font-semibold">No ventures yet</h3>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Create your first product or sister company
          </p>
          <Button variant="primary" className="mt-4" onClick={() => setShowModal(true)}>
            <Plus size={15} className="mr-1.5" />
            Create Venture
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ventures.map((venture) => {
            const typeConfig = TYPE_COLORS[venture.type] || TYPE_COLORS.PRODUCT;
            const statusConfig = STATUS_COLORS[venture.status] || STATUS_COLORS.ACTIVE;

            return (
              <motion.div
                key={venture.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2 }}
                onClick={() => router.push(`/ventures/${venture.id}`)}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-apple-blue/40 hover:shadow-lg transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-border">
                      <Building2 size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold group-hover:text-apple-blue transition-colors">{venture.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
                          {typeConfig.label}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
                          {venture.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {venture.description && (
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark line-clamp-2 mb-4">
                    {venture.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark border-t border-border pt-3">
                  <span className="flex items-center gap-1">
                    <CheckSquare size={12} />
                    {venture._count.tasks} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} />
                    {venture._count.projects} projects
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {venture._count.clients} clients
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Venture Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Create Venture</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1 block">Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., CVBuddy"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1 block">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description of the venture..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-apple-blue resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1 block">Type *</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-card border border-border text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue"
                    >
                      <option value="PRODUCT">Product (Child)</option>
                      <option value="SISTER_COMPANY">Sister Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1 block">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-card border border-border text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PLANNING">Planning</option>
                      <option value="PAUSED">Paused</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1 block">Website</label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
                    {submitting ? 'Creating...' : 'Create Venture'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
