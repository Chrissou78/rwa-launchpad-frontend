// src/components/NotificationCenter.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  FileText,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Shield,
  Package,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  dealId?: string;
  dealReference?: string;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

export default function NotificationCenter() {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    if (!address) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications', {
          headers: {
            'x-wallet-address': address,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications.map((n: any) => ({
            ...n,
            createdAt: new Date(n.created_at),
            dealReference: n.deal_reference,
            actionUrl: n.action_url,
          })));
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [address]);

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

  const markAsRead = async (notificationIds?: string[]) => {
    if (!address) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          notificationIds,
          markAllRead: !notificationIds,
        }),
      });

      if (notificationIds) {
        setNotifications(notifications.map(n =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      } else {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      deal_created: <FileText className="h-5 w-5" />,
      deal_updated: <FileText className="h-5 w-5" />,
      stage_changed: <Package className="h-5 w-5" />,
      document_uploaded: <FileText className="h-5 w-5" />,
      document_verified: <Check className="h-5 w-5" />,
      milestone_completed: <CheckCheck className="h-5 w-5" />,
      payment_received: <DollarSign className="h-5 w-5" />,
      payment_released: <DollarSign className="h-5 w-5" />,
      message_received: <MessageSquare className="h-5 w-5" />,
      dispute_filed: <AlertTriangle className="h-5 w-5" />,
      dispute_resolved: <Shield className="h-5 w-5" />,
      kyc_approved: <Shield className="h-5 w-5" />,
      kyc_rejected: <AlertTriangle className="h-5 w-5" />,
    };
    return icons[type] || <Bell className="h-5 w-5" />;
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      deal_created: 'bg-blue-500/20 text-blue-400',
      deal_updated: 'bg-blue-500/20 text-blue-400',
      stage_changed: 'bg-purple-500/20 text-purple-400',
      document_uploaded: 'bg-cyan-500/20 text-cyan-400',
      document_verified: 'bg-green-500/20 text-green-400',
      milestone_completed: 'bg-green-500/20 text-green-400',
      payment_received: 'bg-green-500/20 text-green-400',
      payment_released: 'bg-green-500/20 text-green-400',
      message_received: 'bg-gray-500/20 text-gray-400',
      dispute_filed: 'bg-red-500/20 text-red-400',
      dispute_resolved: 'bg-yellow-500/20 text-yellow-400',
      kyc_approved: 'bg-green-500/20 text-green-400',
      kyc_rejected: 'bg-red-500/20 text-red-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!address) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700/50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-700/30 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-500/5' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead([notification.id]);
                      }
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-300' : 'text-white'}`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.dealReference && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span className="text-xs text-gray-500">
                                {notification.dealReference}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <Link href="/notifications">
              <button className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center">
                View All Notifications
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
