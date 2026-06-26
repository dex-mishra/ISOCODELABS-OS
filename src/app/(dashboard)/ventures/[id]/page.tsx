'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, X, ExternalLink, Trash2,
  CheckSquare, Video, Layout, Users, Briefcase, Globe,
  GitBranch, FolderOpen, Palette, BookOpen, Link as LinkIcon,
  TrendingUp, Target, DollarSign, Calendar, Edit2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface VentureAsset {
  id: string;
  type: string;
  label: string;
  url: string;
  notes: string | null;
  created_at: string;
}

interface FundingRound {
  id: string;
  round_name: string;
  target_amount: number | null;
  raised_amount: number | null;
  valuation: number | null;
  status: string;
  date: string | null;
  investor_notes: string | null;
  min_users: number | null;
  min_revenue: number | null;
  min_requirements: string | null;
  created_at: string;
}

interface VentureDetail {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  creator: { id: string; name: string; email: string; avatar_url: string | null };
  assets: VentureAsset[];
  funding_rounds: FundingRound[];
  _count: { tasks: number; projects: number; clients: number; meetings: number; business_models: number };
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee?: { id: string; name: string; avatar_url: string | null } | null;
}

interface MeetingItem {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
  duration: number;
}

interface ClientItem {
  id: string;
  name: string;
  email: string;
  company: string | null;
  pipeline_stage: string;
}

interface ProjectItem {
  id: string;
  name: string;
  status: string;
  budget: number | null;
}

interface BusinessModelItem {
  id: string;
  product_name: string;
  version: number;
  updated_at: string;
}

/* ── Constants ──────────────────────────────────────────────────────────── */
const ASSET_ICONS: Record<string, React.ElementType> = {
  GITHUB: GitBranch,
  GDRIVE: FolderOpen,
  FIGMA: Palette,
  NOTION: BookOpen,
  WEBSITE: Globe,
  DOMAIN: Globe,
  OTHER: LinkIcon,
};

const ASSET_TYPES = ['GITHUB', 'GDRIVE', 'FIGMA', 'NOTION', 'WEBSITE', 'DOMAIN', 'OTHER'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  PLANNING: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
  PAUSED: { bg: 'bg-gray-800/50', text: 'text-gray-400' },
  ARCHIVED: { bg: 'bg-red-900/30', text: 'text-red-400' },
};

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PRODUCT: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Product' },
  SISTER_COMPANY: { bg: 'bg-purple-900/30', text: 'text-purple-400', label: 'Sister Company' },
};

const FUNDING_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PLANNING: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
  ACTIVE: { bg: 'bg-emerald-900/30', text: 'text-emerald-400' },
  CLOSED: { bg: 'bg-gray-800/50', text: 'text-gray-400' },
};

const TASK_STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-700 text-gray-200',
  IN_PROGRESS: 'bg-blue-900/40 text-blue-300',
  IN_REVIEW: 'bg-yellow-900/40 text-yellow-300',
  DONE: 'bg-emerald-900/40 text-emerald-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-700 text-gray-300',
  MEDIUM: 'bg-blue-900/40 text-blue-300',
  HIGH: 'bg-orange-900/40 text-orange-300',
  URGENT: 'bg-red-900/40 text-red-300',
};

type TabKey = 'overview' | 'tasks' | 'meetings' | 'business' | 'clients' | 'projects';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Layout },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'meetings', label: 'Meetings', icon: Video },
  { key: 'business', label: 'Business Plans', icon: TrendingUp },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'projects', label: 'Projects', icon: Briefcase },
];


/* ── Page Component ─────────────────────────────────────────────────────── */
export default function VentureDetailPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ventureId = params.id as string;

  // Main data
  const [venture, setVenture] = useState<VentureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Tab data
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [businessModels, setBusinessModels] = useState<BusinessModelItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Asset form
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState({ type: 'GITHUB', label: '', url: '', notes: '' });

  // Funding form
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingForm, setFundingForm] = useState({
    round_name: '', target_amount: '', raised_amount: '', valuation: '',
    status: 'PLANNING', date: '', investor_notes: '', min_users: '',
    min_revenue: '', min_requirements: '',
  });

  // Investor notes expand state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  /* ── Fetch venture ─────────────────────────────────────────────────── */
  const fetchVenture = useCallback(async () => {
    try {
      const res = await authFetch(`/api/ventures/${ventureId}`);
      if (res.ok) setVenture(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, ventureId]);

  useEffect(() => { fetchVenture(); }, [fetchVenture]);

  /* ── Fetch tab data ────────────────────────────────────────────────── */
  const fetchTabData = useCallback(async (tab: TabKey) => {
    if (tab === 'overview') return;
    setTabLoading(true);
    try {
      switch (tab) {
        case 'tasks': {
          const res = await authFetch(`/api/tasks?venture_id=${ventureId}`);
          if (res.ok) setTasks(await res.json());
          break;
        }
        case 'meetings': {
          const res = await authFetch(`/api/meetings?venture_id=${ventureId}`);
          if (res.ok) setMeetings(await res.json());
          break;
        }
        case 'clients': {
          const res = await authFetch(`/api/clients?venture_id=${ventureId}`);
          if (res.ok) {
            const data = await res.json();
            setClients(Array.isArray(data) ? data : data.clients || []);
          }
          break;
        }
        case 'projects': {
          const res = await authFetch(`/api/projects?venture_id=${ventureId}`);
          if (res.ok) setProjects(await res.json());
          break;
        }
        case 'business': {
          const res = await authFetch(`/api/business-model?venture_id=${ventureId}`);
          if (res.ok) setBusinessModels(await res.json());
          break;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTabLoading(false);
    }
  }, [authFetch, ventureId]);

  useEffect(() => { fetchTabData(activeTab); }, [activeTab, fetchTabData]);

  /* ── Add asset ─────────────────────────────────────────────────────── */
  const handleAddAsset = async () => {
    if (!assetForm.label.trim() || !assetForm.url.trim()) return;
    try {
      const res = await authFetch(`/api/ventures/${ventureId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm),
      });
      if (res.ok) {
        setShowAssetForm(false);
        setAssetForm({ type: 'GITHUB', label: '', url: '', notes: '' });
        fetchVenture();
      }
    } catch (e) { console.error(e); }
  };

  /* ── Delete asset ──────────────────────────────────────────────────── */
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await authFetch(`/api/ventures/${ventureId}/assets/${assetId}`, { method: 'DELETE' });
      fetchVenture();
    } catch (e) { console.error(e); }
  };

  /* ── Add funding round ─────────────────────────────────────────────── */
  const handleAddFunding = async () => {
    if (!fundingForm.round_name.trim()) return;
    try {
      const res = await authFetch(`/api/ventures/${ventureId}/funding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_name: fundingForm.round_name,
          target_amount: fundingForm.target_amount || undefined,
          raised_amount: fundingForm.raised_amount || undefined,
          valuation: fundingForm.valuation || undefined,
          status: fundingForm.status,
          date: fundingForm.date || undefined,
          investor_notes: fundingForm.investor_notes || undefined,
          min_users: fundingForm.min_users || undefined,
          min_revenue: fundingForm.min_revenue || undefined,
          min_requirements: fundingForm.min_requirements || undefined,
        }),
      });
      if (res.ok) {
        setShowFundingModal(false);
        setFundingForm({ round_name: '', target_amount: '', raised_amount: '', valuation: '', status: 'PLANNING', date: '', investor_notes: '', min_users: '', min_revenue: '', min_requirements: '' });
        fetchVenture();
      }
    } catch (e) { console.error(e); }
  };

  /* ── Delete funding round ──────────────────────────────────────────── */
  const handleDeleteFunding = async (roundId: string) => {
    if (!confirm('Delete this funding round?')) return;
    try {
      await authFetch(`/api/ventures/${ventureId}/funding/${roundId}`, { method: 'DELETE' });
      fetchVenture();
    } catch (e) { console.error(e); }
  };

  /* ── Currency formatter ────────────────────────────────────────────── */
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  /* ── Loading ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!venture) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-white">Venture not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/ventures')}>
          <ArrowLeft size={15} className="mr-1.5" /> Back to Ventures
        </Button>
      </div>
    );
  }

  const typeConfig = TYPE_COLORS[venture.type] || TYPE_COLORS.PRODUCT;
  const statusConfig = STATUS_COLORS[venture.status] || STATUS_COLORS.ACTIVE;


  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/ventures')} className="p-2 rounded-xl hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={18} className="text-neutral-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">{venture.name}</h1>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
              {typeConfig.label}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.text}`}>
              {venture.status}
            </span>
          </div>
          {venture.description && (
            <p className="text-sm text-neutral-400 mt-1">{venture.description}</p>
          )}
          {venture.website && (
            <a href={venture.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1">
              <Globe size={12} /> {venture.website}
            </a>
          )}
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-neutral-900/60 border border-neutral-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Assets Section */}
          <Card className="bg-neutral-900/40 border-neutral-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white flex items-center gap-2">
                  <LinkIcon size={16} className="text-blue-400" /> Assets
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowAssetForm(!showAssetForm)}>
                  <Plus size={14} className="mr-1" /> Add Asset
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Inline add form */}
              <AnimatePresence>
                {showAssetForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                    <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select
                          value={assetForm.type}
                          onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                          className="bg-neutral-900 border border-neutral-700 text-sm text-neutral-200 rounded-lg px-3 py-2 outline-none"
                        >
                          {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <Input placeholder="Label" value={assetForm.label} onChange={(e) => setAssetForm({ ...assetForm, label: e.target.value })} />
                        <Input placeholder="URL" value={assetForm.url} onChange={(e) => setAssetForm({ ...assetForm, url: e.target.value })} />
                        <Input placeholder="Notes (optional)" value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleAddAsset}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowAssetForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {venture.assets.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">No assets added yet</p>
              ) : (
                <div className="space-y-2">
                  {venture.assets.map(asset => {
                    const Icon = ASSET_ICONS[asset.type] || LinkIcon;
                    return (
                      <div key={asset.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors group">
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                          <Icon size={14} className="text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{asset.label}</span>
                            <Badge variant="secondary" className="text-[10px]">{asset.type}</Badge>
                          </div>
                          {asset.notes && <p className="text-[11px] text-neutral-500 truncate">{asset.notes}</p>}
                        </div>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-neutral-800">
                          <ExternalLink size={14} />
                        </a>
                        <button onClick={() => handleDeleteAsset(asset.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-900/30 text-neutral-500 hover:text-red-400 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funding Dashboard */}
          <Card className="bg-neutral-900/40 border-neutral-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-400" /> Funding Rounds
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowFundingModal(true)}>
                  <Plus size={14} className="mr-1" /> Add Round
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {venture.funding_rounds.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-6">No funding rounds yet</p>
              ) : (
                <div className="space-y-4">
                  {venture.funding_rounds.map(round => {
                    const fsConfig = FUNDING_STATUS_COLORS[round.status] || FUNDING_STATUS_COLORS.PLANNING;
                    const progress = round.target_amount && round.raised_amount
                      ? Math.min(100, (round.raised_amount / round.target_amount) * 100)
                      : 0;
                    const isExpanded = expandedNotes.has(round.id);

                    return (
                      <div key={round.id} className="border border-neutral-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{round.round_name}</h4>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${fsConfig.bg} ${fsConfig.text}`}>
                              {round.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {round.date && (
                              <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                                <Calendar size={11} /> {new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                            <button onClick={() => handleDeleteFunding(round.id)} className="p-1 rounded hover:bg-red-900/30 text-neutral-500 hover:text-red-400">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          {round.target_amount && (
                            <div>
                              <span className="text-neutral-500">Target</span>
                              <p className="text-white font-semibold">{fmt(round.target_amount)}</p>
                            </div>
                          )}
                          {round.raised_amount !== null && (
                            <div>
                              <span className="text-neutral-500">Raised</span>
                              <p className="text-emerald-400 font-semibold">{fmt(round.raised_amount)}</p>
                            </div>
                          )}
                          {round.valuation && (
                            <div>
                              <span className="text-neutral-500">Valuation</span>
                              <p className="text-blue-400 font-semibold">{fmt(round.valuation)}</p>
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        {round.target_amount && round.raised_amount !== null && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-neutral-500">
                              <span>Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Min requirements */}
                        {(round.min_users || round.min_revenue || round.min_requirements) && (
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            {round.min_users && (
                              <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Min Users: {round.min_users}</span>
                            )}
                            {round.min_revenue && (
                              <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">Min Revenue: {fmt(round.min_revenue)}</span>
                            )}
                            {round.min_requirements && (
                              <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded">{round.min_requirements}</span>
                            )}
                          </div>
                        )}

                        {/* Investor notes */}
                        {round.investor_notes && (
                          <div>
                            <button
                              onClick={() => {
                                const next = new Set(expandedNotes);
                                isExpanded ? next.delete(round.id) : next.add(round.id);
                                setExpandedNotes(next);
                              }}
                              className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              Investor Notes
                            </button>
                            {isExpanded && (
                              <p className="text-xs text-neutral-400 mt-1 pl-4 border-l border-neutral-700 whitespace-pre-wrap">
                                {round.investor_notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {/* ── Tasks Tab ───────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <Card className="bg-neutral-900/40 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <CheckSquare size={16} className="text-blue-400" /> Tasks
              </span>
              <Button variant="primary" size="sm" onClick={() => router.push(`/tasks`)}>
                <Plus size={14} className="mr-1" /> Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No tasks linked to this venture</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${TASK_STATUS_COLORS[task.status] || ''}`}>{task.status.replace('_', ' ')}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
                        {task.due_date && (
                          <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                            <Calendar size={10} /> {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.assignee && (
                      <Avatar src={task.assignee.avatar_url || ''} name={task.assignee.name} size="sm" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Meetings Tab ────────────────────────────────────────────── */}
      {activeTab === 'meetings' && (
        <Card className="bg-neutral-900/40 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <Video size={16} className="text-purple-400" /> Meetings
              </span>
              <Button variant="primary" size="sm" onClick={() => router.push('/meetings')}>
                <Plus size={14} className="mr-1" /> Schedule Meeting
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No meetings linked to this venture</p>
            ) : (
              <div className="space-y-2">
                {meetings.map(meeting => (
                  <div key={meeting.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center">
                      <Video size={14} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{meeting.title}</p>
                      <span className="text-[11px] text-neutral-500">
                        {new Date(meeting.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{meeting.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Business Plans Tab ──────────────────────────────────────── */}
      {activeTab === 'business' && (
        <Card className="bg-neutral-900/40 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-green-400" /> Business Plans
              </span>
              <Button variant="primary" size="sm" onClick={() => router.push('/business-model')}>
                <Plus size={14} className="mr-1" /> Create Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : businessModels.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No business models linked to this venture</p>
            ) : (
              <div className="space-y-2">
                {businessModels.map(bm => (
                  <div key={bm.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer" onClick={() => router.push('/business-model')}>
                    <div className="w-8 h-8 rounded-lg bg-green-900/30 flex items-center justify-center">
                      <TrendingUp size={14} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{bm.product_name}</p>
                      <span className="text-[11px] text-neutral-500">v{bm.version} · Updated {new Date(bm.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Clients Tab ─────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <Card className="bg-neutral-900/40 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <Users size={16} className="text-orange-400" /> Clients
              </span>
              <Button variant="primary" size="sm" onClick={() => router.push('/clients')}>
                <Plus size={14} className="mr-1" /> Add Client
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : clients.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No clients linked to this venture</p>
            ) : (
              <div className="space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
                    <div className="w-8 h-8 rounded-lg bg-orange-900/30 flex items-center justify-center">
                      <Users size={14} className="text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{client.name}</p>
                      <span className="text-[11px] text-neutral-500">{client.company || client.email}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{client.pipeline_stage}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Projects Tab ────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <Card className="bg-neutral-900/40 border-neutral-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white flex items-center gap-2">
                <Briefcase size={16} className="text-cyan-400" /> Projects
              </span>
              <Button variant="primary" size="sm" onClick={() => router.push('/projects')}>
                <Plus size={14} className="mr-1" /> Add Project
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tabLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">No projects linked to this venture</p>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-cyan-900/30 flex items-center justify-center">
                      <Briefcase size={14} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{project.name}</p>
                      <span className="text-[11px] text-neutral-500">{project.status}</span>
                    </div>
                    {project.budget && (
                      <span className="text-xs text-neutral-400">{fmt(project.budget)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* ── Funding Round Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showFundingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFundingModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Add Funding Round</h2>
                <button onClick={() => setShowFundingModal(false)} className="p-1.5 rounded-lg hover:bg-neutral-800">
                  <X size={18} className="text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">Round Name *</label>
                  <Input value={fundingForm.round_name} onChange={(e) => setFundingForm({ ...fundingForm, round_name: e.target.value })} placeholder="e.g., Pre-seed, Seed, Series A" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Target Amount</label>
                    <Input type="number" value={fundingForm.target_amount} onChange={(e) => setFundingForm({ ...fundingForm, target_amount: e.target.value })} placeholder="₹0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Raised Amount</label>
                    <Input type="number" value={fundingForm.raised_amount} onChange={(e) => setFundingForm({ ...fundingForm, raised_amount: e.target.value })} placeholder="₹0" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Valuation</label>
                    <Input type="number" value={fundingForm.valuation} onChange={(e) => setFundingForm({ ...fundingForm, valuation: e.target.value })} placeholder="₹0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Status</label>
                    <select
                      value={fundingForm.status}
                      onChange={(e) => setFundingForm({ ...fundingForm, status: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 rounded-xl px-3 py-2 outline-none"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">Date</label>
                  <Input type="date" value={fundingForm.date} onChange={(e) => setFundingForm({ ...fundingForm, date: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Min Users</label>
                    <Input type="number" value={fundingForm.min_users} onChange={(e) => setFundingForm({ ...fundingForm, min_users: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-400 mb-1 block">Min Revenue</label>
                    <Input type="number" value={fundingForm.min_revenue} onChange={(e) => setFundingForm({ ...fundingForm, min_revenue: e.target.value })} placeholder="₹0" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">Other Requirements</label>
                  <Input value={fundingForm.min_requirements} onChange={(e) => setFundingForm({ ...fundingForm, min_requirements: e.target.value })} placeholder="e.g., MVP launched, 100 beta users" />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-1 block">Investor Notes</label>
                  <textarea
                    value={fundingForm.investor_notes}
                    onChange={(e) => setFundingForm({ ...fundingForm, investor_notes: e.target.value })}
                    placeholder="Notes about potential investors, conversations..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowFundingModal(false)} className="flex-1">Cancel</Button>
                  <Button type="button" variant="primary" onClick={handleAddFunding} className="flex-1">Add Round</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
