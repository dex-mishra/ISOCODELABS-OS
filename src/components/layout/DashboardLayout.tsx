'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtime } from '@/contexts/RealtimeContext';
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
  Building2,
  Scale,
  Contact,
  Layout,
  IndianRupee,
  Compass,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import GlobalChatPanel from '@/components/modules/GlobalChatPanel';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meetings', href: '/meetings', icon: Video },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Team Chat', href: '/chat', icon: MessageSquare },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'Employees', href: '/employees', icon: Contact },
  { name: 'Ventures', href: '/ventures', icon: Building2 },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Ideas', href: '/ideas', icon: Lightbulb },
  { name: 'Workspace', href: '/workspace', icon: Folder },
  { name: 'Legal', href: '/legal', icon: Scale },
  { name: 'Business Model', href: '/business-model', icon: Layout },
  { name: 'Money', href: '/money', icon: IndianRupee },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Test Site', href: '/test-site', icon: FlaskConical },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, authFetch } = useAuth();
  const { socket } = useRealtime();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch initial notifications
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user]);

  // Listen to socket events
  useEffect(() => {
    if (socket) {
      socket.on('notification', (newNotif: Notification) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
      socket.on('unread-count', (data: { count: number }) => {
        setUnreadCount(data.count);
      });
    }
    return () => {
      if (socket) {
        socket.off('notification');
        socket.off('unread-count');
      }
    };
  }, [socket]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await authFetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await authFetch('/api/notifications/mark-all-read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await authFetch(`/api/notifications/${notif.id}/read`, { method: 'POST' });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (e) {
        console.error(e);
      }
    }
    setIsDropdownOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 rounded-apple hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark text-sf-text-secondaryLight dark:text-sf-text-secondaryDark relative transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-apple-red" />
                )}
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sf-bg-light dark:bg-sf-bg-elevatedDark">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-apple-blue hover:underline flex items-center gap-1 font-semibold"
                      >
                        <CheckCircle size={12} />
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sf-text-secondaryLight text-sm">
                        <Bell size={24} className="mx-auto mb-2 opacity-50" />
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3 cursor-pointer hover:bg-apple-gray/50 dark:hover:bg-sf-bg-elevatedDark/50 transition-colors ${
                              !notif.is_read ? 'bg-apple-blue/5 dark:bg-apple-blue/10' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs font-semibold ${!notif.is_read ? 'text-foreground' : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[9px] text-sf-text-secondaryLight shrink-0 whitespace-nowrap">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1 line-clamp-2">
                              {notif.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-border bg-sf-bg-light dark:bg-sf-bg-elevatedDark text-center">
                    <span className="text-[10px] text-sf-text-secondaryLight">Isocodelabs Ops Hub</span>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar block */}
            {user && (
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <Avatar name={user.name} size="sm" src={user.avatar_url} />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 no-scrollbar bg-sf-bg-light dark:bg-sf-bg-dark">
          {children}
        </main>
      </div>

      {/* Global AI Assistant (Ctrl+J) */}
      <GlobalChatPanel />
    </div>
  );
}
