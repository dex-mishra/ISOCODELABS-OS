'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import {
  Mail, Phone, Building2, X, ChevronLeft, Sparkles,
  MessageSquare, ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2,
  Clock, Zap, RefreshCw, Plus, Link as LinkIcon, Scale, IndianRupee,
} from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';


// ─── Types ────────────────────────────────────────────────────────────────────

type PipelineStage = 'LEAD' | 'CONTACTED' | 'PROPOSAL' | 'NEGOTIATION' | 'ACTIVE' | 'CHURNED';
type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
type CommsSource = 'GMAIL' | 'WHATSAPP' | 'MANUAL';
type CommsDirection = 'INBOUND' | 'OUTBOUND';

interface CommunicationLog {
  id: string;
  source: CommsSource;
  direction: CommsDirection;
  subject: string | null;
  body: string;
  sender_email: string | null;
  sender_phone: string | null;
  received_at: string;
  sentiment: SentimentType;
  flagged_as_change_request: boolean;
  action_items: string[];
}

interface Interaction {
  id: string;
  type: string;
  summary: string;
  details: string | null;
  date: string;
  creator: { id: string; name: string; avatar_url: string | null };
}

interface ClientInsight {
  id: string;
  type: string;
  timeframe_start: string;
  timeframe_end: string;
  summary: string;
  key_topics: string[];
  sentiment_overview: SentimentType;
  action_items: string[];
  change_requests: string[];
  email_count: number;
  whatsapp_count: number;
  manual_log_count: number;
  created_at: string;
}

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  pipeline_stage: PipelineStage;
  source: string | null;
  value: number | null;
  notes: string | null;
  connected_gmail: boolean;
  connected_whatsapp: boolean;
  last_communication_at: string | null;
  created_at: string;
  communication_logs: CommunicationLog[];
  interactions: Interaction[];
  client_insights: ClientInsight[];
  projects: Array<{ id: string; name: string; status: string }>;
  transactions: Array<{ id: string; amount: number; type: 'INCOME' | 'EXPENSE'; category: string; date: string; description: string | null }>;
  invoices: Array<{ id: string; invoice_number: string; amount: number; total: number; status: string; issue_date: string }>;
  industry: { id: string; name: string } | null;
}

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<PipelineStage, {
  label: string;
  color: string;
  bg: string;
  badge: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  step: number;
}> = {
  LEAD: { label: 'Lead', color: 'text-sky-400', bg: 'bg-sky-500', badge: 'default', step: 0 },
  CONTACTED: { label: 'Contacted', color: 'text-violet-400', bg: 'bg-violet-500', badge: 'secondary', step: 1 },
  PROPOSAL: { label: 'Proposal', color: 'text-amber-400', bg: 'bg-amber-500', badge: 'warning', step: 2 },
  NEGOTIATION: { label: 'Negotiation', color: 'text-orange-400', bg: 'bg-orange-500', badge: 'warning', step: 3 },
  ACTIVE: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500', badge: 'success', step: 4 },
  CHURNED: { label: 'Churned', color: 'text-red-400', bg: 'bg-red-500', badge: 'danger', step: -1 },
};

const PIPELINE_ORDER: PipelineStage[] = ['LEAD', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'ACTIVE'];

const SOURCE_CONFIG: Record<CommsSource, { label: string; color: string; bg: string; icon: string }> = {
  GMAIL: { label: 'Gmail', color: 'text-red-400', bg: 'bg-red-900/30 border-red-800/30', icon: '✉' },
  WHATSAPP: { label: 'WhatsApp', color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/30', icon: '💬' },
  MANUAL: { label: 'Manual', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/30', icon: '📝' },
};

const SENTIMENT_CONFIG: Record<SentimentType, { label: string; color: string; bg: string }> = {
  POSITIVE: { label: 'Positive', color: 'text-green-400', bg: 'bg-green-900/30 border border-green-700/30' },
  NEUTRAL: { label: 'Neutral', color: 'text-neutral-400', bg: 'bg-neutral-800 border border-neutral-700' },
  NEGATIVE: { label: 'Negative', color: 'text-red-400', bg: 'bg-red-900/30 border border-red-700/30' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const params = useParams();
  const clientId = (params?.id ?? '') as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Linked legal documents
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  // Timeline state
  const [timeline, setTimeline] = useState<CommunicationLog[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineRange, setTimelineRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [fetchedTimeline, setFetchedTimeline] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<{ gmail_not_connected?: boolean; whatsapp_not_connected?: boolean } | null>(null);

  // Insights state
  const [activeInsight, setActiveInsight] = useState<ClientInsight | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [showInsightsHistory, setShowInsightsHistory] = useState(false);

  // Modals
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [gmailInput, setGmailInput] = useState('');
  const [waInput, setWaInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const [logDirection, setLogDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [logSubject, setLogSubject] = useState('');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [interactionType, setInteractionType] = useState('NOTE');
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [connectingWa, setConnectingWa] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/clients/${clientId}`);
      if (!res.ok) { router.push('/clients'); return; }
      const data: ClientDetail = await res.json();
      setClient(data);
      setTimeline(data.communication_logs.slice(0, 20));

      // Fetch linked legal documents
      setDocsLoading(true);
      const docsRes = await authFetch(`/api/legal?client_id=${clientId}`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setLinkedDocs(docsData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setDocsLoading(false);
    }
  }, [authFetch, clientId, router]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  // Fetch timeline for date range
  const fetchTimeline = async () => {
    setTimelineLoading(true);
    setFetchedTimeline(false);
    try {
      let startDate: string;
      let endDate = new Date().toISOString();

      if (timelineRange === '7d') startDate = subDays(new Date(), 7).toISOString();
      else if (timelineRange === '30d') startDate = subDays(new Date(), 30).toISOString();
      else {
        startDate = customStart ? new Date(customStart).toISOString() : subDays(new Date(), 7).toISOString();
        endDate = customEnd ? new Date(customEnd).toISOString() : endDate;
      }

      const res = await authFetch(`/api/clients/${clientId}/communications/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (res.ok) {
        const data = await res.json();
        setTimeline(data.logs || []);
        setFetchedMeta(data.fetched || null);
        setFetchedTimeline(true);
      } else {
        showToast('Failed to fetch communications', 'error');
      }
    } catch {
      showToast('Failed to fetch communications', 'error');
    } finally {
      setTimelineLoading(false);
    }
  };

  // Connect Gmail
  const handleConnectGmail = async () => {
    if (!gmailInput.trim()) return;
    setConnectingGmail(true);
    try {
      const res = await authFetch(`/api/clients/${clientId}/connect-gmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gmailInput.trim() }),
      });
      if (res.ok) {
        showToast('Gmail connected!');
        setIsGmailModalOpen(false);
        setGmailInput('');
        fetchClient();
      } else {
        showToast('Failed to connect Gmail', 'error');
      }
    } finally { setConnectingGmail(false); }
  };

  const handleDisconnectGmail = async () => {
    await authFetch(`/api/clients/${clientId}/disconnect-gmail`, { method: 'POST' });
    showToast('Gmail disconnected');
    fetchClient();
  };

  // Connect WhatsApp
  const handleConnectWa = async () => {
    if (!waInput.trim()) return;
    setConnectingWa(true);
    try {
      const res = await authFetch(`/api/clients/${clientId}/connect-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waInput.trim() }),
      });
      if (res.ok) {
        showToast('WhatsApp connected!');
        setIsWaModalOpen(false);
        setWaInput('');
        fetchClient();
      } else {
        showToast('Failed to connect WhatsApp', 'error');
      }
    } finally { setConnectingWa(false); }
  };

  const handleDisconnectWa = async () => {
    await authFetch(`/api/clients/${clientId}/disconnect-whatsapp`, { method: 'POST' });
    showToast('WhatsApp disconnected');
    fetchClient();
  };

  // Add manual log
  const handleAddLog = async () => {
    if (!logInput.trim()) return;
    setSubmittingLog(true);
    try {
      const res = await authFetch(`/api/clients/${clientId}/communications/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: logInput, direction: logDirection, subject: logSubject || null }),
      });
      if (res.ok) {
        const newLog = await res.json();
        setTimeline((prev) => [newLog, ...prev]);
        showToast('Log added!');
        setIsLogModalOpen(false);
        setLogInput(''); setLogSubject('');
      } else {
        showToast('Failed to add log', 'error');
      }
    } finally { setSubmittingLog(false); }
  };

  // Add interaction
  const handleAddInteraction = async () => {
    if (!interactionSummary.trim()) return;
    setSubmittingInteraction(true);
    try {
      const res = await authFetch(`/api/clients/${clientId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: interactionType, summary: interactionSummary }),
      });
      if (res.ok) {
        showToast('Interaction logged!');
        setIsInteractionModalOpen(false);
        setInteractionSummary('');
        fetchClient();
      } else {
        showToast('Failed to add interaction', 'error');
      }
    } finally { setSubmittingInteraction(false); }
  };

  // Delete client profile after double confirmation
  const handleDeleteClient = async () => {
    if (deleteConfirmInput !== client?.name) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        router.push('/clients');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to delete client', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An unexpected error occurred', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate AI insights
  const handleGenerateInsight = async () => {
    setGeneratingInsight(true);
    setActiveInsight(null);
    try {
      let startDate: string;
      const endDate = new Date().toISOString();

      if (timelineRange === '7d') startDate = subDays(new Date(), 7).toISOString();
      else if (timelineRange === '30d') startDate = subDays(new Date(), 30).toISOString();
      else startDate = customStart ? new Date(customStart).toISOString() : subDays(new Date(), 7).toISOString();

      const res = await authFetch(`/api/clients/${clientId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, end_date: endDate }),
      });

      if (res.ok) {
        const data: ClientInsight = await res.json();
        setActiveInsight(data);
        showToast('AI insight generated!');
        fetchClient();
      } else {
        showToast('Failed to generate insight', 'error');
      }
    } finally {
      setGeneratingInsight(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!client) return null;

  const stageConfig = STAGE_CONFIG[client.pipeline_stage];

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
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back nav */}
      <button
        onClick={() => router.push('/clients')}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Clients
      </button>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar + Info */}
          <div className="flex items-start gap-5 flex-1">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {client.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                <Badge variant={stageConfig.badge}>{stageConfig.label}</Badge>
                {client.source && (
                  <span className="text-xs text-neutral-500 bg-neutral-800 rounded-full px-3 py-1">
                    via {client.source}
                  </span>
                )}
              </div>
              {client.company && (
                <div className="flex items-center gap-1.5 mt-1.5 text-neutral-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="text-sm">{client.company}</span>
                </div>
              )}
              {client.industry && (
                <div className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue text-[11px] font-medium border border-apple-blue/20">
                  <span>💼 {client.industry.name}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {client.email}
                </a>
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {client.phone}
                  </a>
                )}
                {client.value && (
                  <span className="flex items-center gap-1.5 text-sm text-amber-400 font-semibold">
                    <IndianRupee className="w-3.5 h-3.5" /> {client.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions Column */}
          <div className="flex flex-col gap-3 items-end shrink-0">
            {client.projects.length > 0 && (
              <div className="flex flex-col gap-1 items-end">
                <p className="text-xs text-neutral-500 font-medium mb-1">Projects</p>
                {client.projects.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-blue-400 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" /> {p.name}
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-red-500 hover:bg-red-500/10 border-red-500/20 hover:border-red-500 text-xs px-3 py-1.5 mt-2 transition-colors animate-in fade-in"
            >
              Delete Client
            </Button>
          </div>
        </div>

        {/* Pipeline Progress Bar */}
        {client.pipeline_stage !== 'CHURNED' && (
          <div className="mt-6">
            <div className="flex items-center gap-0">
              {PIPELINE_ORDER.map((s, i) => {
                const sConfig = STAGE_CONFIG[s];
                const isActive = sConfig.step <= stageConfig.step;
                const isCurrent = s === client.pipeline_stage;

                return (
                  <React.Fragment key={s}>
                    <div className={`flex flex-col items-center gap-1 ${i !== PIPELINE_ORDER.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                        isCurrent
                          ? `${sConfig.bg} border-transparent scale-125`
                          : isActive
                          ? `${sConfig.bg} border-transparent`
                          : 'bg-neutral-800 border-neutral-700'
                      }`} />
                      <span className={`text-[10px] font-medium ${isCurrent ? sConfig.color : isActive ? 'text-neutral-500' : 'text-neutral-700'}`}>
                        {sConfig.label}
                      </span>
                    </div>
                    {i < PIPELINE_ORDER.length - 1 && (
                      <div className={`h-px flex-1 mb-4 transition-colors ${isActive && stageConfig.step > i ? 'bg-gradient-to-r from-current to-current opacity-40' : 'bg-neutral-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
        {client.pipeline_stage === 'CHURNED' && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/30 text-sm text-red-400">
            ⚠ This client is marked as Churned
          </div>
        )}
      </div>

      {/* ── INTEGRATIONS PANEL ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gmail Card */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-800/30 flex items-center justify-center text-lg">✉</div>
            <div>
              <p className="text-sm font-semibold text-white">Gmail</p>
              <p className="text-xs text-neutral-500">
                {client.connected_gmail ? 'Email tracking active' : 'Track email conversations'}
              </p>
            </div>
          </div>
          {client.connected_gmail ? (
            <Button variant="danger" size="sm" onClick={handleDisconnectGmail}>Disconnect</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsGmailModalOpen(true)}>Connect Gmail</Button>
          )}
        </div>

        {/* WhatsApp Card */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-900/30 border border-green-800/30 flex items-center justify-center text-lg">💬</div>
            <div>
              <p className="text-sm font-semibold text-white">WhatsApp</p>
              <p className="text-xs text-neutral-500">
                {client.connected_whatsapp ? 'Message tracking active' : 'Track WhatsApp messages'}
              </p>
            </div>
          </div>
          {client.connected_whatsapp ? (
            <Button variant="danger" size="sm" onClick={handleDisconnectWa}>Disconnect</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsWaModalOpen(true)}>Connect WhatsApp</Button>
          )}
        </div>
      </div>

      {/* ── FINANCIALS PANEL ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial metrics */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-4 md:col-span-1">
          <h3 className="text-sm font-semibold text-white">Financial Summary</h3>
          
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-apple-green/5 border border-apple-green/10">
              <span className="text-[10px] uppercase font-bold text-sf-text-secondaryLight block">Aggregate Revenue</span>
              <span className="text-2xl font-bold text-apple-green mt-1 block">
                ₹{(client.transactions?.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0) || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-apple-orange/5 border border-apple-orange/10">
              <span className="text-[10px] uppercase font-bold text-sf-text-secondaryLight block">Outstanding Invoices</span>
              <span className="text-2xl font-bold text-apple-orange mt-1 block">
                ₹{(client.invoices?.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + i.total, 0) || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 md:col-span-1 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Recent Transactions</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {client.transactions?.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs border-b border-neutral-800/50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium truncate max-w-[140px]">{t.description || t.category}</p>
                    <p className="text-[10px] text-sf-text-secondaryLight">{t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <span className={`font-semibold ${t.type === 'INCOME' ? 'text-apple-green' : 'text-apple-red'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}₹{t.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {(!client.transactions || client.transactions.length === 0) && (
                <p className="text-xs text-sf-text-secondaryLight text-center py-4">No transactions logged</p>
              )}
            </div>
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 md:col-span-1 space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Client Invoices</h3>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {client.invoices?.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs border-b border-neutral-800/50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-apple-blue">{inv.invoice_number}</p>
                    <p className="text-[10px] text-sf-text-secondaryLight">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{inv.total.toLocaleString()}</p>
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold ${
                      inv.status === 'PAID' ? 'bg-apple-green/10 text-apple-green' : 'bg-apple-orange/10 text-apple-orange'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
              {(!client.invoices || client.invoices.length === 0) && (
                <p className="text-xs text-sf-text-secondaryLight text-center py-4">No invoices found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── COMMUNICATION TIMELINE ──────────────────────────────────────── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        {/* Timeline Header */}
        <div className="p-5 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Communication Timeline</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Unified feed from Gmail, WhatsApp, and manual logs</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Presets */}
            <div className="flex bg-neutral-800 rounded-lg p-1 gap-1">
              {(['7d', '30d', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimelineRange(r)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    timelineRange === r ? 'bg-neutral-600 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'Custom'}
                </button>
              ))}
            </div>
            {timelineRange === 'custom' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:outline-none"
                />
                <span className="text-neutral-600 text-xs">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:outline-none"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTimeline}
              loading={timelineLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Latest Update
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Manual Log
            </Button>
          </div>
        </div>

        {/* Fetch meta info */}
        {fetchedTimeline && fetchedMeta && (
          <div className="px-5 py-2 bg-neutral-950/30 border-b border-neutral-800/50">
            <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
              {fetchedMeta.gmail_not_connected && (
                <span className="text-amber-500">⚠ Gmail API not configured — showing stored messages only</span>
              )}
              {fetchedMeta.whatsapp_not_connected && (
                <span className="text-amber-500">⚠ WhatsApp API not configured — showing stored messages only</span>
              )}
              {!fetchedMeta.gmail_not_connected && !fetchedMeta.whatsapp_not_connected && (
                <span className="text-green-500">✓ Fetched from all connected channels</span>
              )}
            </div>
          </div>
        )}

        {/* Timeline Entries */}
        <div className="divide-y divide-neutral-800/50 max-h-[500px] overflow-y-auto">
          {timelineLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : timeline.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-sm text-neutral-600">No communications yet.</p>
              <p className="text-xs text-neutral-700 mt-1">
                Connect Gmail or WhatsApp above, or click &quot;Add Manual Log&quot; to record a conversation.
              </p>
            </div>
          ) : (
            timeline.map((log) => {
              const srcConfig = SOURCE_CONFIG[log.source];
              return (
                <div key={log.id} className="p-4 hover:bg-neutral-800/20 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Source badge */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${srcConfig.bg} border flex items-center justify-center text-sm`}>
                      {srcConfig.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold ${srcConfig.color}`}>{srcConfig.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          log.direction === 'INBOUND'
                            ? 'bg-blue-900/20 text-blue-400'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {log.direction === 'INBOUND' ? (
                            <><ArrowDownLeft className="w-3 h-3" /> Inbound</>
                          ) : (
                            <><ArrowUpRight className="w-3 h-3" /> Outbound</>
                          )}
                        </span>
                        {log.flagged_as_change_request && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-800/30">
                            Change Request
                          </span>
                        )}
                        <span className="text-xs text-neutral-600 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(log.received_at), { addSuffix: true })}
                        </span>
                      </div>
                      {log.subject && (
                        <p className="text-sm font-medium text-white mb-1">{log.subject}</p>
                      )}
                      <p className="text-sm text-neutral-400 line-clamp-3">{log.body}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── AI INSIGHTS ─────────────────────────────────────────────────── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-900/30 border border-violet-800/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Insights</h2>
              <p className="text-xs text-neutral-500">Powered by Gemini Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInsightsHistory(!showInsightsHistory)}
            >
              History ({client.client_insights.length})
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateInsight}
              loading={generatingInsight}
              className="flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              {generatingInsight ? 'Analyzing...' : 'Generate Insight'}
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Generating state */}
          {generatingInsight && (
            <div className="flex items-center gap-3 p-4 bg-violet-900/10 border border-violet-800/20 rounded-xl">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-violet-500"
                  />
                ))}
              </div>
              <span className="text-sm text-violet-300">Analyzing communications with Gemini Pro...</span>
            </div>
          )}

          {/* Active Insight Card */}
          <AnimatePresence>
            {activeInsight && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-neutral-700 rounded-xl overflow-hidden"
              >
                {/* Insight Header */}
                <div className="p-4 bg-neutral-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SENTIMENT_CONFIG[activeInsight.sentiment_overview].bg} ${SENTIMENT_CONFIG[activeInsight.sentiment_overview].color}`}>
                      {SENTIMENT_CONFIG[activeInsight.sentiment_overview].label} Sentiment
                    </span>
                    <span className="text-xs text-neutral-500">
                      {format(new Date(activeInsight.timeframe_start), 'MMM d')} – {format(new Date(activeInsight.timeframe_end), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-neutral-600">
                    <span>✉ {activeInsight.email_count}</span>
                    <span>💬 {activeInsight.whatsapp_count}</span>
                    <span>📝 {activeInsight.manual_log_count}</span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Summary */}
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Summary</p>
                    <p className="text-sm text-neutral-300 leading-relaxed">{activeInsight.summary}</p>
                  </div>

                  {/* Key Topics */}
                  {activeInsight.key_topics.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Key Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {activeInsight.key_topics.map((topic, i) => (
                          <span key={i} className="text-xs bg-neutral-800 text-neutral-300 rounded-full px-3 py-1 border border-neutral-700">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {activeInsight.action_items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Action Items</p>
                      <div className="space-y-2">
                        {activeInsight.action_items.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-neutral-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Change Requests */}
                  {activeInsight.change_requests.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">⚠ Change Requests</p>
                      <div className="space-y-2">
                        {activeInsight.change_requests.map((req, i) => (
                          <div key={i} className="p-3 bg-orange-900/20 border border-orange-800/30 rounded-lg">
                            <p className="text-sm text-orange-300">{req}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Insights History */}
          {showInsightsHistory && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Past Insights</p>
              {client.client_insights.length === 0 ? (
                <p className="text-sm text-neutral-700">No insights generated yet.</p>
              ) : (
                client.client_insights.map((insight) => (
                  <button
                    key={insight.id}
                    onClick={() => setActiveInsight(insight)}
                    className="w-full text-left p-3 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${SENTIMENT_CONFIG[insight.sentiment_overview].color}`}>
                        {SENTIMENT_CONFIG[insight.sentiment_overview].label}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2">{insight.summary}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {!activeInsight && !generatingInsight && (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-sm text-neutral-600">Click &quot;Generate Insight&quot; to analyze communications with AI.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── LEGAL DOCUMENTS ─────────────────────────────────────────────── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/30 border border-emerald-800/30 flex items-center justify-center">
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Legal Documents</h2>
              <p className="text-xs text-neutral-500">Contracts, NDAs, and Agreements</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push(`/legal?clientId=${clientId}`)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Upload Document
          </Button>
        </div>

        <div className="p-5">
          {docsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : linkedDocs.length === 0 ? (
            <div className="text-center py-6">
              <Scale className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 font-medium">No documents linked to this client.</p>
              <button
                onClick={() => router.push('/legal')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium mt-2 underline"
              >
                Go to Legal to upload one
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedDocs.map((doc) => {
                const typeColors: Record<string, string> = {
                  CONTRACT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  NDA: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  AGREEMENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  INVOICE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  COMPLIANCE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                };
                const statusColors: Record<string, string> = {
                  DRAFT: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
                  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
                  EXPIRED: 'bg-red-500/10 text-red-400 border-red-500/20',
                };

                return (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/legal?docId=${doc.id}`)}
                    className="w-full text-left p-4 bg-neutral-850/35 hover:bg-neutral-800/70 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all duration-200 group flex flex-col justify-between h-[100px]"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <span className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1 flex-1">
                        {doc.title}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${typeColors[doc.type] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                        {doc.type}
                      </span>
                    </div>

                    <div className="flex items-end justify-between w-full mt-2 text-xs">
                      <div className="text-neutral-500">
                        {doc.expiry_date ? (
                          <span className="flex items-center gap-1">
                            Expires {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-neutral-600">No expiry date</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${statusColors[doc.status] || 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
                        {doc.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── INTERACTIONS ────────────────────────────────────────────────── */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Interaction Logs</h2>
          <Button variant="secondary" size="sm" onClick={() => setIsInteractionModalOpen(true)} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Interaction
          </Button>
        </div>
        <div className="divide-y divide-neutral-800/50 max-h-80 overflow-y-auto">
          {client.interactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-700">No interactions logged yet.</div>
          ) : (
            client.interactions.map((interaction) => (
              <div key={interaction.id} className="p-4 flex items-start gap-3">
                <Avatar name={interaction.creator.name} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-neutral-400 uppercase">{interaction.type}</span>
                    <span className="text-xs text-neutral-600">
                      {formatDistanceToNow(new Date(interaction.date), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-neutral-700">by {interaction.creator.name}</span>
                  </div>
                  <p className="text-sm text-neutral-300">{interaction.summary}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}

      {/* Gmail Connect Modal */}
      <AnimatePresence>
        {isGmailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Connect Gmail Tracking</h3>
                <button onClick={() => setIsGmailModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-400 mb-4">
                Enter the client&apos;s email address. We&apos;ll track emails between this address and your Gmail account.
              </p>
              <Input
                value={gmailInput}
                onChange={(e) => setGmailInput(e.target.value)}
                placeholder={client.email}
                type="email"
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setIsGmailModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleConnectGmail} loading={connectingGmail}>
                  Connect
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Connect Modal */}
      <AnimatePresence>
        {isWaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Connect WhatsApp Tracking</h3>
                <button onClick={() => setIsWaModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-400 mb-4">
                Enter the client&apos;s WhatsApp number in international format (e.g. +91 98765 43210).
              </p>
              <Input
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder={client.phone || '+1 555 000 0000'}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setIsWaModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleConnectWa} loading={connectingWa}>
                  Connect
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Log Modal */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Add Manual Log</h3>
                <button onClick={() => setIsLogModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Direction</label>
                  <div className="flex gap-2">
                    {(['INBOUND', 'OUTBOUND'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setLogDirection(d)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          logDirection === d
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        {d === 'INBOUND' ? '↓ Inbound (from client)' : '↑ Outbound (to client)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Subject (optional)</label>
                  <Input
                    value={logSubject}
                    onChange={(e) => setLogSubject(e.target.value)}
                    placeholder="e.g. Discussed project scope"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Message / Note *</label>
                  <textarea
                    value={logInput}
                    onChange={(e) => setLogInput(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Type the message content or note here..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleAddLog} loading={submittingLog}>
                  Add Log
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Interaction Modal */}
      <AnimatePresence>
        {isInteractionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold">Log Interaction</h3>
                <button onClick={() => setIsInteractionModalOpen(false)} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Type</label>
                  <select
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none"
                  >
                    {['NOTE', 'CALL', 'EMAIL', 'MEETING', 'OTHER'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Summary *</label>
                  <textarea
                    value={interactionSummary}
                    onChange={(e) => setInteractionSummary(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="What was discussed or what happened?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setIsInteractionModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleAddInteraction} loading={submittingInteraction}>
                  Log Interaction
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Double Confirmation Delete Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && client && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-red-500">Delete Client Profile</h3>
                <button onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmInput(''); }} className="text-neutral-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Are you absolutely sure you want to delete <strong className="text-white">{client.name}</strong>?
                </p>
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 leading-relaxed">
                  ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone. It will delete the client profile and all associated data, including invoices, communications, and transactions.
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-2">
                    To confirm, please type the client&apos;s name: <strong className="text-white select-none">{client.name}</strong>
                  </label>
                  <Input
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder="Enter client name exactly"
                    className="bg-neutral-950 border-neutral-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmInput(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDeleteClient}
                  loading={isDeleting}
                  disabled={deleteConfirmInput !== client.name}
                  className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


