'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Video,
  CheckSquare,
  Users,
  Briefcase,
  FileText,
  Lightbulb,
  Folder,
  FlaskConical,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Bell,
  Search,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meetings', href: '/meetings', icon: Video },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Workspace', href: '/workspace', icon: Folder },
  { name: 'Test Site', href: '/test-site', icon: FlaskConical },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  return (
    <div className="min-h-screen flex bg-sf-bg-light dark:bg-sf-bg-dark text-foreground">
      {/* Sidebar */}
      <aside
        className={`bg-card border-r border-border flex flex-col transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-apple-blue to-purple-600 bg-clip-text text-transparent">
              ISOCODELABS OPS HUB
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark ml-auto"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname ? pathname.startsWith(item.href) : false;

            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-apple text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-apple-blue text-white shadow-apple-sm'
                    : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer / Profile details */}
        <div className="p-3 border-t border-border space-y-2 shrink-0">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-2 py-1">
              <Avatar name={user.name} size="sm" src={user.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user.name}</p>
                <p className="text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-apple text-sm font-medium text-apple-red hover:bg-apple-red/10 transition-all"
            title={collapsed ? 'Log Out' : undefined}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4 w-96">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sf-text-secondaryLight dark:text-sf-text-secondaryDark" />
              <input
                type="text"
                placeholder="Search everything..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark transition-colors"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notifications */}
            <button className="p-2 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark relative transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-apple-red" />
            </button>

            {/* Avatar block */}
            {user && (
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <Avatar name={user.name} size="sm" src={user.avatar_url} />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 no-scrollbar bg-sf-bg-light dark:bg-sf-bg-dark">
          {children}
        </main>
      </div>
    </div>
  );
}
