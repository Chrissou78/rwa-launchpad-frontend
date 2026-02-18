// src/lib/notifications/daily-digest.ts
import { sendEmail } from './email-templates';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

interface UserDigestData {
  walletAddress: string;
  email: string;
  name?: string;
}

interface DigestStats {
  activeDeals: number;
  pendingActions: number;
  unreadMessages: number;
  upcomingDeadlines: number;
  recentActivity: ActivityItem[];
  dealsSummary: DealSummary[];
  alerts: AlertItem[];
}

interface ActivityItem {
  type: string;
  description: string;
  timestamp: Date;
  dealReference?: string;
}

interface DealSummary {
  id: string;
  reference: string;
  title: string;
  stage: string;
  role: 'buyer' | 'seller';
  amount: number;
  nextAction?: string;
}

interface AlertItem {
  type: 'warning' | 'info' | 'success';
  message: string;
}

// Process daily digests for all users (run at 8 AM daily)
export async function processDailyDigests() {
  console.log('[Digest] Processing daily digests...');
  
  // Get users who have digest enabled
  const { data: users } = await supabase
    .from('users')
    .select('wallet_address, email, name')
    .not('email', 'is', null);

  if (!users) {
    console.log('[Digest] No users found');
    return;
  }

  // Check preferences for each user
  for (const user of users) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('global_settings')
      .eq('wallet_address', user.wallet_address.toLowerCase())
      .single();

    const digestEnabled = prefs?.global_settings?.emailDigest !== false;

    if (!digestEnabled) continue;

    // Get user's digest data
    const digestData = await getUserDigestData(user.wallet_address);

    // Only send if there's something to report
    if (digestData.activeDeals > 0 || digestData.pendingActions > 0 || digestData.alerts.length > 0) {
      await sendDigestEmail(user, digestData);
    }
  }

  console.log('[Digest] Daily digest processing complete');
}

async function getUserDigestData(walletAddress: string): Promise<DigestStats> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get active deals
  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .or(`buyer_address.eq.${walletAddress.toLowerCase()},seller_address.eq.${walletAddress.toLowerCase()}`)
    .not('stage', 'in', '("completed","cancelled")');

  // Get unread messages
  const { count: unreadMessages } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('recipient', walletAddress.toLowerCase())
    .eq('read', false);

  // Get upcoming deadlines
  const { data: milestones } = await supabase
    .from('milestones')
    .select(`
      id,
      due_date,
      deal:deals!inner (
        buyer_address,
        seller_address
      )
    `)
    .lte('due_date', nextWeek.toISOString())
    .gte('due_date', now.toISOString())
    .in('status', ['pending', 'in_progress']);

  const upcomingDeadlines = milestones?.filter((m: any) => {
    const deal = m.deal;
    return deal.buyer_address.toLowerCase() === walletAddress.toLowerCase() ||
           deal.seller_address.toLowerCase() === walletAddress.toLowerCase();
  }).length || 0;

  // Get recent activity
  const { data: timeline } = await supabase
    .from('deal_timeline')
    .select(`
      event_type,
      description,
      created_at,
      deal:deals!inner (
        reference,
        buyer_address,
        seller_address
      )
    `)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  const recentActivity: ActivityItem[] = timeline?.filter((t: any) => {
    const deal = t.deal;
    return deal.buyer_address.toLowerCase() === walletAddress.toLowerCase() ||
           deal.seller_address.toLowerCase() === walletAddress.toLowerCase();
  }).map((t: any) => ({
    type: t.event_type,
    description: t.description,
    timestamp: new Date(t.created_at),
    dealReference: t.deal.reference,
  })) || [];

  // Build deals summary
  const dealsSummary: DealSummary[] = deals?.map((deal: any) => ({
    id: deal.id,
    reference: deal.reference,
    title: deal.title,
    stage: deal.stage,
    role: deal.buyer_address.toLowerCase() === walletAddress.toLowerCase() ? 'buyer' : 'seller',
    amount: Number(deal.total_amount),
    nextAction: getNextAction(deal, walletAddress),
  })) || [];

  // Calculate pending actions
  const pendingActions = dealsSummary.filter(d => d.nextAction).length;

  // Build alerts
  const alerts: AlertItem[] = [];

  if (pendingActions > 0) {
    alerts.push({
      type: 'warning',
      message: `You have ${pendingActions} deal${pendingActions > 1 ? 's' : ''} requiring your action`,
    });
  }

  if (upcomingDeadlines > 0) {
    alerts.push({
      type: 'warning',
      message: `${upcomingDeadlines} deadline${upcomingDeadlines > 1 ? 's' : ''} coming up this week`,
    });
  }

  // Check for disputes
  const { count: activeDisputes } = await supabase
    .from('disputes')
    .select('id', { count: 'exact' })
    .or(`filed_by.eq.${walletAddress.toLowerCase()},respondent.eq.${walletAddress.toLowerCase()}`)
    .in('status', ['pending', 'mediation', 'arbitration']);

  if (activeDisputes && activeDisputes > 0) {
    alerts.push({
      type: 'warning',
      message: `You have ${activeDisputes} active dispute${activeDisputes > 1 ? 's' : ''}`,
    });
  }

  return {
    activeDeals: deals?.length || 0,
    pendingActions,
    unreadMessages: unreadMessages || 0,
    upcomingDeadlines,
    recentActivity,
    dealsSummary,
    alerts,
  };
}

function getNextAction(deal: any, walletAddress: string): string | undefined {
  const isBuyer = deal.buyer_address.toLowerCase() === walletAddress.toLowerCase();

  const actions: Record<string, { buyer?: string; seller?: string }> = {
    awaiting_payment: { buyer: 'Fund escrow' },
    awaiting_shipment: { seller: 'Ship goods' },
    in_transit: { buyer: 'Confirm receipt' },
    inspection: { buyer: 'Complete inspection' },
    pending_approval: { buyer: 'Approve milestone' },
  };

  const stageActions = actions[deal.stage];
  if (!stageActions) return undefined;

  return isBuyer ? stageActions.buyer : stageActions.seller;
}

async function sendDigestEmail(user: UserDigestData, data: DigestStats) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  await sendEmail({
    subject: `📊 Your Daily RWA Platform Summary - ${new Date().toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f3f4f6; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-number { font-size: 28px; font-weight: bold; color: #6366f1; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
          .alert { padding: 12px 15px; border-radius: 6px; margin: 10px 0; }
          .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
          .alert-info { background: #dbeafe; border-left: 4px solid #3b82f6; }
          .alert-success { background: #d1fae5; border-left: 4px solid #10b981; }
          .deal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .deal-header { display: flex; justify-content: space-between; align-items: center; }
          .deal-ref { font-weight: bold; color: #1f2937; }
          .deal-stage { font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #e5e7eb; }
          .deal-action { color: #f59e0b; font-weight: 500; font-size: 14px; margin-top: 10px; }
          .activity-item { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
          .activity-time { font-size: 12px; color: #9ca3af; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          .section-title { font-size: 16px; font-weight: bold; color: #1f2937; margin: 25px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Summary</h1>
            <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="content">
            ${user.name ? `<p>Hello ${user.name},</p>` : '<p>Hello,</p>'}
            <p>Here's your daily platform activity summary:</p>
            
            <!-- Stats Grid -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${data.activeDeals}</div>
                <div class="stat-label">Active Deals</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${data.pendingActions}</div>
                <div class="stat-label">Pending Actions</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${data.unreadMessages}</div>
                <div class="stat-label">Unread Messages</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${data.upcomingDeadlines}</div>
                <div class="stat-label">Upcoming Deadlines</div>
              </div>
            </div>
            
            <!-- Alerts -->
            ${data.alerts.length > 0 ? `
              <div class="section-title">⚠️ Alerts</div>
              ${data.alerts.map(alert => `
                <div class="alert alert-${alert.type}">
                  ${alert.message}
                </div>
              `).join('')}
            ` : ''}
            
            <!-- Active Deals -->
            ${data.dealsSummary.length > 0 ? `
              <div class="section-title">📋 Your Active Deals</div>
              ${data.dealsSummary.slice(0, 5).map(deal => `
                <div class="deal-card">
                  <div class="deal-header">
                    <span class="deal-ref">${deal.reference}</span>
                    <span class="deal-stage">${formatStage(deal.stage)}</span>
                  </div>
                  <p style="margin: 10px 0 5px 0; color: #4b5563;">${deal.title}</p>
                  <p style="margin: 0; font-size: 14px;">
                    <strong>Role:</strong> ${deal.role.charAt(0).toUpperCase() + deal.role.slice(1)} · 
                    <strong>Value:</strong> $${deal.amount.toLocaleString()}
                  </p>
                  ${deal.nextAction ? `<p class="deal-action">⚡ Action needed: ${deal.nextAction}</p>` : ''}
                </div>
              `).join('')}
            ` : ''}
            
            <!-- Recent Activity -->
            ${data.recentActivity.length > 0 ? `
              <div class="section-title">🕐 Recent Activity (Last 24h)</div>
              ${data.recentActivity.slice(0, 5).map(activity => `
                <div class="activity-item">
                  <p style="margin: 0;">${activity.description}</p>
                  <span class="activity-time">${activity.dealReference} · ${formatTime(activity.timestamp)}</span>
                </div>
              `).join('')}
            ` : '<p style="color: #9ca3af;">No recent activity in the last 24 hours.</p>'}
            
            <center>
              <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
            </center>
          </div>
          <div class="footer">
            <p>RWA Platform - Secure Real-World Asset Trading</p>
            <p style="margin-top: 10px;">
              <a href="${appUrl}/settings/notifications" style="color: #6366f1;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  }, user.email);

  console.log(`[Digest] Sent digest to ${user.email}`);
}

function formatStage(stage: string): string {
  const stages: Record<string, string> = {
    draft: 'Draft',
    awaiting_payment: 'Awaiting Payment',
    funded: 'Funded',
    awaiting_shipment: 'Awaiting Shipment',
    in_transit: 'In Transit',
    inspection: 'Inspection',
    pending_approval: 'Pending Approval',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
  };
  return stages[stage] || stage;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return date.toLocaleDateString();
}
