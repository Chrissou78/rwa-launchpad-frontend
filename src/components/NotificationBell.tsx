// src/components/NotificationBell.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications, Notification, NotificationType } from '@/lib/notifications/websocket';
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Ship,
  DollarSign,
  FileText,
  AlertTriangle,
  Shield,
  MessageSquare,
  Settings,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// NOTIFICATION ICONS
// =============================================================================

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  trade_update: <Ship className="h-4 w-4" />,
  payment_received: <DollarSign className="h-4 w-4" />,
  payment_sent: <DollarSign className="h-4 w-4" />,
  document_uploaded: <FileText className="h-4 w-4" />,
  document_verified: <FileText className="h-4 w-4" />,
  milestone_completed: <Check className="h-4 w-4" />,
  dispute_opened: <AlertTriangle className="h-4 w-4" />,
  dispute_update: <AlertTriangle className="h-4 w-4" />,
  message_received: <MessageSquare className="h-4 w-4" />,
  kyc_update: <Shield className="h-4 w-4" />,
  system_alert: <Settings className="h-4 w-4" />,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  trade_update: 'bg-cyan-500/20 text-cyan-400',
  payment_received: 'bg-green-500/20 text-green-400',
  payment_sent: 'bg-blue-500/20 text-blue-400',
  document_uploaded: 'bg-purple-500/20 text-purple-400',
  document_verified: 'bg-green-500/20 text-green-400',
  milestone_completed: 'bg-green-500/20 text-green-400',
  dispute_opened: 'bg-red-500/20 text-red-400',
  dispute_update: 'bg-orange-500/20 text-orange-400',
  message_received: 'bg-blue-500/20 text-blue-400',
  kyc_update: 'bg-yellow-500/20 text-yellow-400',
  system_alert: 'bg-gray-500/20 text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'border-gray-700',
  medium: 'border-gray-600',
  high: 'border-yellow-500/50',
  critical: 'border-red-500/50 bg-red-500/5',
};

// =============================================================================
// NOTIFICATION ITEM
// =============================================================================

function NotificationItem({ 
  notification, 
  onMarkAsRead,
  onClose,
}: { 
  notification: Notification;
  onMarkAsRead: () => void;
  onClose: () => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }
    if (notification.actionUrl) {
      onClose();
    }
  };

  const content = (
    <div
      onClick={handleClick}
      className={`
        p-4 border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors cursor-pointer
        ${!notification.read ? 'bg-blue-500/5' : ''}
        ${PRIORITY_COLORS[notification.priority]}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${NOTIFICATION_COLORS[notification.type]}`}>
          {NOTIFICATION_ICONS[notification.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className={`text-sm font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return <Link href={notification.actionUrl}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// NOTIFICATION BELL
// =============================================================================

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    connected,
    connecting,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestPermission,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request notification permission on first open
  useEffect(() => {
    if (isOpen && 'Notification' in window && Notification.permission === 'default') {
      requestPermission();
    }
  }, [isOpen, requestPermission]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors
          ${isOpen ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
        `}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Connection Status */}
        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-gray-900 ${
          connected ? 'bg-green-500' : connecting ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <Link
                href="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {connecting ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Connecting...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No notifications yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={() => markAsRead(notification.id)}
                  onClose={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-900/50">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                View all notifications
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
