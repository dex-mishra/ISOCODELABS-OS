'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'integrations' | 'appearance' | 'about'>('profile');

  // Loaders & Message states
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // 1. Profile State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar_url || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2. Integrations Configuration State
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [googleAiKey, setGoogleAiKey] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');

  // 3. Appearance Options State
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');
  const [accentColor, setAccentColor] = useState('#0071e3');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Load Initial Settings & Integrations status
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileAvatar(user.avatar_url || '');
    }
    fetchSettingsAndStatus();
  }, [user]);

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

  // WhatsApp Connect
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

  // WhatsApp Disconnect
  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Disconnect WhatsApp Business integration?')) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/auth/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        showStatus('WhatsApp integration disconnected.', 'success');
        setWhatsappToken('');
        setWhatsappPhoneId('');
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
                    Update your display name, avatar link, and password configuration.
                  </p>
                </div>

                <div className="space-y-4 flex-1">
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
                      Avatar Image URL
                    </label>
                    <input
                      type="url"
                      value={profileAvatar}
                      onChange={(e) => setProfileAvatar(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-apple-gray dark:bg-sf-bg-elevatedDark border border-border rounded-apple focus:outline-none focus:ring-1 focus:ring-apple-blue focus:border-apple-blue transition-all"
                      placeholder="e.g. https://images.unsplash.com/photo..."
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
                  <div className="p-4 border border-border rounded-apple bg-apple-gray/30 dark:bg-sf-bg-elevatedDark/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold">WhatsApp Business API</h4>
                        <p className="text-[11px] text-sf-text-secondaryLight">
                          Configures the client chat syncing.
                        </p>
                      </div>
                      <Badge variant={integrationStatus?.whatsapp.connected ? 'success' : 'secondary'}>
                        {integrationStatus?.whatsapp.connected ? 'Configured' : 'Missing Credentials'}
                      </Badge>
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

                    <div className="flex justify-end gap-2.5">
                      {integrationStatus?.whatsapp.connected && (
                        <button
                          type="button"
                          onClick={handleDisconnectWhatsApp}
                          disabled={loading}
                          className="px-3.5 py-1.5 bg-apple-red/10 text-apple-red hover:bg-apple-red/20 text-xs font-bold rounded-apple transition-colors"
                        >
                          Disconnect WhatsApp
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleConnectWhatsApp}
                        disabled={loading || !whatsappToken || !whatsappPhoneId}
                        className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover disabled:bg-apple-blue/50 text-white text-xs font-bold rounded-apple transition-colors shadow-apple-sm"
                      >
                        Connect WhatsApp
                      </button>
                    </div>
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

          </Card>
        </div>

      </div>
    </div>
  );
}
