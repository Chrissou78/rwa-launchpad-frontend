// src/app/api/cron/deadlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processDeadlineReminders } from '@/lib/notifications/deadline-reminders';

// Support both GET and POST
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processDeadlineReminders();
    return NextResponse.json({ 
      success: true, 
      message: 'Deadline reminders processed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron] Deadline reminder error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
