// src/lib/notifications/websocket.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type NotificationType = 
  | 'trade_update'
  | 'payment_received'
  | 'payment_sent'
  | 'document_uploaded'
  | 'document_verified'
  | 'milestone_completed'
  | 'dispute_opened'
  | 'dispute_update'
  | 'message_received'
  | 'kyc_update'
  | 'system_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WebSocketMessage {
  type: 'notification' | 'ping' | 'pong' | 'subscribe' | 'unsubscribe' | 'ack';
  payload?: any;
  timestamp: string;
}

interface UseNotificationSocketOptions {
  walletAddress?: string;
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface NotificationSocketState {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  notifications: Notification[];
  unreadCount: number;
}

// =============================================================================
// WEBSOCKET HOOK
// =============================================================================

export function useNotificationSocket(options: UseNotificationSocketOptions = {}) {
  const {
    walletAddress,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<NotificationSocketState>({
    connected: false,
    connecting: false,
    error: null,
    notifications: [],
    unreadCount: 0,
  });

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!walletAddress) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `wss://${window.location.host}/api/ws`;
    const ws = new WebSocket(`${wsUrl}?address=${walletAddress}`);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setState(prev => ({ ...prev, connected: true, connecting: false }));
      reconnectAttemptsRef.current = 0;
      
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        }
      }, 30000);

      onConnect?.();
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected', event.code, event.reason);
      setState(prev => ({ ...prev, connected: false, connecting: false }));
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }

      onDisconnect?.();

      // Auto reconnect
      if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`[WS] Reconnecting... (${reconnectAttemptsRef.current}/${reconnectAttempts})`);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = (event) => {
      console.error('[WS] Error:', event);
      const error = new Error('WebSocket connection error');
      setState(prev => ({ ...prev, error }));
      onError?.(error);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'notification':
            const notification = message.payload as Notification;
            setState(prev => ({
              ...prev,
              notifications: [notification, ...prev.notifications].slice(0, 100),
              unreadCount: prev.unreadCount + (notification.read ? 0 : 1),
            }));
            onNotification?.(notification);
            
            // Show browser notification if permitted
            showBrowserNotification(notification);
            break;

          case 'pong':
            // Keep-alive response
            break;

          default:
            console.log('[WS] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    wsRef.current = ws;
  }, [walletAddress, autoReconnect, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onNotification]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Send message
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));

    send({
      type: 'ack',
      payload: { notificationId },
      timestamp: new Date().toISOString(),
    });
  }, [send]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    send({
      type: 'ack',
      payload: { all: true },
      timestamp: new Date().toISOString(),
    });
  }, [send]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [], unreadCount: 0 }));
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    send,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

// =============================================================================
// BROWSER NOTIFICATIONS
// =============================================================================

async function showBrowserNotification(notification: Notification) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Don't show for low priority
  if (notification.priority === 'low') return;

  try {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: notification.id,
      data: notification,
      requireInteraction: notification.priority === 'critical',
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close after 10 seconds for non-critical
    if (notification.priority !== 'critical') {
      setTimeout(() => browserNotification.close(), 10000);
    }
  } catch (error) {
    console.error('Failed to show browser notification:', error);
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// =============================================================================
// NOTIFICATION CONTEXT
// =============================================================================

import { createContext, useContext, ReactNode } from 'react';

interface NotificationContextValue extends ReturnType<typeof useNotificationSocket> {
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ 
  children, 
  walletAddress 
}: { 
  children: ReactNode; 
  walletAddress?: string;
}) {
  const socket = useNotificationSocket({ walletAddress });

  const value: NotificationContextValue = {
    ...socket,
    requestPermission: requestNotificationPermission,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
