// src/app/api/admin/email/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailConnection, sendTestEmail } from '@/lib/notifications/email-service';

// GET - Check email configuration
export async function GET(request: NextRequest) {
  const adminAddress = request.headers.get('x-wallet-address');
  
  // Basic admin check (you may want to add proper admin verification)
  if (!adminAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await verifyEmailConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json({ 
      error: 'Failed to verify email configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Send test email
export async function POST(request: NextRequest) {
  const adminAddress = request.headers.get('x-wallet-address');
  
  if (!adminAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const result = await sendTestEmail(to);
    
    return NextResponse.json({
      success: result.success,
      messageId: result.id,
      error: result.error,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
