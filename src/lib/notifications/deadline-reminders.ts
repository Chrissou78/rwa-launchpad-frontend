// src/lib/notifications/deadline-reminders.ts
import { sendEmail } from './email-templates';
import { getSupabaseAdmin } from '@/lib/supabase';

const supabase = getSupabaseAdmin();

interface DeadlineReminder {
  id: string;
  type: 'milestone_due' | 'payment_due' | 'inspection_due' | 'document_due' | 'response_due';
  dealId: string;
  dealReference: string;
  dealTitle: string;
  userAddress: string;
  dueDate: Date;
  description: string;
  amount?: number;
}

// Check and send deadline reminders (run via cron job)
export async function processDeadlineReminders() {
  console.log('[Deadlines] Processing deadline reminders...');
  
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Get upcoming milestones
  const { data: milestones } = await supabase
    .from('milestones')
    .select(`
      id,
      title,
      due_date,
      amount,
      status,
      deal:deals (
        id,
        reference,
        title,
        buyer_address,
        seller_address,
        stage
      )
    `)
    .in('status', ['pending', 'in_progress'])
    .lte('due_date', sevenDaysFromNow.toISOString())
    .gte('due_date', now.toISOString());

  if (milestones) {
    for (const milestone of milestones) {
      const deal = milestone.deal as any;
      if (!deal || deal.stage === 'completed' || deal.stage === 'cancelled') continue;

      const dueDate = new Date(milestone.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      // Determine reminder urgency
      let shouldRemind = false;
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (daysUntilDue <= 1) {
        shouldRemind = true;
        urgency = 'critical';
      } else if (daysUntilDue <= 3) {
        shouldRemind = await shouldSendReminder(deal.id, milestone.id, '3day');
        urgency = 'high';
      } else if (daysUntilDue <= 7) {
        shouldRemind = await shouldSendReminder(deal.id, milestone.id, '7day');
        urgency = 'medium';
      }

      if (shouldRemind) {
        // Remind seller about milestone deadline
        await sendDeadlineReminder({
          type: 'milestone_due',
          dealId: deal.id,
          dealReference: deal.reference,
          dealTitle: deal.title,
          userAddress: deal.seller_address,
          dueDate,
          description: milestone.title,
          amount: milestone.amount,
        }, urgency, daysUntilDue);

        // Mark reminder as sent
        await markReminderSent(deal.id, milestone.id, urgency);
      }
    }
  }

  // Get deals awaiting payment
  const { data: awaitingPayment } = await supabase
    .from('deals')
    .select('*')
    .eq('stage', 'awaiting_payment')
    .lt('created_at', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString());

  if (awaitingPayment) {
    for (const deal of awaitingPayment) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - new Date(deal.created_at).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysSinceCreated >= 3 && await shouldSendReminder(deal.id, 'payment', '3day')) {
        await sendDeadlineReminder({
          type: 'payment_due',
          dealId: deal.id,
          dealReference: deal.reference,
          dealTitle: deal.title,
          userAddress: deal.buyer_address,
          dueDate: new Date(deal.created_at),
          description: 'Escrow payment pending',
          amount: Number(deal.total_amount),
        }, 'high', 0);

        await markReminderSent(deal.id, 'payment', 'high');
      }
    }
  }

  // Get disputes awaiting response
  const { data: disputes } = await supabase
    .from('disputes')
    .select(`
      id,
      deal_id,
      respondent,
      created_at,
      status,
      deal:deals (reference, title)
    `)
    .eq('status', 'pending')
    .lt('created_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString());

  if (disputes) {
    for (const dispute of disputes) {
      if (await shouldSendReminder(dispute.deal_id, dispute.id, 'response')) {
        const deal = dispute.deal as any;
        
        await sendDeadlineReminder({
          type: 'response_due',
          dealId: dispute.deal_id,
          dealReference: deal.reference,
          dealTitle: deal.title,
          userAddress: dispute.respondent,
          dueDate: new Date(dispute.created_at),
          description: 'Dispute response required',
        }, 'critical', 0);

        await markReminderSent(dispute.deal_id, dispute.id, 'response');
      }
    }
  }

  console.log('[Deadlines] Reminder processing complete');
}

async function sendDeadlineReminder(
  reminder: DeadlineReminder,
  urgency: 'low' | 'medium' | 'high' | 'critical',
  daysUntilDue: number
) {
  const actionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${reminder.dealId}`;
  
  // Create in-app notification
  await supabase.from('notifications').insert({
    user_address: reminder.userAddress,
    type: 'deadline_reminder',
    title: getDeadlineTitle(reminder.type, daysUntilDue),
    message: getDeadlineMessage(reminder, daysUntilDue),
    priority: urgency,
    action_url: actionUrl,
    data: {
      dealId: reminder.dealId,
      dealReference: reminder.dealReference,
      type: reminder.type,
      dueDate: reminder.dueDate.toISOString(),
      daysUntilDue,
    },
    read: false,
  });

  // Send email
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('wallet_address', reminder.userAddress.toLowerCase())
    .single();

  if (user?.email) {
    await sendEmail({
      subject: getDeadlineEmailSubject(reminder.type, daysUntilDue, reminder.dealReference),
      html: generateDeadlineEmail(reminder, urgency, daysUntilDue, actionUrl),
    }, user.email);
  }
}

async function shouldSendReminder(dealId: string, itemId: string, type: string): Promise<boolean> {
  const { data } = await supabase
    .from('reminder_log')
    .select('id')
    .eq('deal_id', dealId)
    .eq('item_id', itemId)
    .eq('reminder_type', type)
    .single();

  return !data;
}

async function markReminderSent(dealId: string, itemId: string, type: string) {
  await supabase.from('reminder_log').insert({
    deal_id: dealId,
    item_id: itemId,
    reminder_type: type,
    sent_at: new Date().toISOString(),
  });
}

function getDeadlineTitle(type: string, daysUntilDue: number): string {
  const urgencyPrefix = daysUntilDue <= 1 ? '🚨 ' : daysUntilDue <= 3 ? '⚠️ ' : '';
  
  const titles: Record<string, string> = {
    milestone_due: `${urgencyPrefix}Milestone Due ${daysUntilDue <= 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}`,
    payment_due: `${urgencyPrefix}Payment Reminder`,
    inspection_due: `${urgencyPrefix}Inspection Due`,
    document_due: `${urgencyPrefix}Document Submission Due`,
    response_due: `${urgencyPrefix}Response Required`,
  };

  return titles[type] || 'Deadline Reminder';
}

function getDeadlineMessage(reminder: DeadlineReminder, daysUntilDue: number): string {
  const messages: Record<string, string> = {
    milestone_due: `Milestone "${reminder.description}" for deal ${reminder.dealReference} is due ${daysUntilDue <= 1 ? 'tomorrow' : `in ${daysUntilDue} days`}.`,
    payment_due: `Your escrow payment for deal ${reminder.dealReference} is still pending. Please complete payment to proceed.`,
    inspection_due: `Inspection period for deal ${reminder.dealReference} ends soon.`,
    document_due: `Document "${reminder.description}" for deal ${reminder.dealReference} is due.`,
    response_due: `A dispute has been filed for deal ${reminder.dealReference}. Please respond promptly.`,
  };

  return messages[reminder.type] || `Deadline approaching for deal ${reminder.dealReference}`;
}

function getDeadlineEmailSubject(type: string, daysUntilDue: number, reference: string): string {
  const urgency = daysUntilDue <= 1 ? '🚨 URGENT: ' : daysUntilDue <= 3 ? '⚠️ ' : '';
  
  const subjects: Record<string, string> = {
    milestone_due: `${urgency}Milestone Due ${daysUntilDue <= 1 ? 'Tomorrow' : `in ${daysUntilDue} Days`} - ${reference}`,
    payment_due: `${urgency}Payment Required - ${reference}`,
    response_due: `${urgency}Dispute Response Required - ${reference}`,
  };

  return subjects[type] || `${urgency}Deadline Reminder - ${reference}`;
}

function generateDeadlineEmail(
  reminder: DeadlineReminder,
  urgency: string,
  daysUntilDue: number,
  actionUrl: string
): string {
  const urgencyColors: Record<string, string> = {
    low: '#3b82f6',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#dc2626',
  };

  const color = urgencyColors[urgency] || '#3b82f6';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: ${color}; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .deadline-box { background: #f3f4f6; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0; }
        .countdown { font-size: 32px; font-weight: bold; color: ${color}; text-align: center; margin: 20px 0; }
        .button { display: inline-block; background: ${color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${daysUntilDue <= 1 ? '🚨' : '⏰'} Deadline Reminder</h1>
        </div>
        <div class="content">
          <div class="countdown">
            ${daysUntilDue <= 0 ? 'OVERDUE' : daysUntilDue === 1 ? 'Due Tomorrow' : `${daysUntilDue} Days Left`}
          </div>
          
          <div class="deadline-box">
            <p><strong>Deal:</strong> ${reminder.dealReference}</p>
            <p><strong>Title:</strong> ${reminder.dealTitle}</p>
            <p><strong>Action Required:</strong> ${reminder.description}</p>
            ${reminder.amount ? `<p><strong>Amount:</strong> $${reminder.amount.toLocaleString()}</p>` : ''}
            <p><strong>Due Date:</strong> ${reminder.dueDate.toLocaleDateString()}</p>
          </div>
          
          <p>Please take action to avoid delays or penalties.</p>
          
          <center>
            <a href="${actionUrl}" class="button">View Deal</a>
          </center>
        </div>
        <div class="footer">
          <p>RWA Platform - Secure Real-World Asset Trading</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
