// src/app/api/cron/deadlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processDeadlineReminders } from '@/lib/notifications/deadline-reminders';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processDeadlineReminders();
    return NextResponse.json({ success: true, message: 'Deadline reminders processed' });
  } catch (error: any) {
    console.error('[Cron] Deadline reminder error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
