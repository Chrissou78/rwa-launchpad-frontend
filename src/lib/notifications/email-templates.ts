// src/lib/notifications/email-templates.ts

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailTemplateData {
  recipientName: string;
  recipientEmail: string;
  [key: string]: any;
}

// =============================================================================
// SMTP TRANSPORTER
// =============================================================================

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2' as const,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });
  }
  return transporter;
}

// =============================================================================
// BASE TEMPLATE
// =============================================================================

const baseTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>RWA Platform</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1f2937;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      padding: 32px;
      text-align: center;
    }
    .logo {
      color: white;
      font-size: 24px;
      font-weight: bold;
      text-decoration: none;
    }
    .content {
      padding: 32px;
      color: #e5e7eb;
    }
    .title {
      color: white;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    .text {
      color: #9ca3af;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      color: white !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      margin: 16px 0;
    }
    .card {
      background-color: #374151;
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    .card-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #4b5563;
    }
    .card-row:last-child {
      border-bottom: none;
    }
    .card-label {
      color: #9ca3af;
      font-size: 14px;
    }
    .card-value {
      color: white;
      font-size: 14px;
      font-weight: 500;
    }
    .highlight {
      color: #3b82f6;
    }
    .success {
      color: #10b981;
    }
    .warning {
      color: #f59e0b;
    }
    .danger {
      color: #ef4444;
    }
    .footer {
      background-color: #111827;
      padding: 24px 32px;
      text-align: center;
    }
    .footer-text {
      color: #6b7280;
      font-size: 12px;
      margin: 0 0 8px 0;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-link {
      color: #9ca3af;
      text-decoration: none;
      font-size: 12px;
      margin: 0 8px;
    }
    .preheader {
      display: none;
      font-size: 1px;
      color: #111827;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 24px !important;
      }
    }
  </style>
</head>
<body>
  <div class="preheader">${preheader}</div>
  <center>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td>
          <div class="email-container">
            <div class="header">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}" class="logo">RWA Platform</a>
            </div>
            <div class="content">
              ${content}
            </div>
            <div class="footer">
              <p class="footer-text">
                This email was sent to you because you have an account on RWA Platform.
              </p>
              <div class="footer-links">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/settings/notifications" class="footer-link">Notification Settings</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/help" class="footer-link">Help Center</a>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/privacy" class="footer-link">Privacy Policy</a>
              </div>
              <p class="footer-text">
                © ${new Date().getFullYear()} RWA Platform. All rights reserved.
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
`;

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const emailTemplates = {
  // -------------------------------------------------------------------------
  // TRADE NOTIFICATIONS
  // -------------------------------------------------------------------------
  
  newDealInvitation: (data: EmailTemplateData & {
    dealReference: string;
    counterpartyName: string;
    productName: string;
    dealValue: string;
    actionUrl: string;
  }) => ({
    subject: `New Trade Deal Invitation: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title">You've Been Invited to a Trade Deal</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        <strong>${data.counterpartyName}</strong> has invited you to participate in a new trade deal.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Product</span>
          <span class="card-value">${data.productName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Value</span>
          <span class="card-value highlight">${data.dealValue}</span>
        </div>
      </div>
      
      <p class="text">
        Review the deal details and accept or decline the invitation.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Deal Invitation</a>
      </center>
    `, `New trade deal invitation from ${data.counterpartyName}`),
  }),

  dealStatusUpdate: (data: EmailTemplateData & {
    dealReference: string;
    previousStatus: string;
    newStatus: string;
    productName: string;
    actionUrl: string;
  }) => ({
    subject: `Deal Status Update: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title">Deal Status Updated</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        The status of your trade deal has been updated.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Product</span>
          <span class="card-value">${data.productName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Previous Status</span>
          <span class="card-value">${data.previousStatus}</span>
        </div>
        <div class="card-row">
          <span class="card-label">New Status</span>
          <span class="card-value success">${data.newStatus}</span>
        </div>
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Deal Details</a>
      </center>
    `, `Deal ${data.dealReference} status changed to ${data.newStatus}`),
  }),

  milestoneCompleted: (data: EmailTemplateData & {
    dealReference: string;
    milestoneName: string;
    paymentAmount: string;
    nextMilestone?: string;
    actionUrl: string;
  }) => ({
    subject: `Milestone Completed: ${data.milestoneName}`,
    html: baseTemplate(`
      <h1 class="title">Milestone Completed! 🎉</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        A milestone has been completed in your trade deal.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Completed Milestone</span>
          <span class="card-value success">${data.milestoneName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Payment Released</span>
          <span class="card-value highlight">${data.paymentAmount}</span>
        </div>
        ${data.nextMilestone ? `
        <div class="card-row">
          <span class="card-label">Next Milestone</span>
          <span class="card-value">${data.nextMilestone}</span>
        </div>
        ` : ''}
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Deal Progress</a>
      </center>
    `, `Milestone "${data.milestoneName}" completed - ${data.paymentAmount} released`),
  }),

  // -------------------------------------------------------------------------
  // PAYMENT NOTIFICATIONS
  // -------------------------------------------------------------------------

  paymentReceived: (data: EmailTemplateData & {
    amount: string;
    currency: string;
    dealReference: string;
    fromParty: string;
    transactionHash?: string;
    actionUrl: string;
  }) => ({
    subject: `Payment Received: ${data.amount} ${data.currency}`,
    html: baseTemplate(`
      <h1 class="title">Payment Received! 💰</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        You have received a payment in your escrow account.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Amount</span>
          <span class="card-value success" style="font-size: 18px;">${data.amount} ${data.currency}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">From</span>
          <span class="card-value">${data.fromParty}</span>
        </div>
        ${data.transactionHash ? `
        <div class="card-row">
          <span class="card-label">Transaction</span>
          <span class="card-value" style="font-family: monospace; font-size: 12px;">${data.transactionHash.slice(0, 10)}...${data.transactionHash.slice(-8)}</span>
        </div>
        ` : ''}
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Transaction</a>
      </center>
    `, `You received ${data.amount} ${data.currency} from ${data.fromParty}`),
  }),

  escrowFunded: (data: EmailTemplateData & {
    dealReference: string;
    amount: string;
    currency: string;
    buyerName: string;
    actionUrl: string;
  }) => ({
    subject: `Escrow Funded: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title">Escrow Has Been Funded</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        The escrow for your trade deal has been funded and secured.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Amount Secured</span>
          <span class="card-value success">${data.amount} ${data.currency}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Funded By</span>
          <span class="card-value">${data.buyerName}</span>
        </div>
      </div>
      
      <p class="text">
        The funds are now securely held in escrow and will be released according to the agreed milestones.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Escrow Details</a>
      </center>
    `, `Escrow funded with ${data.amount} ${data.currency}`),
  }),

  // -------------------------------------------------------------------------
  // DOCUMENT NOTIFICATIONS
  // -------------------------------------------------------------------------

  documentUploaded: (data: EmailTemplateData & {
    documentName: string;
    documentType: string;
    dealReference: string;
    uploadedBy: string;
    actionUrl: string;
  }) => ({
    subject: `New Document Uploaded: ${data.documentName}`,
    html: baseTemplate(`
      <h1 class="title">New Document Uploaded</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        A new document has been uploaded to your trade deal.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Document</span>
          <span class="card-value">${data.documentName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Type</span>
          <span class="card-value">${data.documentType}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Uploaded By</span>
          <span class="card-value">${data.uploadedBy}</span>
        </div>
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Document</a>
      </center>
    `, `${data.uploadedBy} uploaded ${data.documentName}`),
  }),

  documentVerified: (data: EmailTemplateData & {
    documentName: string;
    dealReference: string;
    verifiedBy: string;
    actionUrl: string;
  }) => ({
    subject: `Document Verified: ${data.documentName}`,
    html: baseTemplate(`
      <h1 class="title">Document Verified ✓</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        Your document has been verified and approved.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Document</span>
          <span class="card-value">${data.documentName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Status</span>
          <span class="card-value success">✓ Verified</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Deal</a>
      </center>
    `, `${data.documentName} has been verified`),
  }),

  // -------------------------------------------------------------------------
  // DISPUTE NOTIFICATIONS
  // -------------------------------------------------------------------------

  disputeOpened: (data: EmailTemplateData & {
    disputeId: string;
    dealReference: string;
    reason: string;
    openedBy: string;
    actionUrl: string;
  }) => ({
    subject: `⚠️ Dispute Opened: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title" style="color: #ef4444;">Dispute Opened</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        A dispute has been opened on your trade deal. Please review and respond.
      </p>
      
      <div class="card" style="border: 1px solid #ef4444;">
        <div class="card-row">
          <span class="card-label">Dispute ID</span>
          <span class="card-value">${data.disputeId}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Opened By</span>
          <span class="card-value">${data.openedBy}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Reason</span>
          <span class="card-value danger">${data.reason}</span>
        </div>
      </div>
      
      <p class="text">
        <strong>Action Required:</strong> Please respond to this dispute within 72 hours to avoid escalation.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button" style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);">
          Respond to Dispute
        </a>
      </center>
    `, `URGENT: Dispute opened on deal ${data.dealReference}`),
  }),

  disputeResolved: (data: EmailTemplateData & {
    disputeId: string;
    dealReference: string;
    resolution: string;
    buyerAmount?: string;
    sellerAmount?: string;
    actionUrl: string;
  }) => ({
    subject: `Dispute Resolved: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title">Dispute Resolved</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        The dispute on your trade deal has been resolved.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Dispute ID</span>
          <span class="card-value">${data.disputeId}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Resolution</span>
          <span class="card-value success">${data.resolution}</span>
        </div>
        ${data.buyerAmount ? `
        <div class="card-row">
          <span class="card-label">Buyer Receives</span>
          <span class="card-value">${data.buyerAmount}</span>
        </div>
        ` : ''}
        ${data.sellerAmount ? `
        <div class="card-row">
          <span class="card-label">Seller Receives</span>
          <span class="card-value">${data.sellerAmount}</span>
        </div>
        ` : ''}
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">View Resolution Details</a>
      </center>
    `, `Dispute ${data.disputeId} has been resolved`),
  }),

  // -------------------------------------------------------------------------
  // KYC NOTIFICATIONS
  // -------------------------------------------------------------------------

  kycApproved: (data: EmailTemplateData & {
    kycLevel: string;
    tradeLimits: string;
    actionUrl: string;
  }) => ({
    subject: `KYC Approved: ${data.kycLevel} Level`,
    html: baseTemplate(`
      <h1 class="title">KYC Verification Approved! 🎉</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        Congratulations! Your KYC verification has been approved.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">KYC Level</span>
          <span class="card-value success">${data.kycLevel}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Trade Limits</span>
          <span class="card-value">${data.tradeLimits}</span>
        </div>
      </div>
      
      <p class="text">
        You can now create and participate in trade deals up to your new limits.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button">Start Trading</a>
      </center>
    `, `Your KYC has been approved - ${data.kycLevel} level`),
  }),

  kycRejected: (data: EmailTemplateData & {
    reason: string;
    actionUrl: string;
  }) => ({
    subject: `KYC Verification Update Required`,
    html: baseTemplate(`
      <h1 class="title">KYC Verification Update Required</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        Unfortunately, we were unable to verify your KYC application. Please review the feedback below and submit updated information.
      </p>
      
      <div class="card" style="border: 1px solid #f59e0b;">
        <div class="card-row">
          <span class="card-label">Reason</span>
          <span class="card-value warning">${data.reason}</span>
        </div>
      </div>
      
      <p class="text">
        Please update your documents and resubmit for verification.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button">Update KYC Information</a>
      </center>
    `, `Action required: KYC verification needs updates`),
  }),

  // -------------------------------------------------------------------------
  // SECURITY NOTIFICATIONS
  // -------------------------------------------------------------------------

  newLogin: (data: EmailTemplateData & {
    ipAddress: string;
    location: string;
    device: string;
    timestamp: string;
    actionUrl: string;
  }) => ({
    subject: `New Login Detected`,
    html: baseTemplate(`
      <h1 class="title">New Login to Your Account</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        We detected a new login to your account. If this was you, no action is needed.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Time</span>
          <span class="card-value">${data.timestamp}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Location</span>
          <span class="card-value">${data.location}</span>
        </div>
        <div class="card-row">
          <span class="card-label">IP Address</span>
          <span class="card-value" style="font-family: monospace;">${data.ipAddress}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Device</span>
          <span class="card-value">${data.device}</span>
        </div>
      </div>
      
      <p class="text">
        <strong>If this wasn't you</strong>, please secure your account immediately.
      </p>
      
      <center>
        <a href="${data.actionUrl}" class="button" style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);">
          Secure My Account
        </a>
      </center>
    `, `New login detected from ${data.location}`),
  }),

  // -------------------------------------------------------------------------
  // DEADLINE REMINDERS
  // -------------------------------------------------------------------------

  deadlineReminder: (data: EmailTemplateData & {
    dealReference: string;
    deadlineType: string;
    deadlineDate: string;
    daysRemaining: number;
    actionUrl: string;
  }) => ({
    subject: `⏰ Deadline Reminder: ${data.dealReference}`,
    html: baseTemplate(`
      <h1 class="title">Deadline Approaching</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        This is a reminder that a deadline is approaching for your trade deal.
      </p>
      
      <div class="card" style="border: 1px solid ${data.daysRemaining <= 1 ? '#ef4444' : '#f59e0b'};">
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deadline Type</span>
          <span class="card-value">${data.deadlineType}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Due Date</span>
          <span class="card-value ${data.daysRemaining <= 1 ? 'danger' : 'warning'}">${data.deadlineDate}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Time Remaining</span>
          <span class="card-value ${data.daysRemaining <= 1 ? 'danger' : 'warning'}">
            ${data.daysRemaining} day${data.daysRemaining !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">Take Action</a>
      </center>
    `, `${data.daysRemaining} day(s) until ${data.deadlineType} deadline`),
  }),

  // -------------------------------------------------------------------------
  // MESSAGE NOTIFICATION
  // -------------------------------------------------------------------------

  newMessage: (data: EmailTemplateData & {
    senderName: string;
    dealReference: string;
    messagePreview: string;
    actionUrl: string;
  }) => ({
    subject: `New Message from ${data.senderName}`,
    html: baseTemplate(`
      <h1 class="title">New Message</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        You have received a new message regarding your trade deal.
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">From</span>
          <span class="card-value">${data.senderName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Deal Reference</span>
          <span class="card-value">${data.dealReference}</span>
        </div>
      </div>
      
      <div class="card" style="background-color: #1f2937; font-style: italic;">
        <p style="color: #9ca3af; margin: 0;">"${data.messagePreview}..."</p>
      </div>
      
      <center>
        <a href="${data.actionUrl}" class="button">Reply to Message</a>
      </center>
    `, `${data.senderName} sent you a message`),
  }),

  // -------------------------------------------------------------------------
  // DAILY DIGEST
  // -------------------------------------------------------------------------

  dailyDigest: (data: EmailTemplateData & {
    date: string;
    summary: {
      activeDeals: number;
      pendingActions: number;
      newMessages: number;
      completedMilestones: number;
    };
    highlights: Array<{
      type: string;
      title: string;
      description: string;
    }>;
    actionUrl: string;
  }) => ({
    subject: `Daily Summary - ${data.date}`,
    html: baseTemplate(`
      <h1 class="title">Your Daily Summary</h1>
      <p class="text">Hi ${data.recipientName},</p>
      <p class="text">
        Here's what happened on your account today.
      </p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td width="25%" style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${data.summary.activeDeals}</div>
            <div style="color: #9ca3af; font-size: 12px;">Active Deals</div>
          </td>
          <td width="25%" style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${data.summary.pendingActions}</div>
            <div style="color: #9ca3af; font-size: 12px;">Pending Actions</div>
          </td>
          <td width="25%" style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: bold; color: #06b6d4;">${data.summary.newMessages}</div>
            <div style="color: #9ca3af; font-size: 12px;">New Messages</div>
          </td>
          <td width="25%" style="text-align: center; padding: 16px;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${data.summary.completedMilestones}</div>
            <div style="color: #9ca3af; font-size: 12px;">Milestones</div>
          </td>
        </tr>
      </table>
      
      ${data.highlights.length > 0 ? `
        <h2 style="color: white; font-size: 18px; margin: 24px 0 16px;">Highlights</h2>
        ${data.highlights.map(h => `
          <div class="card">
            <div style="color: #3b82f6; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">${h.type}</div>
            <div style="color: white; font-weight: 500;">${h.title}</div>
            <div style="color: #9ca3af; font-size: 14px; margin-top: 4px;">${h.description}</div>
          </div>
        `).join('')}
      ` : ''}
      
      <center>
        <a href="${data.actionUrl}" class="button">View Dashboard</a>
      </center>
    `, `${data.summary.pendingActions} pending actions, ${data.summary.activeDeals} active deals`),
  }),
};

// =============================================================================
// SEND EMAIL FUNCTION (SMTP)
// =============================================================================

export interface EmailResult {
  id: string;
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(
  template: { subject: string; html: string },
  to: string,
  options?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }
): Promise<EmailResult> {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('[Email] SMTP not configured, skipping');
    console.log('[Email] Would send to:', to);
    console.log('[Email] Subject:', template.subject);
    return { id: 'not-configured', success: false, skipped: true };
  }

  try {
    const smtp = getTransporter();
    const from = options?.from || process.env.EMAIL_FROM || `"RWA Platform" <${process.env.SMTP_USER}>`;

    console.log('[Email] Sending via SMTP:', {
      to,
      from,
      subject: template.subject,
      host: process.env.SMTP_HOST,
    });

    const info = await smtp.sendMail({
      from,
      to,
      subject: template.subject,
      html: template.html,
      replyTo: options?.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
    });

    console.log('[Email] Sent successfully:', info.messageId);
    return { id: info.messageId, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Failed to send:', errorMessage);
    return { id: 'error', success: false, error: errorMessage };
  }
}

// =============================================================================
// VERIFY SMTP CONNECTION
// =============================================================================

export async function verifyEmailConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
  details?: {
    host: string;
    port: number;
    user: string;
  };
}> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return {
      configured: false,
      connected: false,
      error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.',
    };
  }

  const details = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
  };

  try {
    const smtp = getTransporter();
    await smtp.verify();
    console.log('[Email] SMTP connection verified');
    return { configured: true, connected: true, details };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] SMTP verification failed:', errorMessage);
    return { configured: true, connected: false, error: errorMessage, details };
  }
}

// =============================================================================
// SEND TEST EMAIL
// =============================================================================

export async function sendTestEmail(to: string): Promise<EmailResult> {
  const template = {
    subject: '✅ RWA Platform - Email Configuration Test',
    html: baseTemplate(`
      <h1 class="title">Email Test Successful! ✅</h1>
      <p class="text">Hi there,</p>
      <p class="text">
        This is a test email from your RWA Platform. If you're reading this, your SMTP email configuration is working correctly!
      </p>
      
      <div class="card">
        <div class="card-row">
          <span class="card-label">Sent To</span>
          <span class="card-value">${to}</span>
        </div>
        <div class="card-row">
          <span class="card-label">SMTP Host</span>
          <span class="card-value">${process.env.SMTP_HOST}</span>
        </div>
        <div class="card-row">
          <span class="card-label">From</span>
          <span class="card-value">${process.env.SMTP_USER}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Sent At</span>
          <span class="card-value">${new Date().toISOString()}</span>
        </div>
      </div>
      
      <p class="text">
        Your notification system is now ready to send:
      </p>
      <ul style="color: #9ca3af;">
        <li>Trade deal invitations</li>
        <li>Payment notifications</li>
        <li>Milestone updates</li>
        <li>Dispute alerts</li>
        <li>KYC status updates</li>
        <li>And more...</li>
      </ul>
      
      <center>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}" class="button">Go to Platform</a>
      </center>
    `, 'Test email from RWA Platform'),
  };

  return sendEmail(template, to);
}
