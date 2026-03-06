// src/app/settings/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Globe,
  Shield,
  DollarSign,
  FileText,
  Ship,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Save,
  MessageSquare,
  Users,
  Wallet,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  Zap,
  BellRing,
  BellOff,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type NotificationChannel = 'email' | 'push' | 'inApp' | 'sms';
type NotificationCategory = 
  | 'trade' 
  | 'kyc' 
  | 'payment' 
  | 'document' 
  | 'dispute' 
  | 'security' 
  | 'system' 
  | 'marketing';

interface NotificationPreference {
  category: NotificationCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms: boolean;
  };
  subcategories?: {
    id: string;
    label: string;
    channels: {
      email: boolean;
      push: boolean;
      inApp: boolean;
      sms: boolean;
    };
  }[];
}

interface NotificationSettings {
  preferences: NotificationPreference[];
  globalSettings: {
    emailDigest: 'realtime' | 'daily' | 'weekly' | 'never';
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
    soundEnabled: boolean;
    desktopNotifications: boolean;
  };
  contactInfo: {
    email: string;
    phone: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

// =============================================================================
// DEFAULT PREFERENCES
// =============================================================================

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  {
    category: 'trade',
    label: 'Trade Activity',
    description: 'Updates about your trade deals and transactions',
    icon: <Ship className="h-5 w-5" />,
    channels: { email: true, push: true, inApp: true, sms: false },
    subcategories: [
      { id: 'trade_new', label: 'New deal invitations', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'trade_status', label: 'Deal status changes', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'trade_milestone', label: 'Milestone completions', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'trade_message', label: 'New messages', channels: { email: false, push: true, inApp: true, sms: false } },
      { id: 'trade_deadline', label: 'Deadline reminders', channels: { email: true, push: true, inApp: true, sms: true } },
    ],
  },
  {
    category: 'payment',
    label: 'Payments & Escrow',
    description: 'Payment releases, deposits, and escrow updates',
    icon: <DollarSign className="h-5 w-5" />,
    channels: { email: true, push: true, inApp: true, sms: true },
    subcategories: [
      { id: 'payment_received', label: 'Payments received', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'payment_sent', label: 'Payments sent', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'payment_pending', label: 'Pending approvals', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'escrow_funded', label: 'Escrow funded', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'escrow_released', label: 'Escrow released', channels: { email: true, push: true, inApp: true, sms: true } },
    ],
  },
  {
    category: 'document',
    label: 'Documents',
    description: 'Document uploads, verifications, and requests',
    icon: <FileText className="h-5 w-5" />,
    channels: { email: true, push: false, inApp: true, sms: false },
    subcategories: [
      { id: 'doc_uploaded', label: 'New document uploads', channels: { email: true, push: false, inApp: true, sms: false } },
      { id: 'doc_verified', label: 'Document verified', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'doc_rejected', label: 'Document rejected', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'doc_request', label: 'Document requests', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'doc_expiring', label: 'Expiring documents', channels: { email: true, push: false, inApp: true, sms: false } },
    ],
  },
  {
    category: 'dispute',
    label: 'Disputes',
    description: 'Dispute updates and resolution notifications',
    icon: <AlertTriangle className="h-5 w-5" />,
    channels: { email: true, push: true, inApp: true, sms: true },
    subcategories: [
      { id: 'dispute_opened', label: 'New dispute opened', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'dispute_update', label: 'Dispute updates', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'dispute_resolved', label: 'Dispute resolved', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'dispute_action', label: 'Action required', channels: { email: true, push: true, inApp: true, sms: true } },
    ],
  },
  {
    category: 'kyc',
    label: 'KYC & Verification',
    description: 'Identity verification and compliance updates',
    icon: <Shield className="h-5 w-5" />,
    channels: { email: true, push: true, inApp: true, sms: false },
    subcategories: [
      { id: 'kyc_approved', label: 'KYC approved', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'kyc_rejected', label: 'KYC rejected', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'kyc_expiring', label: 'KYC expiring', channels: { email: true, push: false, inApp: true, sms: false } },
      { id: 'kyc_upgrade', label: 'Upgrade available', channels: { email: true, push: false, inApp: true, sms: false } },
    ],
  },
  {
    category: 'security',
    label: 'Security',
    description: 'Login alerts and security notifications',
    icon: <Wallet className="h-5 w-5" />,
    channels: { email: true, push: true, inApp: true, sms: true },
    subcategories: [
      { id: 'security_login', label: 'New login detected', channels: { email: true, push: true, inApp: true, sms: false } },
      { id: 'security_wallet', label: 'Wallet changes', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'security_suspicious', label: 'Suspicious activity', channels: { email: true, push: true, inApp: true, sms: true } },
      { id: 'security_2fa', label: '2FA updates', channels: { email: true, push: false, inApp: true, sms: false } },
    ],
  },
  {
    category: 'system',
    label: 'System',
    description: 'Platform updates and maintenance notices',
    icon: <Settings className="h-5 w-5" />,
    channels: { email: true, push: false, inApp: true, sms: false },
    subcategories: [
      { id: 'system_maintenance', label: 'Scheduled maintenance', channels: { email: true, push: false, inApp: true, sms: false } },
      { id: 'system_updates', label: 'Platform updates', channels: { email: true, push: false, inApp: true, sms: false } },
      { id: 'system_features', label: 'New features', channels: { email: true, push: false, inApp: true, sms: false } },
    ],
  },
  {
    category: 'marketing',
    label: 'Marketing & Promotions',
    description: 'News, offers, and promotional content',
    icon: <Zap className="h-5 w-5" />,
    channels: { email: false, push: false, inApp: false, sms: false },
    subcategories: [
      { id: 'marketing_newsletter', label: 'Newsletter', channels: { email: false, push: false, inApp: false, sms: false } },
      { id: 'marketing_offers', label: 'Special offers', channels: { email: false, push: false, inApp: false, sms: false } },
      { id: 'marketing_events', label: 'Events & webinars', channels: { email: false, push: false, inApp: false, sms: false } },
    ],
  },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

// =============================================================================
// COMPONENTS
// =============================================================================

function ChannelToggle({
  channel,
  enabled,
  onChange,
  disabled = false,
}: {
  channel: NotificationChannel;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const icons: Record<NotificationChannel, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    push: <Smartphone className="h-4 w-4" />,
    inApp: <Bell className="h-4 w-4" />,
    sms: <MessageSquare className="h-4 w-4" />,
  };

  const labels: Record<NotificationChannel, string> = {
    email: 'Email',
    push: 'Push',
    inApp: 'In-App',
    sms: 'SMS',
  };

  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
        ${enabled 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icons[channel]}
      <span className="hidden sm:inline">{labels[channel]}</span>
    </button>
  );
}

function CategoryCard({
  preference,
  expanded,
  onToggleExpand,
  onToggleChannel,
  onToggleSubcategory,
}: {
  preference: NotificationPreference;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleChannel: (channel: NotificationChannel, enabled: boolean) => void;
  onToggleSubcategory: (subcategoryId: string, channel: NotificationChannel, enabled: boolean) => void;
}) {
  const allEnabled = Object.values(preference.channels).every(v => v);
  const noneEnabled = Object.values(preference.channels).every(v => !v);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${allEnabled ? 'bg-blue-500/20 text-blue-400' : noneEnabled ? 'bg-gray-700 text-gray-500' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {preference.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold">{preference.label}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{preference.description}</p>
            </div>
          </div>
          
          {/* Master Toggle */}
          <button
            onClick={() => {
              const newState = noneEnabled;
              (['email', 'push', 'inApp', 'sms'] as NotificationChannel[]).forEach(ch => {
                onToggleChannel(ch, newState);
              });
            }}
            className={`p-2 rounded-lg transition-colors ${
              allEnabled 
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {allEnabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Channel Toggles */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(['email', 'push', 'inApp', 'sms'] as NotificationChannel[]).map(channel => (
            <ChannelToggle
              key={channel}
              channel={channel}
              enabled={preference.channels[channel]}
              onChange={(enabled) => onToggleChannel(channel, enabled)}
            />
          ))}
        </div>

        {/* Expand Button */}
        {preference.subcategories && preference.subcategories.length > 0 && (
          <button
            onClick={onToggleExpand}
            className="mt-4 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'Show'} detailed settings
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Subcategories */}
      {expanded && preference.subcategories && (
        <div className="border-t border-gray-700/50 bg-gray-900/50">
          {preference.subcategories.map((sub, index) => (
            <div
              key={sub.id}
              className={`p-4 flex items-center justify-between ${
                index < preference.subcategories!.length - 1 ? 'border-b border-gray-700/30' : ''
              }`}
            >
              <span className="text-sm text-gray-300">{sub.label}</span>
              <div className="flex gap-2">
                {(['email', 'push', 'inApp', 'sms'] as NotificationChannel[]).map(channel => (
                  <ChannelToggle
                    key={channel}
                    channel={channel}
                    enabled={sub.channels[channel]}
                    onChange={(enabled) => onToggleSubcategory(sub.id, channel, enabled)}
                    disabled={!preference.channels[channel]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalSettingsCard({
  settings,
  onChange,
}: {
  settings: NotificationSettings['globalSettings'];
  onChange: (settings: NotificationSettings['globalSettings']) => void;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-blue-400" />
        Global Settings
      </h3>

      <div className="space-y-6">
        {/* Email Digest */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Digest Frequency
          </label>
          <select
            value={settings.emailDigest}
            onChange={(e) => onChange({ ...settings, emailDigest: e.target.value as any })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 outline-none"
          >
            <option value="realtime">Real-time (as they happen)</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
            <option value="never">Never (in-app only)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose how often you want to receive email notifications
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timezone
          </label>
          <select
            value={settings.timezone}
            onChange={(e) => onChange({ ...settings, timezone: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 outline-none"
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        {/* Quiet Hours */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Quiet Hours
              </label>
              <p className="text-xs text-gray-500">Pause non-urgent notifications during these hours</p>
            </div>
            <button
              onClick={() => onChange({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.quietHoursEnabled ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {settings.quietHoursEnabled && (
            <div className="flex items-center gap-4 mt-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Start</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => onChange({ ...settings, quietHoursStart: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">End</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => onChange({ ...settings, quietHoursEnd: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sound & Desktop */}
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center justify-between flex-1 p-4 bg-gray-900 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-blue-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-500" />
              )}
              <span className="text-sm text-gray-300">Sound alerts</span>
            </div>
            <button
              onClick={() => onChange({ ...settings, soundEnabled: !settings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.soundEnabled ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between flex-1 p-4 bg-gray-900 rounded-xl border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <Globe className={`h-5 w-5 ${settings.desktopNotifications ? 'text-blue-400' : 'text-gray-500'}`} />
              <span className="text-sm text-gray-300">Desktop notifications</span>
            </div>
            <button
              onClick={() => onChange({ ...settings, desktopNotifications: !settings.desktopNotifications })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.desktopNotifications ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.desktopNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}

function ContactInfoCard({
  contactInfo,
  onChange,
  onVerifyEmail,
  onVerifyPhone,
}: {
  contactInfo: NotificationSettings['contactInfo'];
  onChange: (info: NotificationSettings['contactInfo']) => void;
  onVerifyEmail: () => void;
  onVerifyPhone: () => void;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-400" />
        Contact Information
      </h3>

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => onChange({ ...contactInfo, email: e.target.value, emailVerified: false })}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 outline-none"
              />
            </div>
            {contactInfo.email && (
              contactInfo.emailVerified ? (
                <div className="flex items-center px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-green-400 text-sm">Verified</span>
                </div>
              ) : (
                <button
                  onClick={onVerifyEmail}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  Verify
                </button>
              )
            )}
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number (for SMS)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => onChange({ ...contactInfo, phone: e.target.value, phoneVerified: false })}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-blue-500 outline-none"
              />
            </div>
            {contactInfo.phone && (
              contactInfo.phoneVerified ? (
                <div className="flex items-center px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                  <span className="text-green-400 text-sm">Verified</span>
                </div>
              ) : (
                <button
                  onClick={onVerifyPhone}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  Verify
                </button>
              )
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            SMS notifications are only sent for critical alerts
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NotificationPreferencesPage() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<NotificationCategory>>(new Set());

  const [settings, setSettings] = useState<NotificationSettings>({
    preferences: DEFAULT_PREFERENCES,
    globalSettings: {
      emailDigest: 'realtime',
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: 'UTC',
      soundEnabled: true,
      desktopNotifications: true,
    },
    contactInfo: {
      email: '',
      phone: '',
      emailVerified: false,
      phoneVerified: false,
    },
  });

  // Fetch settings
  useEffect(() => {
    if (!address) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/notifications/preferences', {
          headers: { 'x-wallet-address': address },
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(prev => ({
            ...prev,
            ...data,
            preferences: data.preferences || prev.preferences,
          }));
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [address]);

  // Save settings
  const handleSave = async () => {
    if (!address) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: NotificationCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const updateCategoryChannel = (
    category: NotificationCategory,
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(p => {
        if (p.category !== category) return p;
        return {
          ...p,
          channels: { ...p.channels, [channel]: enabled },
          // Also update subcategories
          subcategories: p.subcategories?.map(sub => ({
            ...sub,
            channels: { ...sub.channels, [channel]: enabled ? sub.channels[channel] : false },
          })),
        };
      }),
    }));
  };

  const updateSubcategoryChannel = (
    category: NotificationCategory,
    subcategoryId: string,
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(p => {
        if (p.category !== category) return p;
        return {
          ...p,
          subcategories: p.subcategories?.map(sub => {
            if (sub.id !== subcategoryId) return sub;
            return {
              ...sub,
              channels: { ...sub.channels, [channel]: enabled },
            };
          }),
        };
      }),
    }));
  };

  const handleVerifyEmail = async () => {
    // TODO: Implement email verification flow
    alert('Verification email sent! Check your inbox.');
  };

  const handleVerifyPhone = async () => {
    // TODO: Implement phone verification flow
    alert('Verification code sent via SMS!');
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <Bell className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Wallet</h1>
          <p className="text-gray-400">Please connect your wallet to manage notification preferences</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading preferences...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-400" />
                Notification Preferences
              </h1>
              <p className="text-gray-400 mt-1">Manage how and when you receive notifications</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              setSettings(prev => ({
                ...prev,
                preferences: prev.preferences.map(p => ({
                  ...p,
                  channels: { email: true, push: true, inApp: true, sms: false },
                  subcategories: p.subcategories?.map(s => ({
                    ...s,
                    channels: { email: true, push: true, inApp: true, sms: false },
                  })),
                })),
              }));
            }}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Enable All
          </button>
          <button
            onClick={() => {
              setSettings(prev => ({
                ...prev,
                preferences: prev.preferences.map(p => ({
                  ...p,
                  channels: { email: false, push: false, inApp: true, sms: false },
                  subcategories: p.subcategories?.map(s => ({
                    ...s,
                    channels: { email: false, push: false, inApp: true, sms: false },
                  })),
                })),
              }));
            }}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            In-App Only
          </button>
          <button
            onClick={() => {
              setSettings(prev => ({
                ...prev,
                preferences: prev.preferences.map(p => ({
                  ...p,
                  channels: { email: false, push: false, inApp: false, sms: false },
                  subcategories: p.subcategories?.map(s => ({
                    ...s,
                    channels: { email: false, push: false, inApp: false, sms: false },
                  })),
                })),
              }));
            }}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Disable All
          </button>
        </div>

        {/* Contact Info */}
        <div className="mb-8">
          <ContactInfoCard
            contactInfo={settings.contactInfo}
            onChange={(contactInfo) => setSettings(prev => ({ ...prev, contactInfo }))}
            onVerifyEmail={handleVerifyEmail}
            onVerifyPhone={handleVerifyPhone}
          />
        </div>

        {/* Global Settings */}
        <div className="mb-8">
          <GlobalSettingsCard
            settings={settings.globalSettings}
            onChange={(globalSettings) => setSettings(prev => ({ ...prev, globalSettings }))}
          />
        </div>

        {/* Category Preferences */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Notification Categories</h2>
          
          {settings.preferences.map(preference => (
            <CategoryCard
              key={preference.category}
              preference={preference}
              expanded={expandedCategories.has(preference.category)}
              onToggleExpand={() => toggleCategory(preference.category)}
              onToggleChannel={(channel, enabled) => 
                updateCategoryChannel(preference.category, channel, enabled)
              }
              onToggleSubcategory={(subId, channel, enabled) =>
                updateSubcategoryChannel(preference.category, subId, channel, enabled)
              }
            />
          ))}
        </div>

        {/* Save Button (mobile) */}
        <div className="mt-8 sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
