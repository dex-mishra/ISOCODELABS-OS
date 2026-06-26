'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  CheckSquare,
  Users,
  Briefcase,
  Plus,
  Contact,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const emptyChartData = (() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data: { name: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    data.push({ name: months[d.getMonth()], revenue: 0 });
  }
  return data;
})();

interface TaskItem {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
}

interface StatsData {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  activeProjects: number;
  totalClients: number;
  totalRevenue: number;
  recentTasks: TaskItem[];
  totalEmployees: number;
  activeEmployees: number;
  expiringLegalCount: number;
}

export default function DashboardPage() {
  const { authFetch } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>(emptyChartData);

  // Quick Idea Capture State
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('PRODUCT');
  const [ideaImpact, setIdeaImpact] = useState(5);
  const [ideaEffort, setIdeaEffort] = useState(5);
  const [ideaTags, setIdeaTags] = useState('');
  const [submittingIdea, setSubmittingIdea] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [tasksRes, empRes, legalRes, projectsRes, clientsRes, txRes] = await Promise.all([
        authFetch('/api/tasks'),
        authFetch('/api/employees'),
        authFetch('/api/legal'),
        authFetch('/api/projects'),
        authFetch('/api/clients'),
        authFetch('/api/money/transactions'),
      ]);

      const tasks = (await tasksRes.json()) as TaskItem[];
      const todoCount = tasks.filter((t: TaskItem) => t.status === 'TODO').length;
      const inProgressCount = tasks.filter((t: TaskItem) => t.status === 'IN_PROGRESS').length;
      const doneCount = tasks.filter((t: TaskItem) => t.status === 'DONE').length;

      const employees = await empRes.json();
      const activeEmployees = employees.filter((e: any) => e.status === 'ACTIVE').length;

      const legalDocs = await legalRes.json();
      const expiringLegalCount = legalDocs.filter((doc: any) => {
        if (!doc.expiry_date || doc.status === 'EXPIRED') return false;
        const diffTime = new Date(doc.expiry_date).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
      }).length;

      const projects = await projectsRes.json();
      const activeProjectsCount = projects.filter((p: any) => p.status !== 'COMPLETED').length;

      const clients = await clientsRes.json();
      const totalClientsCount = clients.length;

      const transactions = await txRes.json();
      const totalIncome = transactions.filter((t: any) => t.type === 'INCOME').reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalExpense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((sum: number, t: any) => sum + t.amount, 0);

      setStats({
        totalTasks: tasks.length,
        pendingTasks: todoCount + inProgressCount,
        completedTasks: doneCount,
        activeProjects: activeProjectsCount,
        totalClients: totalClientsCount,
        totalRevenue: totalIncome,
        recentTasks: tasks.slice(0, 5),
        totalEmployees: employees.length,
        activeEmployees,
        expiringLegalCount,
      });

      // Group income transactions by month for chart (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const last6Months: { monthIndex: number; year: number; name: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push({
          monthIndex: d.getMonth(),
          year: d.getFullYear(),
          name: months[d.getMonth()],
          revenue: 0
        });
      }

      transactions.forEach((tx: any) => {
        if (tx.type === 'INCOME') {
          const txDate = new Date(tx.date);
          const txMonth = txDate.getMonth();
          const txYear = txDate.getFullYear();
          const match = last6Months.find(m => m.monthIndex === txMonth && m.year === txYear);
          if (match) {
            match.revenue += tx.amount;
          }
        }
      });

      const calculatedChartData = last6Months.map(m => ({ name: m.name, revenue: m.revenue }));
      setChartData(calculatedChartData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [authFetch]);

  const handleCaptureIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    setSubmittingIdea(true);
    try {
      const res = await authFetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ideaTitle.trim(),
          description: ideaDescription.trim() || undefined,
          category: ideaCategory,
          impact: ideaImpact,
          effort: ideaEffort,
          tags: ideaTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        setIdeaTitle('');
        setIdeaDescription('');
        setIdeaCategory('PRODUCT');
        setIdeaImpact(5);
        setIdeaEffort(5);
        setIdeaTags('');
        setShowIdeaModal(false);
        // Refresh dashboard data
        loadDashboardData();
      } else {
        alert('Failed to capture idea.');
      }
    } catch (err) {
      console.error(err);
      alert('Error capturing idea.');
    } finally {
      setSubmittingIdea(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Overview of Isocodelabs operations and metrics.
          </p>
        </div>
        <button
          onClick={() => setShowIdeaModal(true)}
          className="inline-flex items-center gap-2 bg-apple-blue hover:bg-apple-blueHover text-white px-4 py-2 text-sm font-medium rounded-apple transition-colors shadow-apple-sm"
        >
          <Plus size={16} />
          <span>Quick Idea Capture</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/tasks')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                Pending Tasks
              </p>
              <h3 className="text-2xl font-bold mt-2">{stats?.pendingTasks}</h3>
            </div>
            <div className="p-3 bg-apple-blue/10 rounded-apple text-apple-blue">
              <CheckSquare size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/projects')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                Active Projects
              </p>
              <h3 className="text-2xl font-bold mt-2">{stats?.activeProjects}</h3>
            </div>
            <div className="p-3 bg-apple-green/10 rounded-apple text-apple-green">
              <Briefcase size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/clients')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                Total Clients
              </p>
              <h3 className="text-2xl font-bold mt-2">{stats?.totalClients}</h3>
            </div>
            <div className="p-3 bg-apple-orange/10 rounded-apple text-apple-orange">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/money')}>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                Total Income
              </p>
              <h3 className="text-2xl font-bold mt-2">₹{stats?.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-apple text-purple-600">
              <TrendingUp size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Table section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <span className="text-base font-semibold">Revenue Progress</span>
            <Badge variant="success">Active</Badge>
          </CardHeader>
          <CardContent className="p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071e3" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0071e3" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="currentColor" opacity={0.5} fontSize={12} />
                <YAxis stroke="currentColor" opacity={0.5} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0071e3" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-base font-semibold">Recent Tasks</span>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {stats?.recentTasks?.map((task: TaskItem) => (
              <div key={task.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none truncate max-w-[150px]">{task.title}</p>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <Badge variant={task.status === 'DONE' ? 'success' : task.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                  {task.status}
                </Badge>
              </div>
            ))}
            {(!stats?.recentTasks || stats.recentTasks.length === 0) && (
              <p className="text-xs text-sf-text-secondaryLight text-center py-4">No recent tasks</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team & Compliance section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Overview Card */}
        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/employees')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-base font-semibold">Team & Workload Overview</span>
            <Contact className="text-apple-blue" size={20} />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-4 rounded-apple border border-border">
                <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium">Active Team Members</p>
                <p className="text-3xl font-bold mt-1 text-apple-green">{stats?.activeEmployees} <span className="text-xs font-normal text-sf-text-secondaryLight">/ {stats?.totalEmployees}</span></p>
              </div>
              <div className="bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-4 rounded-apple border border-border">
                <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark font-medium">Pending Payments</p>
                <p className="text-3xl font-bold mt-1 text-apple-orange">Active</p>
              </div>
            </div>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Click to view employee workloads, log payment cycles, and manage contracts.
            </p>
          </CardContent>
        </Card>

        {/* Compliance Alerts Card */}
        <Card hoverEffect className="cursor-pointer" onClick={() => router.push('/legal')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-base font-semibold">Legal & Compliance Status</span>
            <Scale className="text-apple-blue" size={20} />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4 bg-sf-bg-light dark:bg-sf-bg-elevatedDark p-4 rounded-apple border border-border">
              {stats && stats.expiringLegalCount > 0 ? (
                <>
                  <div className="p-3 bg-apple-red/10 text-apple-red rounded-full">
                    <ShieldAlert size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-apple-red">{stats.expiringLegalCount} Document(s) Expiring Soon</p>
                    <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                      Actions required within 30 days to prevent contract breaches.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-apple-green/10 text-apple-green rounded-full">
                    <Scale size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-apple-green">All Contracts Fully Active</p>
                    <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                      No documents are expiring within the next 30 days.
                    </p>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
              Click to view all NDAs, agreements, invoices, and compliance documentation.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Idea Capture Modal */}
      {showIdeaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-sf-bg-elevatedDark rounded-2xl shadow-2xl border border-border p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-semibold">Quick Idea Capture</h3>
              <button
                type="button"
                onClick={() => setShowIdeaModal(false)}
                className="text-sf-text-secondaryLight hover:text-black dark:hover:text-white transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <form onSubmit={handleCaptureIdea} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none focus:border-apple-blue"
                  placeholder="e.g. Automated PDF invoice generator"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  value={ideaDescription}
                  onChange={(e) => setIdeaDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none focus:border-apple-blue h-20 resize-none"
                  placeholder="Describe your product idea..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                    Category
                  </label>
                  <select
                    value={ideaCategory}
                    onChange={(e) => setIdeaCategory(e.target.value)}
                    className="w-full px-2 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none"
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="CONTENT">Content</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                    Impact (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ideaImpact}
                    onChange={(e) => setIdeaImpact(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                    Effort (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ideaEffort}
                    onChange={(e) => setIdeaEffort(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={ideaTags}
                  onChange={(e) => setIdeaTags(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark/40 border border-border rounded-apple focus:outline-none focus:border-apple-blue"
                  placeholder="e.g. automation, invoice, ai"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIdeaModal(false)}
                  className="px-4 py-2 border border-border text-xs font-bold rounded-apple transition-colors hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark/25"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIdea || !ideaTitle.trim()}
                  className="px-4 py-2 bg-apple-blue hover:bg-apple-blueHover disabled:bg-apple-blue/50 text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                >
                  {submittingIdea ? 'Saving...' : 'Capture Idea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}












