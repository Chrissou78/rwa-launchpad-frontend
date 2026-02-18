// src/lib/notifications/email-service.ts
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// =============================================================================
// TYPES
// =============================================================================

export interface EmailResult {
  id: string;
  provider: 'smtp' | 'resend' | 'none';
  success: boolean;
  skipped?: boolean;
  error?: string;
}

export interface EmailOptions {
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

// =============================================================================
// SMTP TRANSPORTER
// =============================================================================

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // TLS options for better compatibility
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs (common in shared hosting)
        minVersion: 'TLSv1.2' as const,
      },
      // Connection settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000,
      // Debug in development
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
    };

    console.log('[Email] Creating SMTP transporter:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
    });

    transporter = nodemailer.createTransport(config);
  }
  return transporter;
}

// =============================================================================
// SEND EMAIL FUNCTION
// =============================================================================

export async function sendEmail(
  template: EmailTemplate,
  to: string,
  options?: EmailOptions
): Promise<EmailResult> {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('[Email] SMTP not configured, skipping email');
    console.log('[Email] Would send to:', to);
    console.log('[Email] Subject:', template.subject);
    return {
      id: 'not-configured',
      provider: 'none',
      success: false,
      skipped: true,
    };
  }

  try {
    const smtp = getTransporter();
    const from = options?.from || process.env.EMAIL_FROM || `"RWA Platform" <${process.env.SMTP_USER}>`;

    console.log('[Email] Sending email:', {
      to,
      from,
      subject: template.subject,
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

    return {
      id: info.messageId,
      provider: 'smtp',
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Failed to send:', errorMessage);

    return {
      id: 'error',
      provider: 'smtp',
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// SEND TO MULTIPLE RECIPIENTS
// =============================================================================

export async function sendEmailToMany(
  template: EmailTemplate,
  recipients: string[],
  options?: EmailOptions
): Promise<{ sent: number; failed: number; results: EmailResult[] }> {
  const results: EmailResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    const result = await sendEmail(template, to, options);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed, results };
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
  // Check configuration
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
    
    console.log('[Email] SMTP connection verified successfully');
    
    return {
      configured: true,
      connected: true,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] SMTP verification failed:', errorMessage);

    return {
      configured: true,
      connected: false,
      error: errorMessage,
      details,
    };
  }
}

// =============================================================================
// SEND TEST EMAIL
// =============================================================================

export async function sendTestEmail(to: string): Promise<EmailResult> {
  const template: EmailTemplate = {
    subject: '✅ RWA Platform - Email Configuration Test',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #111827; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #1f2937; }
          .header { background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 32px; color: #e5e7eb; }
          .success-box { background: #065f46; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .success-box h2 { color: #10b981; margin: 0 0 8px 0; font-size: 18px; }
          .success-box p { color: #a7f3d0; margin: 0; }
          .info { background: #374151; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #4b5563; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #9ca3af; }
          .info-value { color: white; font-family: monospace; }
          .footer { background: #111827; padding: 24px; text-align: center; }
          .footer p { color: #6b7280; font-size: 12px; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RWA Platform</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>✅ Email Configuration Working!</h2>
              <p>Your SMTP email settings are configured correctly.</p>
            </div>
            
            <p style="color: #9ca3af;">This is a test email from your RWA Platform to verify that email notifications are working properly.</p>
            
            <div class="info">
              <div class="info-row">
                <span class="info-label">Sent To</span>
                <span class="info-value">${to}</span>
              </div>
              <div class="info-row">
                <span class="info-label">SMTP Host</span>
                <span class="info-value">${process.env.SMTP_HOST}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Sent At</span>
                <span class="info-value">${new Date().toISOString()}</span>
              </div>
            </div>
            
            <p style="color: #9ca3af;">If you received this email, your notification system is ready to send:</p>
            <ul style="color: #9ca3af;">
              <li>Trade deal invitations</li>
              <li>Payment notifications</li>
              <li>Milestone updates</li>
              <li>Dispute alerts</li>
              <li>KYC status updates</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} RWA Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return sendEmail(template, to);
}
