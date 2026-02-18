// src/app/admin/settings/EmailSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  Mail,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Send,
  RefreshCw,
  Shield,
} from 'lucide-react';

interface EmailConfig {
  configured: boolean;
  connected: boolean;
  error?: string;
  details?: {
    host: string;
    port: number;
    user: string;
  };
}

export default function EmailSettings() {
  const { address } = useAccount();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    messageId?: string;
  } | null>(null);

  // Fetch email configuration status
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/email/test', {
        headers: { 'x-wallet-address': address || '' },
      });
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching email config:', error);
      setConfig({ configured: false, connected: false, error: 'Failed to fetch configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchConfig();
    }
  }, [address]);

  // Send test email
  const handleSendTest = async () => {
    if (!testEmail) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address || '',
        },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Test email sent successfully!',
          messageId: data.messageId,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test email',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-400">Checking email configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Email Configuration</h3>
            <p className="text-sm text-gray-400">SMTP settings for sending notifications</p>
          </div>
        </div>
        <button
          onClick={fetchConfig}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Card */}
      <div className={`rounded-xl p-6 border ${
        config?.connected 
          ? 'bg-green-500/10 border-green-500/30' 
          : config?.configured 
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            config?.connected 
              ? 'bg-green-500/20' 
              : config?.configured 
                ? 'bg-yellow-500/20'
                : 'bg-red-500/20'
          }`}>
            {config?.connected ? (
              <CheckCircle2 className="h-6 w-6 text-green-400" />
            ) : config?.configured ? (
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            ) : (
              <XCircle className="h-6 w-6 text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold ${
              config?.connected 
                ? 'text-green-400' 
                : config?.configured 
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }`}>
              {config?.connected 
                ? 'Email Service Connected' 
                : config?.configured 
                  ? 'Connection Failed'
                  : 'Email Not Configured'}
            </h4>
            <p className="text-sm text-gray-400 mt-1">
              {config?.connected 
                ? 'Your SMTP server is configured and ready to send emails.'
                : config?.error || 'Configure SMTP settings in environment variables.'}
            </p>
          </div>
        </div>

        {/* Connection Details */}
        {config?.details && (
          <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Host</p>
              <p className="text-sm text-white font-mono">{config.details.host}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Port</p>
              <p className="text-sm text-white font-mono">{config.details.port}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">User</p>
              <p className="text-sm text-white font-mono truncate">{config.details.user}</p>
            </div>
          </div>
        )}
      </div>

      {/* Test Email Section */}
      {config?.connected && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-400" />
            Send Test Email
          </h4>
          
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSendTest}
              disabled={testing || !testEmail}
              className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test
                </>
              )}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                  {testResult.message}
                </span>
              </div>
              {testResult.messageId && (
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  Message ID: {testResult.messageId}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Configuration Help */}
      {!config?.configured && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-400" />
            How to Configure
          </h4>
          <p className="text-sm text-gray-400 mb-4">
            Add these environment variables to your <code className="bg-gray-900 px-2 py-1 rounded">.env.local</code> file:
          </p>
          <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
{`# SMTP Configuration
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM="RWA Platform" <notifications@yourdomain.com>`}
          </pre>
        </div>
      )}
    </div>
  );
}
