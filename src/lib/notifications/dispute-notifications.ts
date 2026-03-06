// src/lib/notifications/dispute-notifications.ts
import { sendEmail, emailTemplates } from './email-templates';
import { supabase } from '@/lib/supabase';

interface DisputeNotificationData {
  disputeId: string;
  dealId: string;
  dealReference: string;
  dealTitle: string;
  filedBy: string;
  filedByName?: string;
  respondent: string;
  reason: string;
  amount?: number;
  resolution?: string;
  resolvedBy?: string;
  ruling?: 'buyer' | 'seller' | 'split';
}

// Notify when dispute is opened
export async function notifyDisputeOpened(data: DisputeNotificationData) {
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/disputes/${data.disputeId}`;
  
  // Notify respondent (the other party)
  await createNotification({
    userAddress: data.respondent,
    type: 'dispute_opened',
    title: 'Dispute Filed Against You',
    message: `A dispute has been filed for deal ${data.dealReference}: "${data.reason}"`,
    priority: 'high',
    actionUrl,
    data: {
      disputeId: data.disputeId,
      dealId: data.dealId,
      dealReference: data.dealReference,
      reason: data.reason,
    },
  });

  // Send email to respondent
  const respondentEmail = await getUserEmail(data.respondent);
  if (respondentEmail) {
    const template = emailTemplates.disputeOpened({
      dealReference: data.dealReference,
      dealTitle: data.dealTitle,
      filedBy: data.filedByName || shortenAddress(data.filedBy),
      reason: data.reason,
      actionUrl,
    });
    await sendEmail(template, respondentEmail);
  }

  // Notify admins
  await notifyAdminsOfDispute(data, 'opened');
}

// Notify when dispute moves to mediation
export async function notifyDisputeMediation(data: DisputeNotificationData) {
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/disputes/${data.disputeId}`;
  const parties = [data.filedBy, data.respondent];

  for (const party of parties) {
    await createNotification({
      userAddress: party,
      type: 'dispute_mediation',
      title: 'Dispute Moved to Mediation',
      message: `Deal ${data.dealReference} dispute is now in mediation. A mediator will review the case.`,
      priority: 'medium',
      actionUrl,
      data: { disputeId: data.disputeId, dealId: data.dealId },
    });

    const email = await getUserEmail(party);
    if (email) {
      await sendEmail({
        subject: `Mediation Started - ${data.dealReference}`,
        html: generateMediationEmail(data, actionUrl),
      }, email);
    }
  }
}

// Notify when dispute moves to arbitration
export async function notifyDisputeArbitration(data: DisputeNotificationData) {
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/disputes/${data.disputeId}`;
  const parties = [data.filedBy, data.respondent];

  for (const party of parties) {
    await createNotification({
      userAddress: party,
      type: 'dispute_arbitration',
      title: 'Dispute Escalated to Arbitration',
      message: `Deal ${data.dealReference} dispute has been escalated to arbitration. An arbitrator will make a binding decision.`,
      priority: 'high',
      actionUrl,
      data: { disputeId: data.disputeId, dealId: data.dealId },
    });

    const email = await getUserEmail(party);
    if (email) {
      await sendEmail({
        subject: `⚠️ Arbitration Required - ${data.dealReference}`,
        html: generateArbitrationEmail(data, actionUrl),
      }, email);
    }
  }
}

// Notify when dispute is resolved
export async function notifyDisputeResolved(data: DisputeNotificationData & { 
  ruling: 'buyer' | 'seller' | 'split';
  buyerAmount?: number;
  sellerAmount?: number;
}) {
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/disputes/${data.disputeId}`;
  const parties = [data.filedBy, data.respondent];

  for (const party of parties) {
    const isWinner = 
      (data.ruling === 'buyer' && party === data.filedBy) ||
      (data.ruling === 'seller' && party === data.respondent) ||
      data.ruling === 'split';

    await createNotification({
      userAddress: party,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: `Deal ${data.dealReference} dispute has been resolved. ${getRulingMessage(data.ruling, isWinner)}`,
      priority: 'high',
      actionUrl,
      data: {
        disputeId: data.disputeId,
        dealId: data.dealId,
        ruling: data.ruling,
        resolution: data.resolution,
      },
    });

    const email = await getUserEmail(party);
    if (email) {
      const template = emailTemplates.disputeResolved({
        dealReference: data.dealReference,
        dealTitle: data.dealTitle,
        resolution: data.resolution || getRulingMessage(data.ruling, isWinner),
        actionUrl,
      });
      await sendEmail(template, email);
    }
  }
}

// Notify when evidence is submitted
export async function notifyEvidenceSubmitted(data: DisputeNotificationData & {
  submittedBy: string;
  evidenceType: string;
}) {
  const otherParty = data.submittedBy === data.filedBy ? data.respondent : data.filedBy;
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/disputes/${data.disputeId}`;

  await createNotification({
    userAddress: otherParty,
    type: 'dispute_evidence',
    title: 'New Evidence Submitted',
    message: `New ${data.evidenceType} evidence has been submitted for dispute on deal ${data.dealReference}`,
    priority: 'medium',
    actionUrl,
    data: { disputeId: data.disputeId, dealId: data.dealId },
  });
}

// Notify admins about disputes
async function notifyAdminsOfDispute(data: DisputeNotificationData, action: string) {
  const { data: admins } = await supabase
    .from('users')
    .select('wallet_address, email')
    .eq('role', 'admin');

  if (!admins) return;

  for (const admin of admins) {
    await createNotification({
      userAddress: admin.wallet_address,
      type: 'admin_dispute_alert',
      title: `Dispute ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Dispute ${action} for deal ${data.dealReference}. Amount at risk: $${data.amount?.toLocaleString() || 'N/A'}`,
      priority: 'high',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/disputes/${data.disputeId}`,
      data: { disputeId: data.disputeId, dealId: data.dealId, action },
    });
  }
}

// Helper functions
async function createNotification(notification: {
  userAddress: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  actionUrl: string;
  data: Record<string, any>;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_address: notification.userAddress,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    priority: notification.priority,
    action_url: notification.actionUrl,
    data: notification.data,
    read: false,
  });
  
  if (error) console.error('[Notification] Insert error:', error);
}

async function getUserEmail(walletAddress: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();
  
  return data?.email || null;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRulingMessage(ruling: 'buyer' | 'seller' | 'split', isWinner: boolean): string {
  if (ruling === 'split') return 'Funds have been split between both parties.';
  if (isWinner) return 'The ruling was in your favor.';
  return 'The ruling was in favor of the other party.';
}

function generateMediationEmail(data: DisputeNotificationData, actionUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚖️ Mediation Started</h1>
        </div>
        <div class="content">
          <p>Your dispute for deal <strong>${data.dealReference}</strong> has moved to mediation.</p>
          
          <div class="info-box">
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>A neutral mediator will review the case</li>
              <li>Both parties may be asked to provide additional information</li>
              <li>The mediator will attempt to facilitate a resolution</li>
              <li>If mediation fails, the case may escalate to arbitration</li>
            </ul>
          </div>
          
          <p><strong>Deal:</strong> ${data.dealTitle}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
          
          <a href="${actionUrl}" class="button">View Dispute Details</a>
        </div>
        <div class="footer">
          <p>RWA Platform - Secure Real-World Asset Trading</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateArbitrationEmail(data: DisputeNotificationData, actionUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Arbitration Required</h1>
        </div>
        <div class="content">
          <p>Your dispute for deal <strong>${data.dealReference}</strong> has been escalated to arbitration.</p>
          
          <div class="warning-box">
            <p><strong>Important:</strong></p>
            <ul>
              <li>An arbitrator will make a <strong>binding decision</strong></li>
              <li>Submit all evidence as soon as possible</li>
              <li>The arbitrator's decision is final</li>
              <li>Funds will be released according to the ruling</li>
            </ul>
          </div>
          
          <p><strong>Deal:</strong> ${data.dealTitle}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
          
          <a href="${actionUrl}" class="button">View Dispute & Submit Evidence</a>
        </div>
        <div class="footer">
          <p>RWA Platform - Secure Real-World Asset Trading</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
