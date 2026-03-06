// src/lib/notifications/email-smtp.ts
import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,           // e.g., mail.yourdomain.com
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,         // e.g., notifications@yourdomain.com
    pass: process.env.SMTP_PASSWORD,     // your email password
  },
});

export async function sendEmail(
  template: { subject: string; html: string },
  to: string,
  options?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  }
) {
  // Skip if SMTP not configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('[Email] SMTP not configured, skipping');
    console.log('[Email] Would send to:', to);
    console.log('[Email] Subject:', template.subject);
    return { id: 'skipped', skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: options?.from || process.env.EMAIL_FROM || `"RWA Platform" <${process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
      replyTo: options?.replyTo,
      cc: options?.cc,
      bcc: options?.bcc,
    });

    console.log('[Email] Sent:', info.messageId);
    return { id: info.messageId, success: true };
  } catch (error) {
    console.error('[Email] Error:', error);
    throw error;
  }
}

// Verify connection on startup (optional)
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error);
    return false;
  }
}
