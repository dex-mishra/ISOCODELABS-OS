'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout,
  Plus,
  Save,
  GitBranch,
  Clock,
  Trash2,
  X,
  ChevronDown,
  Building2,
  FileText,
  Handshake,
  Activity,
  Package,
  Heart,
  Megaphone,
  Users,
  Coins,
  TrendingUp,
  Sparkles,
  History,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface CanvasData {
  key_partners: string;
  key_activities: string;
  key_resources: string;
  value_propositions: string;
  customer_relationships: string;
  channels: string;
  customer_segments: string;
  cost_structure: string;
  revenue_streams: string;
}

interface Industry {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface BusinessModel {
  id: string;
  product_name: string;
  industry_id: string | null;
  industry: Industry | null;
  canvas_data: CanvasData;
  architecture_notes: string | null;
  revenue_model: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CANVAS: CanvasData = {
  key_partners: '',
  key_activities: '',
  key_resources: '',
  value_propositions: '',
  customer_relationships: '',
  channels: '',
  customer_segments: '',
  cost_structure: '',
  revenue_streams: '',
};

const CANVAS_BLOCKS: {
  key: keyof CanvasData;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}[] = [
  { key: 'key_partners', label: 'Key Partners', icon: Handshake, color: '#8B5CF6', description: 'Who are your key partners and suppliers?' },
  { key: 'key_activities', label: 'Key Activities', icon: Activity, color: '#3B82F6', description: 'What key activities does your value proposition require?' },
  { key: 'value_propositions', label: 'Value Propositions', icon: Sparkles, color: '#F59E0B', description: 'What value do you deliver to customers?' },
  { key: 'customer_relationships', label: 'Customer Relationships', icon: Heart, color: '#EC4899', description: 'What type of relationship does each segment expect?' },
  { key: 'customer_segments', label: 'Customer Segments', icon: Users, color: '#10B981', description: 'Who are your most important customers?' },
  { key: 'key_resources', label: 'Key Resources', icon: Package, color: '#6366F1', description: 'What key resources does your value proposition require?' },
  { key: 'channels', label: 'Channels', icon: Megaphone, color: '#F97316', description: 'Through which channels do your segments want to be reached?' },
  { key: 'cost_structure', label: 'Cost Structure', icon: Coins, color: '#EF4444', description: 'What are the most important costs in your business model?' },
  { key: 'revenue_streams', label: 'Revenue Streams', icon: TrendingUp, color: '#22C55E', description: 'For what value are customers willing to pay?' },
];

/* ── Page Component ─────────────────────────────────────────────────────── */
export default function BusinessModelPage() {
  const { authFetch } = useAuth();

  // Data
  const [models, setModels] = useState<BusinessModel[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedModel, setSelectedModel] = useState<BusinessModel | null>(null);
  const [allVersions, setAllVersions] = useState<BusinessModel[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [editingBlock, setEditingBlock] = useState<keyof CanvasData | null>(null);

  // Form data for editing
  const [editCanvas, setEditCanvas] = useState<CanvasData>(DEFAULT_CANVAS);
  const [editArchNotes, setEditArchNotes] = useState('');
  const [editRevModel, setEditRevModel] = useState('');

  // Create form
  const [newProductName, setNewProductName] = useState('');
  const [newIndustryId, setNewIndustryId] = useState('');
  const [newVentureId, setNewVentureId] = useState('');
  const [ventures, setVentures] = useState<{ id: string; name: string }[]>([]);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const fetchModels = useCallback(async () => {
    try {
      const res = await authFetch('/api/business-model');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        if (data.length > 0 && !selectedModel) {
          selectModel(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch business models', e);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchIndustries = useCallback(async () => {
    try {
      const res = await authFetch('/api/industries');
      if (res.ok) setIndustries(await res.json());
    } catch (e) {
      console.error('Failed to fetch industries', e);
    }
  }, [authFetch]);

  const fetchVentures = useCallback(async () => {
    try {
      const res = await authFetch('/api/ventures');
      if (res.ok) setVentures(await res.json());
    } catch (e) {
      console.error('Failed to fetch ventures', e);
    }
  }, [authFetch]);

  const fetchVersions = useCallback(async (productName: string) => {
    try {
      const res = await authFetch(`/api/business-model?product_name=${encodeURIComponent(productName)}`);
      if (res.ok) setAllVersions(await res.json());
    } catch (e) {
      console.error('Failed to fetch versions', e);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchModels();
    fetchIndustries();
    fetchVentures();
  }, [fetchModels, fetchIndustries, fetchVentures]);

  /* ── Select a model ────────────────────────────────────────────────── */
  const selectModel = (model: BusinessModel) => {
    setSelectedModel(model);
    const canvas = (model.canvas_data as CanvasData) || DEFAULT_CANVAS;
    setEditCanvas({ ...DEFAULT_CANVAS, ...canvas });
    setEditArchNotes(model.architecture_notes || '');
    setEditRevModel(model.revenue_model || '');
    setIsDirty(false);
    setEditingBlock(null);
    fetchVersions(model.product_name);
  };

  /* ── Create new model ──────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newProductName.trim()) return;
    try {
      const res = await authFetch('/api/business-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: newProductName.trim(),
          industry_id: newIndustryId || undefined,
          venture_id: newVentureId || undefined,
          canvas_data: DEFAULT_CANVAS,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowCreateModal(false);
        setNewProductName('');
        setNewIndustryId('');
        setNewVentureId('');
        await fetchModels();
        selectModel(created);
      }
    } catch (e) {
      console.error('Failed to create model', e);
    }
  };

  /* ── Save canvas edits ─────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedModel) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/business-model/${selectedModel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_data: editCanvas,
          architecture_notes: editArchNotes,
          revenue_model: editRevModel,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedModel(updated);
        setIsDirty(false);
        fetchModels();
      }
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(false);
    }
  };

  /* ── Branch new version ────────────────────────────────────────────── */
  const handleBranchVersion = async () => {
    if (!selectedModel) return;
    try {
      const res = await authFetch('/api/business-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: selectedModel.product_name,
          industry_id: selectedModel.industry_id,
          canvas_data: editCanvas,
          architecture_notes: editArchNotes,
          revenue_model: editRevModel,
        }),
      });
      if (res.ok) {
        const newVersion = await res.json();
        await fetchModels();
        selectModel(newVersion);
      }
    } catch (e) {
      console.error('Failed to branch version', e);
    }
  };

  /* ── Delete model ──────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this version?')) return;
    try {
      await authFetch(`/api/business-model/${id}`, { method: 'DELETE' });
      if (selectedModel?.id === id) {
        setSelectedModel(null);
        setEditCanvas(DEFAULT_CANVAS);
      }
      fetchModels();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  /* ── Update canvas block ───────────────────────────────────────────── */
  const updateBlock = (key: keyof CanvasData, value: string) => {
    setEditCanvas(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  /* ── Loading Skeleton ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 max-w-[1600px] mx-auto"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Layout className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Business Model Canvas</h1>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              {models.length} product{models.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && selectedModel && (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={15} className="mr-1.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
          {selectedModel && (
            <Button variant="outline" onClick={handleBranchVersion}>
              <GitBranch size={15} className="mr-1.5" />
              New Version
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={15} className="mr-1.5" />
            New Product
          </Button>
        </div>
      </div>

      {/* ── Product Selector Bar ────────────────────────────────────── */}
      {models.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => selectModel(m)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selectedModel?.id === m.id
                  ? 'bg-apple-blue text-white border-apple-blue shadow-apple-sm'
                  : 'bg-card border-border text-foreground hover:border-apple-blue/50 hover:shadow-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                {m.industry?.icon && <span>{m.industry.icon}</span>}
                {m.product_name}
                <Badge variant="default" className="text-[10px] ml-1">v{m.version}</Badge>
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowVersionPanel(!showVersionPanel)}
            className="px-3 py-2 rounded-xl text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark border border-border transition-all"
          >
            <History size={14} className="inline mr-1" />
            Versions
          </button>
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {!selectedModel && models.length === 0 && (
        <Card>
          <CardContent className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
              <Layout className="text-purple-500" size={28} />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Business Models Yet</h3>
            <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-6 max-w-md mx-auto">
              Create your first Business Model Canvas to map out your product strategy,
              value propositions, and revenue streams.
            </p>
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} className="mr-1.5" />
              Create Your First Canvas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── BMC 9-Block Grid ────────────────────────────────────────── */}
      {selectedModel && (
        <div className="space-y-6">
          {/* BMC Grid — Uses the classic Business Model Canvas layout */}
          <div className="grid grid-cols-10 gap-3 auto-rows-min">
            {/* Row 1: Key Partners | Key Activities + Key Resources | Value Props | Cust Rel + Channels | Cust Segments */}
            {/* Key Partners — spans rows 1-2, cols 1-2 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[0]}
              value={editCanvas.key_partners}
              onChange={(v) => updateBlock('key_partners', v)}
              isEditing={editingBlock === 'key_partners'}
              onStartEdit={() => setEditingBlock('key_partners')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2 row-span-2"
            />
            {/* Key Activities — row 1, cols 3-4 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[1]}
              value={editCanvas.key_activities}
              onChange={(v) => updateBlock('key_activities', v)}
              isEditing={editingBlock === 'key_activities'}
              onStartEdit={() => setEditingBlock('key_activities')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2"
            />
            {/* Value Propositions — spans rows 1-2, cols 5-6 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[2]}
              value={editCanvas.value_propositions}
              onChange={(v) => updateBlock('value_propositions', v)}
              isEditing={editingBlock === 'value_propositions'}
              onStartEdit={() => setEditingBlock('value_propositions')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2 row-span-2"
            />
            {/* Customer Relationships — row 1, cols 7-8 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[3]}
              value={editCanvas.customer_relationships}
              onChange={(v) => updateBlock('customer_relationships', v)}
              isEditing={editingBlock === 'customer_relationships'}
              onStartEdit={() => setEditingBlock('customer_relationships')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2"
            />
            {/* Customer Segments — spans rows 1-2, cols 9-10 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[4]}
              value={editCanvas.customer_segments}
              onChange={(v) => updateBlock('customer_segments', v)}
              isEditing={editingBlock === 'customer_segments'}
              onStartEdit={() => setEditingBlock('customer_segments')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2 row-span-2"
            />
            {/* Key Resources — row 2, cols 3-4 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[5]}
              value={editCanvas.key_resources}
              onChange={(v) => updateBlock('key_resources', v)}
              isEditing={editingBlock === 'key_resources'}
              onStartEdit={() => setEditingBlock('key_resources')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2"
            />
            {/* Channels — row 2, cols 7-8 */}
            <CanvasBlock
              block={CANVAS_BLOCKS[6]}
              value={editCanvas.channels}
              onChange={(v) => updateBlock('channels', v)}
              isEditing={editingBlock === 'channels'}
              onStartEdit={() => setEditingBlock('channels')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-2"
            />
            {/* Row 3: Cost Structure | Revenue Streams */}
            <CanvasBlock
              block={CANVAS_BLOCKS[7]}
              value={editCanvas.cost_structure}
              onChange={(v) => updateBlock('cost_structure', v)}
              isEditing={editingBlock === 'cost_structure'}
              onStartEdit={() => setEditingBlock('cost_structure')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-5"
            />
            <CanvasBlock
              block={CANVAS_BLOCKS[8]}
              value={editCanvas.revenue_streams}
              onChange={(v) => updateBlock('revenue_streams', v)}
              isEditing={editingBlock === 'revenue_streams'}
              onStartEdit={() => setEditingBlock('revenue_streams')}
              onStopEdit={() => setEditingBlock(null)}
              className="col-span-5"
            />
          </div>

          {/* ── Metadata Panels ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="font-semibold text-sm">Revenue Model</span>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={editRevModel}
                  onChange={(e) => { setEditRevModel(e.target.value); setIsDirty(true); }}
                  placeholder="Describe your revenue model — subscription, one-time, freemium, licensing…"
                  className="w-full h-28 p-3 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  <span className="font-semibold text-sm">Architecture Notes</span>
                </div>
              </CardHeader>
              <CardContent>
                <textarea
                  value={editArchNotes}
                  onChange={(e) => { setEditArchNotes(e.target.value); setIsDirty(true); }}
                  placeholder="Technical architecture, tech stack, deployment notes…"
                  className="w-full h-28 p-3 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30 resize-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Version Timeline Panel ──────────────────────────────────── */}
      <AnimatePresence>
        {showVersionPanel && selectedModel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-purple-500" />
                    <span className="font-semibold text-sm">Version History — {selectedModel.product_name}</span>
                  </div>
                  <button onClick={() => setShowVersionPanel(false)}>
                    <X size={16} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allVersions.map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedModel.id === v.id
                          ? 'border-apple-blue bg-apple-blue/5'
                          : 'border-border hover:border-apple-blue/30'
                      }`}
                      onClick={() => selectModel(v)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-600/20 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                          v{v.version}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{v.product_name}</p>
                          <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                            {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedModel.id === v.id && <Badge variant="default">Current</Badge>}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sf-text-secondaryLight hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">New Business Model</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1.5">Product Name *</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g., Adex Platform"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1.5">Industry</label>
                  <select
                    value={newIndustryId}
                    onChange={(e) => setNewIndustryId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                  >
                    <option value="">Select industry…</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.icon} {ind.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1.5">Venture</label>
                  <select
                    value={newVentureId}
                    onChange={(e) => setNewVentureId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                  >
                    <option value="">None</option>
                    {ventures.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreate} disabled={!newProductName.trim()}>
                  <Plus size={15} className="mr-1" />
                  Create Canvas
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Canvas Block Component ─────────────────────────────────────────── */
function CanvasBlock({
  block,
  value,
  onChange,
  isEditing,
  onStartEdit,
  onStopEdit,
  className = '',
}: {
  block: typeof CANVAS_BLOCKS[0];
  value: string;
  onChange: (v: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  className?: string;
}) {
  const Icon = block.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={`relative group rounded-2xl border border-border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden ${className}`}
      onClick={() => !isEditing && onStartEdit()}
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: block.color }} />

      <div className="p-4 pt-4 h-full flex flex-col min-h-[140px]">
        {/* Block header */}
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${block.color}20` }}
          >
            <Icon size={13} style={{ color: block.color }} />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: block.color }}>
            {block.label}
          </span>
        </div>

        {/* Content */}
        {isEditing ? (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={(e) => { if (e.key === 'Escape') onStopEdit(); }}
            placeholder={block.description}
            className="flex-1 w-full text-xs leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-sf-text-secondaryLight/50 dark:placeholder:text-sf-text-secondaryDark/50"
          />
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {value ? (
              <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{value}</p>
            ) : (
              <p className="text-xs text-sf-text-secondaryLight/50 dark:text-sf-text-secondaryDark/50 italic">
                {block.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hover overlay */}
      {!isEditing && (
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-apple-blue/20 transition-colors pointer-events-none" />
      )}
    </motion.div>
  );
}
