'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import {
  User as UserIcon,
  Sliders,
  Palette,
  Info,
  Key,
  ShieldCheck,
  RefreshCw,
  Grid,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Terminal,
  Camera,
  Loader2,
} from 'lucide-react';

interface IntegrationStatus {
  google: {
    connected: boolean;
    email: string | null;
    scopes: string[];
  };
  whatsapp: {
    connected: boolean;
    phone_number_id: string | null;
    is_mock: boolean;
    mode?: 'qr' | 'business';
  };
  google_ai: {
    connected: boolean;
    status: string;
    key_masked: string | null;
  };
  fathom: {
    connected: boolean;
    status: string;
  };
}

export default function SettingsPage() {
  const { user, authFetch, updateUser } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'appearance' | 'about' | 'api-keys'>('profile');

  // Loaders & Message states
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // 1. Profile State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 2. Integrations Configuration State
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [googleAiKey, setGoogleAiKey] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappModeSel, setWhatsappModeSel] = useState<'qr' | 'business'>('business');
  const [whatsappStep, setWhatsappStep] = useState<number>(1);
  const [connectionTestResult, setConnectionTestResult] = useState<string>('');

  // 3. Appearance Options State
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');
  const [accentColor, setAccentColor] = useState('#0071e3');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // 4. API Keys State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeyName, setApiKeyName] = useState('');
  const [generatedKeyAlert, setGeneratedKeyAlert] = useState<string | null>(null);
  const [keyPermissions, setKeyPermissions] = useState<string[]>(['*']);

  // Load Initial Settings & Integrations status
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileAvatar(user.avatar_url || '');
    }
    fetchSettingsAndStatus();
    fetchApiKeys();
  }, [user]);

  // Sync WhatsApp state from loaded status
  useEffect(() => {
    if (integrationStatus?.whatsapp) {
      setWhatsappModeSel(integrationStatus.whatsapp.mode || 'business');
      if (integrationStatus.whatsapp.connected) {
        setWhatsappStep(3);
      } else {
        setWhatsappStep(1);
      }
    }
  }, [integrationStatus]);

  const fetchApiKeys = async () => {
    try {
      const res = await authFetch('/api/settings/keys');
      if (res.ok) {
        setApiKeys(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  };

  const fetchSettingsAndStatus = async () => {
    try {
      // Fetch flat settings
      const settingsRes = await authFetch('/api/settings');
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setGoogleAiKey(settings.google_ai_api_key || '');
        setWhatsappToken(settings.whatsapp_api_token || '');
        setWhatsappPhoneId(settings.whatsapp_phone_number_id || '');
        setThemeMode(settings.theme_mode || 'light');
        setAccentColor(settings.theme_accent_color || '#0071e3');
        setDensity(settings.theme_density || 'comfortable');
      }

      // Fetch integrations connection status
      const statusRes = await authFetch('/api/settings/integrations');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIntegrationStatus(statusData);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: '', type: null });
    }, 4000);
  };

  // --- Actions ---

  // Upload Avatar File
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showStatus('Invalid file type. Allowed: JPEG, PNG, GIF, WebP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showStatus('File too large. Maximum size is 5MB.', 'error');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/settings/avatar', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileAvatar(data.url);
        updateUser({ avatar_url: data.url });
        showStatus('Profile photo updated successfully.', 'success');
      } else {
        const err = await res.json();
        showStatus(err.error || 'Failed to upload avatar.', 'error');
      }
    } catch (err) {
      showStatus('Network error while uploading avatar.', 'error');
    } finally {
      setAvatarUploading(false);
      // Reset file input so same file can be selected again
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          avatar_url: profileAvatar,
          password: newPassword || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update user state reactively
        updateUser({
          name: profileName,
          avatar_url: profileAvatar || null,
        });
        setNewPassword('');
        showStatus('Profile details updated successfully.', 'success');
      } else {
        const err = await res.json();
        showStatus(err.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showStatus('Network error while updating profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Integrations Config
  const handleSaveIntegrations = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_ai_api_key: googleAiKey,
          whatsapp_api_token: whatsappToken,
          whatsapp_phone_number_id: whatsappPhoneId,
        }),
      });

      if (res.ok) {
        showStatus('Integration API credentials saved successfully.', 'success');
        fetchSettingsAndStatus();
      } else {
        showStatus('Failed to save credentials.', 'error');
      }
    } catch (err) {
      showStatus('Network error saving credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Appearance Config
  const handleSaveAppearance = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme_mode: themeMode,
          theme_accent_color: accentColor,
          theme_density: density,
        }),
      });

      if (res.ok) {
        // Persist theme to localStorage for instant loading next time
        localStorage.setItem('theme', themeMode === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : themeMode);
        localStorage.setItem('theme_accent_color', accentColor);
        localStorage.setItem('theme_density', density);

        // Apply appearance settings to document element instantly
        applyThemeStyles(themeMode, accentColor, density);
        
        showStatus('Appearance settings saved and applied successfully.', 'success');
      } else {
        showStatus('Failed to update appearance preferences.', 'error');
      }
    } catch (err) {
      showStatus('Network error updating appearance.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: apiKeyName.trim(),
          permissions: keyPermissions,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKeyAlert(data.rawKey);
        setApiKeyName('');
        setKeyPermissions(['*']);
        fetchApiKeys();
        showStatus('New API Key generated successfully. Make sure to copy it now!', 'success');
      } else {
        const err = await res.json();
        showStatus(err.error || 'Failed to generate key.', 'error');
      }
    } catch (err) {
      showStatus('Network error generating key.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API Key? This action is permanent.')) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/settings/keys/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showStatus('API Key revoked successfully.', 'success');
        fetchApiKeys();
      } else {
        showStatus('Failed to revoke API Key.', 'error');
      }
    } catch (err) {
      showStatus('Network error revoking key.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showStatus('API key copied to clipboard.', 'success');
  };

  const applyThemeStyles = (mode: string, color: string, dens: string) => {
    const root = document.documentElement;

    // 1. Dark Mode
    let isDark = mode === 'dark';
    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    root.classList.toggle('dark', isDark);

    // 2. Accent Color
    root.style.setProperty('--accent-color', color);
    
    // Compute a slightly lighter/darker hover color
    let hoverColor = color;
    if (color === '#0071e3') hoverColor = '#0077ed'; // Blue
    else if (color === '#34c759') hoverColor = '#2ec052'; // Green
    else if (color === '#ff3b30') hoverColor = '#f13328'; // Red
    else if (color === '#ff9500') hoverColor = '#e08300'; // Orange
    else if (color === '#af52de') hoverColor = '#9f42ce'; // Purple
    root.style.setProperty('--accent-color-hover', hoverColor);

    // 3. Spacing Grid Density
    root.classList.toggle('density-compact', dens === 'compact');
  };

  // Google OAuth connect
  const handleConnectGoogle = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/google/connect', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        // Redirect browser to OAuth consent screen
        window.location.href = url;
      } else {
        showStatus('Failed to retrieve Google OAuth link.', 'error');
      }
    } catch (err) {
      showStatus('Google connection network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Google Disconnect
  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar and Gmail?')) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/google/disconnect', { method: 'POST' });
      if (res.ok) {
        showStatus('Google integration disconnected.', 'success');
        fetchSettingsAndStatus();
      } else {
        showStatus('Failed to disconnect Google connection.', 'error');
      }
    } catch (err) {
      showStatus('Network error disconnecting Google.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Connect (Business API)
  const handleConnectWhatsApp = async () => {
    if (!whatsappToken || !whatsappPhoneId) {
      showStatus('Please enter both WhatsApp token and Phone Number ID.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_api_token: whatsappToken,
          whatsapp_phone_number_id: whatsappPhoneId,
        }),
      });

      if (res.ok) {
        showStatus('WhatsApp Business API connected.', 'success');
        setWhatsappStep(3);
        fetchSettingsAndStatus();
      } else {
        showStatus('Failed to connect WhatsApp credentials.', 'error');
      }
    } catch (err) {
      showStatus('WhatsApp connection network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Connect (QR Code)
  const handleSimulateQRScan = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/whatsapp/connect-qr', {
        method: 'POST',
      });
      if (res.ok) {
        showStatus('QR Code scanned successfully!', 'success');
        setWhatsappStep(3);
        fetchSettingsAndStatus();
      } else {
        showStatus('Failed to simulate QR scan.', 'error');
      }
    } catch (err) {
      showStatus('Network error simulating QR scan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Disconnect
  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Disconnect WhatsApp integration?')) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        showStatus('WhatsApp integration disconnected.', 'success');
        setWhatsappToken('');
        setWhatsappPhoneId('');
        setWhatsappStep(1);
        setConnectionTestResult('');
        fetchSettingsAndStatus();
      } else {
        showStatus('Failed to disconnect WhatsApp integration.', 'error');
      }
    } catch (err) {
      showStatus('Network error disconnecting WhatsApp.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp Test Connection
  const handleTestWhatsAppConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult('Testing...');
    try {
      const res = await authFetch('/api/auth/whatsapp/test-connection');
      if (res.ok) {
        const data = await res.json();
        setConnectionTestResult(data.message);
      } else {
        setConnectionTestResult('🔴 Test failed');
      }
    } catch (err) {
      setConnectionTestResult('🔴 Connection error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Google AI Key test connection
  const handleTestGoogleAIConnection = async () => {
    if (!googleAiKey) {
      showStatus('Please enter a Google AI API key to test.', 'error');
      return;
    }
    setTestingConnection(true);
    try {
      const res = await authFetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_ai_api_key: googleAiKey }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showStatus(data.message || 'Test Connection Successful!', 'success');
      } else {
        showStatus(data.error || 'Test Connection Failed.', 'error');
      }
    } catch (err) {
      showStatus('Network error while testing Google AI connection.', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const accentColors = [
    { name: 'Blue', hex: '#0071e3' },
    { name: 'Green', hex: '#34c759' },
    { name: 'Red', hex: '#ff3b30' },
    { name: 'Orange', hex: '#ff9500' },
    { name: 'Purple', hex: '#af52de' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-1">
          Configure profile details, OAuth access endpoints, and design system modes.
        </p>
      </div>

      {/* Status banner */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-apple text-xs font-semibold flex items-center gap-2 border animate-in slide-in-from-top-4 duration-300 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Settings layout split: navigation left, content card right */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-apple text-xs font-bold transition-all text-left ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-sf-bg-elevatedDark text-apple-blue shadow-apple-sm border border-border/80'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark/85 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
            }`}
          >
            <UserIcon size={14} />
            Profile details
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-apple text-xs font-bold transition-all text-left ${
              activeTab === 'integrations'
                ? 'bg-white dark:bg-sf-bg-elevatedDark text-apple-blue shadow-apple-sm border border-border/80'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark/85 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
            }`}
          >
            <Sliders size={14} />
            Integration APIs
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-apple text-xs font-bold transition-all text-left ${
              activeTab === 'appearance'
                ? 'bg-white dark:bg-sf-bg-elevatedDark text-apple-blue shadow-apple-sm border border-border/80'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark/85 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
            }`}
          >
            <Palette size={14} />
            Appearance theme
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-apple text-xs font-bold transition-all text-left ${
              activeTab === 'api-keys'
                ? 'bg-white dark:bg-sf-bg-elevatedDark text-apple-blue shadow-apple-sm border border-border/80'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark/85 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
            }`}
          >
            <Key size={14} />
            API Keys (MCP)
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-apple text-xs font-bold transition-all text-left ${
              activeTab === 'about'
                ? 'bg-white dark:bg-sf-bg-elevatedDark text-apple-blue shadow-apple-sm border border-border/80'
                : 'text-sf-text-secondaryLight dark:text-sf-text-secondaryDark/85 hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark hover:text-foreground'
            }`}
          >
            <Info size={14} />
            About version
          </button>
        </div>

        {/* Content Area (3 cols) */}
        <div className="md:col-span-3">
          <Card className="min-h-[460px] flex flex-col">
            
            {/* Tab 1: Profile details */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="flex-1 flex flex-col p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold">Profile details</h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                    Update your display name, photo, and password configuration.
                  </p>
                </div>

                <div className="space-y-4 flex-1">
                  {/* Avatar Upload Section */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        {profileAvatar ? (
                          <img
                            src={profileAvatar}
                            alt="Profile avatar"
                            className="w-16 h-16 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-apple-blue/10 border-2 border-border flex items-center justify-center">
                            <span className="text-lg font-bold text-apple-blue">
                              {profileName ? profileName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        {avatarUploading && (
                          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                            <Loader2 size={20} className="text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="px-3.5 py-1.5 bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple text-xs font-semibold hover:bg-apple-gray/80 dark:hover:bg-sf-bg-elevatedDark/80 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Camera size={12} />
                          {avatarUploading ? 'Uploading...' : 'Change Photo'}
                        </button>
                        <p className="text-[10px] text-sf-text-secondaryLight">
                          JPG, PNG, GIF or WebP. Max 5MB.
                        </p>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue transition-all"
                      placeholder="e.g. Founder One"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Reset Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue transition-all"
                        placeholder="Leave blank to keep current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-sf-text-secondaryLight"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !profileName.trim()}
                    className="px-4 py-2 bg-apple-blue hover:bg-apple-blueHover disabled:bg-apple-blue/50 text-white text-xs font-semibold rounded-apple transition-colors shadow-apple-sm"
                  >
                    {loading ? 'Saving details...' : 'Save Profile details'}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Integrations */}
            {activeTab === 'integrations' && (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold">Integrations Status</h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                    Connect Google workspace credentials and configure keys for WhatsApp and Gemini AI Studio.
                  </p>
                </div>

                <div className="space-y-5 flex-1 max-h-[380px] overflow-y-auto pr-2 no-scrollbar">
                  
                  {/* Google OAuth Card */}
                  <div className="p-4 border border-border rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold">Google Calendar & Gmail API</h4>
                        <p className="text-[11px] text-sf-text-secondaryLight">
                          Handles auto Google Meet link generation and CRM email syncing.
                        </p>
                      </div>
                      <Badge variant={integrationStatus?.google.connected ? 'success' : 'secondary'}>
                        {integrationStatus?.google.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>

                    {integrationStatus?.google.connected && (
                      <div className="bg-white dark:bg-sf-bg-elevatedDark border border-border p-3 rounded-apple text-[11px] space-y-1 text-sf-text-primaryLight dark:text-sf-text-primaryDark">
                        <p><strong>Connected Account:</strong> {integrationStatus.google.email}</p>
                        <p><strong>Scopes:</strong> {integrationStatus.google.scopes.join(', ')}</p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      {integrationStatus?.google.connected ? (
                        <button
                          type="button"
                          onClick={handleDisconnectGoogle}
                          disabled={loading}
                          className="px-3.5 py-1.5 bg-apple-red/10 text-apple-red hover:bg-apple-red/20 text-xs font-bold rounded-apple transition-colors"
                        >
                          Disconnect Account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectGoogle}
                          disabled={loading}
                          className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                        >
                          Connect Google Workspace
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Cloud Config Card */}
                  <div className="p-5 border border-border rounded-apple bg-apple-gray/35 dark:bg-sf-bg-elevatedDark/15 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold">WhatsApp Integration Wizard</h4>
                        <p className="text-[11px] text-sf-text-secondaryLight">
                          Set up connection via QR Code scan simulation or official Business API.
                        </p>
                      </div>
                      <Badge variant={integrationStatus?.whatsapp.connected ? 'success' : 'secondary'}>
                        {integrationStatus?.whatsapp.connected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-medium text-sf-text-secondaryLight">
                      <span className={`px-2 py-0.5 rounded-full ${whatsappStep >= 1 ? 'bg-apple-blue text-white' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark/40'}`}>1. Mode</span>
                      <span className="w-4 h-[1px] bg-border" />
                      <span className={`px-2 py-0.5 rounded-full ${whatsappStep >= 2 ? 'bg-apple-blue text-white' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark/40'}`}>2. Setup</span>
                      <span className="w-4 h-[1px] bg-border" />
                      <span className={`px-2 py-0.5 rounded-full ${whatsappStep >= 3 ? 'bg-apple-blue text-white' : 'bg-apple-gray dark:bg-sf-bg-elevatedDark/40'}`}>3. Status</span>
                    </div>

                    {/* Wizard Steps */}
                    {whatsappStep === 1 && (
                      <div className="space-y-4">
                        <p className="text-[11px] font-semibold text-sf-text-secondaryLight">Step 1: Choose Connection Mode</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsappModeSel('qr');
                              setWhatsappStep(2);
                            }}
                            className={`p-4 text-left border rounded-apple transition-all hover:border-apple-blue/50 ${whatsappModeSel === 'qr' ? 'border-apple-blue bg-apple-blue/5' : 'border-border bg-apple-gray/20'}`}
                          >
                            <h5 className="text-xs font-bold mb-1">QR Code Scan (Simulated)</h5>
                            <p className="text-[10px] text-sf-text-secondaryLight leading-relaxed">
                              Quick scan connection setup. Read-only communication syncing. Best for testing.
                            </p>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setWhatsappModeSel('business');
                              setWhatsappStep(2);
                            }}
                            className={`p-4 text-left border rounded-apple transition-all hover:border-apple-blue/50 ${whatsappModeSel === 'business' ? 'border-apple-blue bg-apple-blue/5' : 'border-border bg-apple-gray/20'}`}
                          >
                            <h5 className="text-xs font-bold mb-1">Official Business API</h5>
                            <p className="text-[10px] text-sf-text-secondaryLight leading-relaxed">
                              Send & receive templates. Full bidirectional messaging support. Requires FB Developer portal setup.
                            </p>
                          </button>
                        </div>
                      </div>
                    )}

                    {whatsappStep === 2 && whatsappModeSel === 'qr' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-sf-text-secondaryLight">Step 2: Scan QR Code</p>
                          <button type="button" onClick={() => setWhatsappStep(1)} className="text-[11px] text-apple-blue hover:underline">
                            Back
                          </button>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-apple bg-white dark:bg-sf-bg-elevatedDark space-y-3">
                          <div className="w-32 h-32 bg-apple-gray dark:bg-sf-bg-elevatedDark/40 flex items-center justify-center rounded border border-border relative overflow-hidden">
                            <div className="grid grid-cols-3 gap-2 p-3 opacity-90">
                              <div className="w-6 h-6 border-4 border-black dark:border-white rounded-sm" />
                              <div className="w-6 h-6 bg-black dark:bg-white" />
                              <div className="w-6 h-6 border-4 border-black dark:border-white rounded-sm" />
                              <div className="w-6 h-6 bg-black dark:bg-white" />
                              <div className="w-6 h-6" />
                              <div className="w-6 h-6 bg-black dark:bg-white" />
                              <div className="w-6 h-6 border-4 border-black dark:border-white rounded-sm" />
                              <div className="w-6 h-6 bg-black dark:bg-white" />
                              <div className="w-6 h-6" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-apple-blue/20 to-transparent animate-pulse" />
                          </div>
                          <p className="text-[10px] text-sf-text-secondaryLight text-center">
                            Scan this simulated QR code to connect your account.
                          </p>
                          <button
                            type="button"
                            onClick={handleSimulateQRScan}
                            disabled={loading}
                            className="px-4 py-2 bg-apple-blue hover:bg-apple-blueHover text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                          >
                            Simulate Scan & Connect
                          </button>
                        </div>
                      </div>
                    )}

                    {whatsappStep === 2 && whatsappModeSel === 'business' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-sf-text-secondaryLight">Step 2: Business API Credentials</p>
                          <button type="button" onClick={() => setWhatsappStep(1)} className="text-[11px] text-apple-blue hover:underline">
                            Back
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                              Phone Number ID
                            </label>
                            <input
                              type="text"
                              value={whatsappPhoneId}
                              onChange={(e) => setWhatsappPhoneId(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
                              placeholder="e.g. 102983748271"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                              API Token
                            </label>
                            <input
                              type="password"
                              value={whatsappToken}
                              onChange={(e) => setWhatsappToken(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
                              placeholder="e.g. EAAG..."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleConnectWhatsApp}
                            disabled={loading || !whatsappToken || !whatsappPhoneId}
                            className="px-4 py-2 bg-apple-blue hover:bg-apple-blueHover disabled:bg-apple-blue/50 text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                          >
                            Save & Connect
                          </button>
                        </div>
                      </div>
                    )}

                    {whatsappStep === 3 && (
                      <div className="space-y-4">
                        <p className="text-[11px] font-semibold text-sf-text-secondaryLight">Step 3: Verification & Connection Status</p>
                        <div className="p-4 rounded-apple bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/10 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-sf-text-secondaryLight">Active Mode:</span>
                            <span className="font-semibold uppercase text-[10px] bg-apple-gray dark:bg-sf-bg-elevatedDark px-2 py-0.5 rounded-full">
                              {whatsappModeSel === 'qr' ? 'QR Code' : 'Business API'}
                            </span>
                          </div>
                          {connectionTestResult && (
                            <div className="text-xs flex items-center justify-between">
                              <span className="text-sf-text-secondaryLight">Test Results:</span>
                              <span className="font-semibold">{connectionTestResult}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <button
                            type="button"
                            onClick={handleDisconnectWhatsApp}
                            disabled={loading}
                            className="px-3.5 py-1.5 bg-apple-red/10 text-apple-red hover:bg-apple-red/20 text-xs font-bold rounded-apple transition-colors"
                          >
                            Disconnect Integration
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setWhatsappStep(1)}
                              className="px-3.5 py-1.5 border border-border hover:bg-apple-gray dark:hover:bg-sf-bg-elevatedDark/10 text-xs font-bold rounded-apple transition-colors"
                            >
                              Change Mode
                            </button>
                            <button
                              type="button"
                              onClick={handleTestWhatsAppConnection}
                              disabled={testingConnection}
                              className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm flex items-center gap-1"
                            >
                              {testingConnection ? 'Testing...' : 'Test Connection'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google AI Studio API Key Card */}
                  <div className="p-4 border border-border rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold">Google AI Studio (Gemini/Imagen/Veo) Key</h4>
                        <p className="text-[11px] text-sf-text-secondaryLight">
                          Authenticates Imagen 3 image generation and Veo 2 video generation prompts.
                        </p>
                      </div>
                      <Badge variant={integrationStatus?.google_ai.connected ? 'success' : 'secondary'}>
                        {integrationStatus?.google_ai.connected
                          ? integrationStatus.google_ai.status === 'mock'
                            ? 'Mock Mode'
                            : 'Active Key'
                          : 'Not Set'}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                        Google AI Studio API Key
                      </label>
                      <input
                        type="password"
                        value={googleAiKey}
                        onChange={(e) => setGoogleAiKey(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none"
                        placeholder="e.g. AIzaSy..."
                      />
                    </div>

                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={handleTestGoogleAIConnection}
                        disabled={testingConnection || !googleAiKey}
                        className="px-3.5 py-1.5 border border-border bg-white dark:bg-sf-bg-elevatedDark hover:bg-apple-gray text-xs font-bold rounded-apple transition-colors flex items-center gap-1.5"
                      >
                        {testingConnection ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                        <span>Test Connection</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveIntegrations}
                        disabled={loading || !googleAiKey}
                        className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover disabled:bg-apple-blue/50 text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                      >
                        Save Credentials
                      </button>
                    </div>
                  </div>

                  {/* Fathom Info Card */}
                  <div className="p-4 border border-border rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold">Fathom AI Transcription</h4>
                      <p className="text-[11px] text-sf-text-secondaryLight">
                        Meeting highlights are parsed automatically when recording URLs are pasted.
                      </p>
                    </div>
                    <Badge variant="success">Online</Badge>
                  </div>

                </div>
              </div>
            )}

            {/* Tab 3: Appearance */}
            {activeTab === 'appearance' && (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold">Appearance theme</h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                    Customize the styling mode, color theme, and spacing density.
                  </p>
                </div>

                <div className="space-y-5 flex-1">
                  
                  {/* Theme Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Interface Theme Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setThemeMode(mode)}
                          className={`py-3 px-4 rounded-apple border text-xs font-bold capitalize transition-all text-center ${
                            themeMode === mode
                              ? 'bg-apple-blue/5 border-apple-blue text-apple-blue'
                              : 'bg-white dark:bg-sf-bg-elevatedDark border-border hover:bg-apple-gray text-foreground'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accent Color Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Accent Brand Color
                    </label>
                    <div className="flex items-center gap-3">
                      {accentColors.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setAccentColor(color.hex)}
                          className="h-10 w-10 rounded-full border border-border flex items-center justify-center transition-transform hover:scale-105 relative"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {accentColor === color.hex && (
                            <Check size={16} className="text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Density Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-sf-text-secondaryLight uppercase tracking-wider block">
                      Spacing Grid Density
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['comfortable', 'compact'] as const).map((dens) => (
                        <button
                          key={dens}
                          type="button"
                          onClick={() => setDensity(dens)}
                          className={`py-3 px-4 rounded-apple border text-xs font-bold capitalize transition-all text-center ${
                            density === dens
                              ? 'bg-apple-blue/5 border-apple-blue text-apple-blue'
                              : 'bg-white dark:bg-sf-bg-elevatedDark border-border hover:bg-apple-gray text-foreground'
                          }`}
                        >
                          {dens}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAppearance}
                    disabled={loading}
                    className="px-4 py-2 bg-apple-blue hover:bg-apple-blueHover text-white text-xs font-semibold rounded-apple transition-colors shadow-apple-sm"
                  >
                    {loading ? 'Saving theme...' : 'Save Theme Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 4: About */}
            {activeTab === 'about' && (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold">About Isocodelabs Ops Hub</h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                    Platform specifications, active versions, and connected microservices.
                  </p>
                </div>

                <div className="space-y-4 flex-1 text-xs">
                  <div className="p-4 border border-border rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 space-y-2">
                    <p className="flex justify-between">
                      <span className="font-bold text-sf-text-secondaryLight">Version</span>
                      <span className="font-mono">v1.1.0-stable</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-bold text-sf-text-secondaryLight">Build Target</span>
                      <span className="font-mono">Next.js 14 / React 18</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-bold text-sf-text-secondaryLight">PostgreSQL Cluster</span>
                      <span className="font-mono">wsl-port-5432</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="font-bold text-sf-text-secondaryLight">Prisma Engine</span>
                      <span className="font-mono">v5.22.0</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-[10px] uppercase tracking-wider text-sf-text-secondaryLight">
                      Connected Services Status Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Google AI Imagen Endpoint</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Google AI Veo Endpoint</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Gmail Communications Import</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>WhatsApp Business Webhooks</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Vertex AI Gemini Fact-checking</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Real-time Socket.io channels</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-between items-center text-[10px] text-sf-text-secondaryLight font-mono">
                  <span>© 2026 Isocodelabs</span>
                  <span>Internal Operations Console</span>
                </div>
              </div>
            )}

            {activeTab === 'api-keys' && (
              <div className="flex-1 flex flex-col p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <Key size={16} className="text-apple-blue" />
                    API Keys & Model Context Protocol (MCP)
                  </h3>
                  <p className="text-xs text-sf-text-secondaryLight dark:text-sf-text-secondaryDark mt-0.5">
                    Generate secure keys to connect External AI agents (like Claude Desktop) to your internal ops database.
                  </p>
                </div>

                {/* Secure key generation alert */}
                {generatedKeyAlert && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <AlertCircle size={16} />
                      <span>Copy Your API Key Now</span>
                    </div>
                    <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      For security, we hash your key and can never display it to you again. Copy it now to a secure password manager.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-lg text-xs font-mono select-all truncate block">
                        {generatedKeyAlert}
                      </code>
                      <Button
                        onClick={() => handleCopy(generatedKeyAlert)}
                        className="h-9 px-3 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-lg flex items-center justify-center gap-1"
                      >
                        <Copy size={13} />
                        Copy
                      </Button>
                      <button
                        onClick={() => setGeneratedKeyAlert(null)}
                        className="text-xs text-sf-text-secondaryLight hover:text-foreground px-2 py-1 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* Key Generator Form */}
                <form onSubmit={handleGenerateKey} className="p-4 border border-border rounded-xl bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/10 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                      Key Name
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={apiKeyName}
                        onChange={e => setApiKeyName(e.target.value)}
                        placeholder="e.g. Claude Desktop Laptop"
                        required
                        className="h-9 text-xs rounded-lg"
                      />
                      <Button
                        type="submit"
                        disabled={loading || !apiKeyName.trim()}
                        className="h-9 bg-apple-blue hover:bg-apple-blue-hover text-white rounded-lg px-4 gap-1"
                      >
                        <Plus size={14} />
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block">
                      Permissions Scope
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keyPermissions.includes('*')}
                          onChange={e => {
                            if (e.target.checked) setKeyPermissions(['*']);
                            else setKeyPermissions([]);
                          }}
                          className="w-3.5 h-3.5 text-apple-blue border-border rounded"
                        />
                        <span className="font-semibold text-apple-blue">Full Access (*)</span>
                      </label>
                      {!keyPermissions.includes('*') && (
                        <>
                          {['create_task', 'create_idea', 'add_client_note', 'log_communication', 'add_expense', 'resources'].map(p => (
                            <label key={p} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={keyPermissions.includes(p)}
                                onChange={e => {
                                  if (e.target.checked) setKeyPermissions(prev => [...prev.filter(item => item !== '*'), p]);
                                  else setKeyPermissions(prev => prev.filter(item => item !== p));
                                }}
                                className="w-3.5 h-3.5 text-apple-blue border-border rounded"
                              />
                              <span className="capitalize">{p.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </form>

                {/* API Keys Ledger List */}
                <div className="space-y-2 flex-1">
                  <span className="text-[11px] font-bold text-sf-text-secondaryLight dark:text-sf-text-secondaryDark uppercase tracking-wider block">
                    Active API Keys Ledger
                  </span>

                  {apiKeys.length === 0 ? (
                    <div className="p-8 text-center text-sf-text-secondaryLight bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/10 border border-dashed rounded-xl">
                      <p className="text-xs">No API Keys generated yet. Create one above to get started.</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden bg-card text-xs">
                      <div className="divide-y divide-border">
                        {apiKeys.map(k => (
                          <div key={k.id} className="p-3.5 flex items-center justify-between flex-wrap gap-2 hover:bg-apple-gray/20 dark:hover:bg-sf-bg-elevatedDark/10 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{k.name}</span>
                                {k.is_active ? (
                                  <Badge variant="success" className="text-[9px] uppercase tracking-wider scale-90">Active</Badge>
                                ) : (
                                  <Badge variant="danger" className="text-[9px] uppercase tracking-wider scale-90">Revoked</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                                <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                                <span>·</span>
                                <span>Last Used: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {k.permissions.map((p: string) => (
                                  <span key={p} className="px-1.5 py-0.5 bg-apple-gray dark:bg-neutral-800 text-sf-text-secondaryLight border border-border/40 rounded text-[9px] font-mono">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              {k.is_active && (
                                <button
                                  onClick={() => handleRevokeKey(k.id)}
                                  className="p-1.5 rounded-lg text-sf-text-secondaryLight hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-semibold"
                                  title="Revoke Key"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              {!k.is_active && k.revoked_at && (
                                <span className="text-[10px] text-sf-text-secondaryLight italic">
                                  Revoked {new Date(k.revoked_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Claude Desktop Config Integration Example */}
                <div className="p-4 border border-border rounded-xl bg-apple-gray/20 dark:bg-sf-bg-elevatedDark/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Terminal size={14} className="text-apple-blue" />
                      <span>Claude Desktop Configuration Example</span>
                    </div>
                    <button
                      onClick={() => handleCopy(JSON.stringify({
                        mcpServers: {
                          "isocodelabs-ops": {
                            "command": "npx",
                            "args": [
                              "-y",
                              "@modelcontextprotocol/server-http",
                              "--url",
                              "http://localhost:3000/api/mcp",
                              "--header",
                              "X-API-Key: YOUR_API_KEY_HERE"
                            ]
                          }
                        }
                      }, null, 2))}
                      className="text-[10px] text-apple-blue hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Copy size={10} /> Copy JSON
                    </button>
                  </div>
                  <p className="text-[11px] text-sf-text-secondaryLight dark:text-sf-text-secondaryDark">
                    Add this to your Claude Desktop config file to link Claude directly to your console tools and resources:
                  </p>
                  <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg text-[10px] font-mono overflow-x-auto border border-neutral-800">
{`{
  "mcpServers": {
    "isocodelabs-ops": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-http",
        "--url",
        "http://localhost:3000/api/mcp",
        "--header",
        "X-API-Key: YOUR_API_KEY_HERE"
      ]
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
