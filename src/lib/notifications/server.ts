// src/lib/notifications/server.ts
// WebSocket server implementation (run separately or with custom server)

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';

interface ClientConnection {
  ws: WebSocket;
  address: string;
  lastPing: number;
}

const clients = new Map<string, ClientConnection>();

export function createNotificationServer(port: number = 3001) {
  const wss = new WebSocketServer({ port });
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://localhost:${port}`);
    const address = url.searchParams.get('address');

    if (!address) {
      ws.close(4001, 'Missing address');
      return;
    }

    console.log(`[WS] Client connected: ${address}`);

    // Store connection
    clients.set(address, {
      ws,
      address,
      lastPing: Date.now(),
    });

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'ping':
            const client = clients.get(address);
            if (client) {
              client.lastPing = Date.now();
            }
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'ack':
            // Mark notification as read
            if (message.payload?.notificationId) {
              await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', message.payload.notificationId)
                .eq('user_address', address);
            } else if (message.payload?.all) {
              await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_address', address)
                .eq('read', false);
            }
            break;

          case 'subscribe':
            // Subscribe to specific channels
            console.log(`[WS] ${address} subscribed to:`, message.payload);
            break;
        }
      } catch (error) {
        console.error('[WS] Error handling message:', error);
      }
    });

    // Handle close
    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${address}`);
      clients.delete(address);
    });

    // Send recent unread notifications
    sendRecentNotifications(ws, address);
  });

  // Cleanup stale connections
  setInterval(() => {
    const now = Date.now();
    clients.forEach((client, address) => {
      if (now - client.lastPing > 60000) {
        console.log(`[WS] Removing stale connection: ${address}`);
        client.ws.close();
        clients.delete(address);
      }
    });
  }, 30000);

  // Listen to Supabase real-time notifications
  supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const notification = payload.new as any;
        const client = clients.get(notification.user_address);
        
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'notification',
            payload: notification,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    )
    .subscribe();

  console.log(`[WS] Notification server running on port ${port}`);
  return wss;
}

async function sendRecentNotifications(ws: WebSocket, address: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_address', address)
    .order('created_at', { ascending: false })
    .limit(20);

  if (notifications) {
    notifications.forEach(notification => {
      ws.send(JSON.stringify({
        type: 'notification',
        payload: notification,
        timestamp: new Date().toISOString(),
      }));
    });
  }
}

// Send notification to specific user
export function sendNotificationToUser(address: string, notification: any) {
  const client = clients.get(address);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString(),
    }));
    return true;
  }
  return false;
}

// Broadcast to all connected clients
export function broadcastNotification(notification: any) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'notification',
        payload: notification,
        timestamp: new Date().toISOString(),
      }));
    }
  });
}
