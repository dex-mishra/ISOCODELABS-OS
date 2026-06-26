'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Receipt,
  Sparkles,
  X,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
  ChevronRight,
  BarChart3,
  PieChart,
  Loader2,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  description: string | null;
  recurring: boolean;
  client_id: string | null;
  project_id: string | null;
  industry_id: string | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  industry?: { id: string; name: string; icon?: string } | null;
  created_at: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  total: number;
  items: InvoiceItem[];
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  issue_date: string;
  due_date: string;
  client_id: string | null;
  project_id: string | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  created_at: string;
}

interface FinancialAnalysis {
  summary: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;
  };
  top_categories: { name: string; amount: number; percentage: number }[];
  optimization_opportunities: string[];
  revenue_forecast: string;
  budget_recommendations: string[];
  action_items: string[];
}

interface ClientOption { id: string; name: string; }
interface ProjectOption { id: string; name: string; }
interface IndustryOption { id: string; name: string; icon?: string; }
interface VentureOption { id: string; name: string; type: string; }

const TX_CATEGORIES = [
  'Client Payment', 'Product Revenue', 'Hosting', 'Tools',
  'Contractor', 'Marketing', 'Legal', 'Other',
];

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
  DRAFT: { color: 'text-gray-500', icon: Clock, bg: 'bg-gray-100 dark:bg-gray-800' },
  SENT: { color: 'text-blue-500', icon: Send, bg: 'bg-blue-50 dark:bg-blue-900/20' },
  PAID: { color: 'text-green-500', icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/20' },
  OVERDUE: { color: 'text-red-500', icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-900/20' },
};

type TabKey = 'overview' | 'transactions' | 'invoices';

/* ── Page Component ─────────────────────────────────────────────────────── */
export default function MoneyPage() {
  const { authFetch } = useAuth();

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [_industries, setIndustries] = useState<IndustryOption[]>([]);
  const [ventures, setVentures] = useState<VentureOption[]>([]);
  const [ventureFilter, setVentureFilter] = useState('');

  // AI
  const [aiAnalysis, setAiAnalysis] = useState<FinancialAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Transaction form
  const [txForm, setTxForm] = useState({
    amount: '', type: 'INCOME' as 'INCOME' | 'EXPENSE', category: 'Client Payment',
    date: new Date().toISOString().split('T')[0], description: '',
    client_id: '', project_id: '', industry_id: '', recurring: false,
  });

  // Invoice form
  const [invForm, setInvForm] = useState({
    invoice_number: '', client_id: '', project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }] as InvoiceItem[],
  });

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (ventureFilter) params.append('venture_id', ventureFilter);
      const res = await authFetch(`/api/money/transactions${params.toString() ? '?' + params.toString() : ''}`);
      if (res.ok) setTransactions(await res.json());
    } catch (e) { console.error(e); }
  }, [authFetch, ventureFilter]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await authFetch('/api/money/invoices');
      if (res.ok) setInvoices(await res.json());
    } catch (e) { console.error(e); }
  }, [authFetch]);

  const fetchMeta = useCallback(async () => {
    try {
      const [cRes, pRes, iRes, vRes] = await Promise.all([
        authFetch('/api/clients'), authFetch('/api/projects'), authFetch('/api/industries'), authFetch('/api/ventures'),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setClients(Array.isArray(d) ? d : d.clients || []); }
      if (pRes.ok) setProjects(await pRes.json());
      if (iRes.ok) setIndustries(await iRes.json());
      if (vRes.ok) setVentures(await vRes.json());
    } catch (e) { console.error(e); }
  }, [authFetch]);

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchInvoices(), fetchMeta()]).finally(() => setLoading(false));
  }, [fetchTransactions, fetchInvoices, fetchMeta]);

  /* ── Computed Metrics ──────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const net = income - expenses;
    const margin = income > 0 ? (net / income) * 100 : 0;
    const pendingInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').reduce((s, i) => s + i.total, 0);
    const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length;
    return { income, expenses, net, margin, pendingInvoices, overdueInvoices };
  }, [transactions, invoices]);

  /* ── Monthly chart data ────────────────────────────────────────────── */
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(tx => {
      const key = tx.date.substring(0, 7); // YYYY-MM
      if (!months[key]) months[key] = { income: 0, expense: 0 };
      if (tx.type === 'INCOME') months[key].income += tx.amount;
      else months[key].expense += tx.amount;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...data,
      }));
  }, [transactions]);

  /* ── Category breakdown ────────────────────────────────────────────── */
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats)
      .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  /* ── Industry breakdown ────────────────────────────────────────────── */
  const industryBreakdown = useMemo(() => {
    const inds: Record<string, number> = {};
    transactions.forEach(t => {
      const name = t.industry?.name || 'Unassigned';
      inds[name] = (inds[name] || 0) + t.amount;
    });
    const total = Object.values(inds).reduce((s, v) => s + v, 0);
    return Object.entries(inds)
      .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  /* ── Create Transaction ────────────────────────────────────────────── */
  const handleCreateTx = async () => {
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) return;
    try {
      const res = await authFetch('/api/money/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(txForm.amount),
          type: txForm.type,
          category: txForm.category,
          date: txForm.date,
          description: txForm.description || undefined,
          client_id: txForm.client_id || undefined,
          project_id: txForm.project_id || undefined,
          industry_id: txForm.industry_id || undefined,
          recurring: txForm.recurring,
        }),
      });
      if (res.ok) {
        setShowTxModal(false);
        setTxForm({ amount: '', type: 'INCOME', category: 'Client Payment', date: new Date().toISOString().split('T')[0], description: '', client_id: '', project_id: '', industry_id: '', recurring: false });
        fetchTransactions();
      }
    } catch (e) { console.error(e); }
  };

  /* ── Delete Transaction ────────────────────────────────────────────── */
  const handleDeleteTx = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await authFetch(`/api/money/transactions/${id}`, { method: 'DELETE' });
      fetchTransactions();
    } catch (e) { console.error(e); }
  };

  /* ── Create Invoice ────────────────────────────────────────────────── */
  const handleCreateInvoice = async () => {
    if (!invForm.invoice_number.trim()) return;
    const total = invForm.items.reduce((s, i) => s + i.amount, 0);
    try {
      const res = await authFetch('/api/money/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_number: invForm.invoice_number,
          amount: total,
          total,
          items: invForm.items,
          client_id: invForm.client_id || undefined,
          project_id: invForm.project_id || undefined,
          issue_date: invForm.issue_date,
          due_date: invForm.due_date,
        }),
      });
      if (res.ok) {
        setShowInvoiceModal(false);
        setInvForm({
          invoice_number: '', client_id: '', project_id: '',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
        });
        fetchInvoices();
      }
    } catch (e) { console.error(e); }
  };

  /* ── Progress Invoice Status ───────────────────────────────────────── */
  const handleProgressInvoice = async (inv: Invoice, newStatus: string) => {
    try {
      const res = await authFetch(`/api/money/invoices/${inv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchInvoices();
    } catch (e) { console.error(e); }
  };

  /* ── Delete Invoice ────────────────────────────────────────────────── */
  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await authFetch(`/api/money/invoices/${id}`, { method: 'DELETE' });
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
      fetchInvoices();
    } catch (e) { console.error(e); }
  };

  /* ── AI Analysis ───────────────────────────────────────────────────── */
  const runAiAnalysis = async () => {
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await authFetch('/api/money/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data);
      }
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  };

  /* ── Invoice item helpers ──────────────────────────────────────────── */
  const updateInvItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setInvForm(prev => {
      const items = [...prev.items];
      (items[idx] as any)[field] = value;
      items[idx].amount = items[idx].quantity * items[idx].rate;
      return { ...prev, items };
    });
  };
  const addInvItem = () => setInvForm(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, rate: 0, amount: 0 }] }));
  const removeInvItem = (idx: number) => setInvForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  /* ── Loading ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-10 w-[140px]" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6 max-w-[1600px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <IndianRupee className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Money Management</h1>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Financial overview &amp; invoicing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runAiAnalysis}>
            <Sparkles size={15} className="mr-1.5" />
            AI Analysis
          </Button>
          <Button variant="outline" onClick={() => setShowInvoiceModal(true)}>
            <FileText size={15} className="mr-1.5" />
            New Invoice
          </Button>
          <Button variant="primary" onClick={() => setShowTxModal(true)}>
            <Plus size={15} className="mr-1.5" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Venture Filter */}
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="bg-card border border-border text-xs text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-apple-blue"
        >
          <option value="">All Ventures</option>
          {ventures.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        <div className="flex gap-1 bg-apple-gray dark:bg-sf-bg-elevatedDark p-1 rounded-xl w-fit">
        {([
          { key: 'overview' as TabKey, label: 'Overview', icon: BarChart3 },
          { key: 'transactions' as TabKey, label: 'Transactions', icon: Receipt },
          { key: 'invoices' as TabKey, label: 'Invoices', icon: FileText },
        ]).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-card text-foreground shadow-sm'
                  : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:text-foreground'
              }`}
            >
              <Icon size={14} className="inline mr-1.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      </div>

      {/* ── OVERVIEW TAB ────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Revenue" value={fmt(metrics.income)} icon={TrendingUp} color="from-emerald-500 to-green-600" change="+12%" positive />
            <MetricCard title="Total Expenses" value={fmt(metrics.expenses)} icon={TrendingDown} color="from-red-500 to-rose-600" change="-3%" positive={false} />
            <MetricCard title="Net Profit" value={fmt(metrics.net)} icon={IndianRupee} color="from-blue-500 to-indigo-600" change={`${metrics.margin.toFixed(1)}% margin`} positive={metrics.net >= 0} />
            <MetricCard title="Pending Invoices" value={fmt(metrics.pendingInvoices)} icon={FileText} color="from-amber-500 to-orange-600" change={`${metrics.overdueInvoices} overdue`} positive={metrics.overdueInvoices === 0} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4">
            {/* Revenue vs Expenses bar chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-blue-500" />
                  <span className="font-semibold text-sm">Revenue vs Expenses</span>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">No transaction data yet</p>
                ) : (
                  <div className="space-y-3">
                    {monthlyData.map((m, i) => {
                      const max = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark w-14 shrink-0">{m.month}</span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-4 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all" style={{ width: `${(m.income / max) * 100}%`, minWidth: m.income > 0 ? '8px' : '0' }} />
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">{fmt(m.income)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 rounded-full bg-gradient-to-r from-rose-400 to-red-500 transition-all" style={{ width: `${(m.expense / max) * 100}%`, minWidth: m.expense > 0 ? '8px' : '0' }} />
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 shrink-0">{fmt(m.expense)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expense breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-purple-500" />
                  <span className="font-semibold text-sm">Expense Breakdown</span>
                </div>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">No expenses yet</p>
                ) : (
                  <div className="space-y-3">
                    {categoryBreakdown.map((cat, i) => {
                      const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500'];
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{cat.name}</span>
                            <span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{fmt(cat.amount)}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-apple-gray dark:bg-sf-bg-elevatedDark overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${cat.percentage}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                              className={`h-full rounded-full ${colors[i % colors.length]}`}
                            />
                          </div>
                          <p className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{cat.percentage.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Industry breakdown */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-teal-500" />
                  <span className="font-semibold text-sm">Industry Breakdown</span>
                </div>
              </CardHeader>
              <CardContent>
                {industryBreakdown.length === 0 ? (
                  <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">No industry data yet</p>
                ) : (
                  <div className="space-y-3">
                    {industryBreakdown.map((ind, i) => {
                      const colors = ['bg-teal-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500'];
                      return (
                        <div key={ind.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{ind.name}</span>
                            <span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{fmt(ind.amount)}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-apple-gray dark:bg-sf-bg-elevatedDark overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${ind.percentage}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                              className={`h-full rounded-full ${colors[i % colors.length]}`}
                            />
                          </div>
                          <p className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">{ind.percentage.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-emerald-500" />
                <span className="font-semibold text-sm">Transaction Ledger</span>
                <Badge variant="default">{transactions.length}</Badge>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowTxModal(true)}>
                <Plus size={14} className="mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">No transactions recorded yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-apple-blue/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        tx.type === 'INCOME' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        {tx.type === 'INCOME'
                          ? <ArrowUpRight size={16} className="text-emerald-600 dark:text-emerald-400" />
                          : <ArrowDownRight size={16} className="text-red-600 dark:text-red-400" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                        <div className="flex items-center gap-2 text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark flex-wrap">
                          <span>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span>·</span>
                          <Badge variant={tx.type === 'INCOME' ? 'success' : 'danger'} className="text-[10px]">{tx.category}</Badge>
                          {tx.client && <span>· {tx.client.name}</span>}
                          {tx.industry && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                                {tx.industry.name}
                              </span>
                            </>
                          )}
                          {tx.recurring && <Badge variant="warning" className="text-[10px]">Recurring</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteTx(tx.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sf-text-secondaryLight hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── INVOICES TAB ────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Invoice list */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  <span className="font-semibold text-sm">Invoices</span>
                  <Badge variant="default">{invoices.length}</Badge>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowInvoiceModal(true)}>
                  <Plus size={14} className="mr-1" />
                  Create
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => {
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                          selectedInvoice?.id === inv.id ? 'border-apple-blue bg-apple-blue/5' : 'border-border hover:border-apple-blue/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                            <StatusIcon size={16} className={cfg.color} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">#{inv.invoice_number}</p>
                            <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark truncate">
                              {inv.client?.name || 'No client'} · Due {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold">{fmt(inv.total)}</span>
                          <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : inv.status === 'SENT' ? 'default' : 'secondary'}>
                            {inv.status}
                          </Badge>
                          <ChevronRight size={14} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice detail panel */}
          <Card>
            <CardHeader>
              <span className="font-semibold text-sm">Invoice Details</span>
            </CardHeader>
            <CardContent>
              {selectedInvoice ? (
                <div className="space-y-4">
                  <div className="text-center p-4 rounded-xl bg-apple-gray dark:bg-sf-bg-elevatedDark">
                    <p className="text-2xl font-bold">{fmt(selectedInvoice.total)}</p>
                    <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">#{selectedInvoice.invoice_number}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Status</span><Badge variant={selectedInvoice.status === 'PAID' ? 'success' : selectedInvoice.status === 'OVERDUE' ? 'danger' : selectedInvoice.status === 'SENT' ? 'default' : 'secondary'}>{selectedInvoice.status}</Badge></div>
                    <div className="flex justify-between"><span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Client</span><span className="font-medium">{selectedInvoice.client?.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Issued</span><span>{new Date(selectedInvoice.issue_date).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Due</span><span>{new Date(selectedInvoice.due_date).toLocaleDateString()}</span></div>
                  </div>

                  {/* Items */}
                  {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase">Line Items</p>
                      {selectedInvoice.items.map((item: InvoiceItem, i: number) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-apple-gray dark:bg-sf-bg-elevatedDark rounded-lg">
                          <span className="truncate">{item.description || 'Item'}</span>
                          <span className="font-medium shrink-0 ml-2">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {selectedInvoice.status === 'DRAFT' && (
                      <Button variant="primary" size="sm" onClick={() => handleProgressInvoice(selectedInvoice, 'SENT')}>
                        <Send size={14} className="mr-1" /> Mark as Sent
                      </Button>
                    )}
                    {selectedInvoice.status === 'SENT' && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => handleProgressInvoice(selectedInvoice, 'PAID')}>
                          <CheckCircle size={14} className="mr-1" /> Mark as Paid
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleProgressInvoice(selectedInvoice, 'OVERDUE')}>
                          <AlertTriangle size={14} className="mr-1" /> Mark Overdue
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(selectedInvoice.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-12">Select an invoice to view details</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── AI Analysis Panel ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAiPanel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="border-purple-200 dark:border-purple-800/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="font-semibold text-sm">AI Financial Analysis</span>
                  </div>
                  <button onClick={() => setShowAiPanel(false)}>
                    <X size={16} className="text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {aiLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 size={20} className="animate-spin text-purple-500" />
                    <span className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Analyzing your financial data…</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold">Income</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(aiAnalysis.summary.total_income)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 font-semibold">Expenses</p>
                        <p className="text-lg font-bold text-red-700 dark:text-red-300">{fmt(aiAnalysis.summary.total_expenses)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">Net Profit</p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{fmt(aiAnalysis.summary.net_profit)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 font-semibold">Margin</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{aiAnalysis.summary.profit_margin.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">📊 Revenue Forecast</h4>
                        <p className="text-sm leading-relaxed">{aiAnalysis.revenue_forecast}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">💡 Optimization Opportunities</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.optimization_opportunities.map((o, i) => (
                            <li key={i} className="text-sm flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{o}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">💰 Budget Recommendations</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.budget_recommendations.map((r, i) => (
                            <li key={i} className="text-sm flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span>{r}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">✅ Action Items</h4>
                        <ul className="space-y-1">
                          {aiAnalysis.action_items.map((a, i) => (
                            <li key={i} className="text-sm flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark py-8">Click &quot;AI Analysis&quot; to generate financial insights</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transaction Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showTxModal && (
          <ModalOverlay onClose={() => setShowTxModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">New Transaction</h2>
                <button onClick={() => setShowTxModal(false)} className="p-1 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark"><X size={18} /></button>
              </div>

              {/* Type toggle */}
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE'] as const).map(t => (
                  <button key={t} onClick={() => setTxForm(p => ({ ...p, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      txForm.type === t
                        ? t === 'INCOME' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-500 text-white border-red-500'
                        : 'border-border hover:border-apple-blue/50'
                    }`}
                  >{t === 'INCOME' ? '↑ Income' : '↓ Expense'}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Amount *</label>
                  <Input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Date *</label>
                  <Input type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Category</label>
                  <select value={txForm.category} onChange={e => setTxForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30">
                    {TX_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Description</label>
                  <Input value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief note…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Client</label>
                  <select value={txForm.client_id} onChange={e => setTxForm(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30">
                    <option value="">None</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Project</label>
                  <select value={txForm.project_id} onChange={e => setTxForm(p => ({ ...p, project_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Industry</label>
                  <select value={txForm.industry_id} onChange={e => setTxForm(p => ({ ...p, industry_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30">
                    <option value="">None</option>
                    {_industries.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={txForm.recurring} onChange={e => setTxForm(p => ({ ...p, recurring: e.target.checked }))} className="rounded" />
                Recurring transaction
              </label>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowTxModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateTx} disabled={!txForm.amount || parseFloat(txForm.amount) <= 0}>
                  <Plus size={15} className="mr-1" /> Add Transaction
                </Button>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Invoice Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showInvoiceModal && (
          <ModalOverlay onClose={() => setShowInvoiceModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Create Invoice</h2>
                <button onClick={() => setShowInvoiceModal(false)} className="p-1 rounded-lg hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Invoice Number *</label>
                  <Input value={invForm.invoice_number} onChange={e => setInvForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Client</label>
                  <select value={invForm.client_id} onChange={e => setInvForm(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue/30">
                    <option value="">Select client…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Issue Date</label>
                  <Input type="date" value={invForm.issue_date} onChange={e => setInvForm(p => ({ ...p, issue_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Due Date</label>
                  <Input type="date" value={invForm.due_date} onChange={e => setInvForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase">Line Items</p>
                  <button onClick={addInvItem} className="text-xs text-apple-blue hover:underline flex items-center gap-1"><Plus size={12} /> Add Item</button>
                </div>
                {invForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <label className="block text-[10px] font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Description</label>}
                      <Input value={item.description} onChange={e => updateInvItem(idx, 'description', e.target.value)} placeholder="Service description" />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <label className="block text-[10px] font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Qty</label>}
                      <Input type="number" value={item.quantity} onChange={e => updateInvItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <label className="block text-[10px] font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Rate</label>}
                      <Input type="number" step="0.01" value={item.rate} onChange={e => updateInvItem(idx, 'rate', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-span-2 text-right">
                      {idx === 0 && <label className="block text-[10px] font-medium text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mb-1">Amount</label>}
                      <p className="py-2 text-sm font-bold">{fmt(item.amount)}</p>
                    </div>
                    <div className="col-span-1">
                      {invForm.items.length > 1 && (
                        <button onClick={() => removeInvItem(idx)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sf-text-secondaryLight hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-border">
                  <div className="text-right">
                    <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">Total</p>
                    <p className="text-xl font-bold">{fmt(invForm.items.reduce((s, i) => s + i.amount, 0))}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateInvoice} disabled={!invForm.invoice_number.trim()}>
                  <FileText size={15} className="mr-1" /> Create Invoice
                </Button>
              </div>
            </motion.div>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Metric Card ────────────────────────────────────────────────────── */
function MetricCard({ title, value, icon: Icon, color, change, positive }: {
  title: string; value: string; icon: React.ElementType; color: string; change: string; positive: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium">{title}</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
              <p className={`text-[11px] mt-1 font-medium ${positive ? 'text-emerald-500' : 'text-red-500'}`}>{change}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon size={18} className="text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Modal Overlay ──────────────────────────────────────────────────── */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {children}
    </motion.div>
  );
}
