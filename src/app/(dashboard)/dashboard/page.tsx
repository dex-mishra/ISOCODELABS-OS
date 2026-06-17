'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp,
  CheckSquare,
  Users,
  Briefcase,
  Plus,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 5000 },
  { name: 'Mar', revenue: 6000 },
  { name: 'Apr', revenue: 8000 },
  { name: 'May', revenue: 10000 },
  { name: 'Jun', revenue: 12000 },
];

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
}

export default function DashboardPage() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await authFetch('/api/tasks');
        const tasks = (await res.json()) as TaskItem[];
        const todoCount = tasks.filter((t: TaskItem) => t.status === 'TODO').length;
        const inProgressCount = tasks.filter((t: TaskItem) => t.status === 'IN_PROGRESS').length;
        const doneCount = tasks.filter((t: TaskItem) => t.status === 'DONE').length;

        setStats({
          totalTasks: tasks.length,
          pendingTasks: todoCount + inProgressCount,
          completedTasks: doneCount,
          activeProjects: 3,
          totalClients: 5,
          totalRevenue: 20500,
          recentTasks: tasks.slice(0, 5),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [authFetch]);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
            Overview of Isocodelabs operations and metrics.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-apple-blue hover:bg-apple-blueHover text-white px-4 py-2 text-sm font-medium rounded-apple transition-colors shadow-apple-sm">
          <Plus size={16} />
          <span>Quick Idea Capture</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hoverEffect>
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

        <Card hoverEffect>
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

        <Card hoverEffect>
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

        <Card hoverEffect>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider">
                Total Revenue
              </p>
              <h3 className="text-2xl font-bold mt-2">${stats?.totalRevenue.toLocaleString()}</h3>
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
            <Badge variant="success">Up 15%</Badge>
          </CardHeader>
          <CardContent className="p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
