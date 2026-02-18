// src/app/api/cron/digest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processDailyDigests } from '@/lib/notifications/daily-digest';

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processDailyDigests();
    return NextResponse.json({ 
      success: true, 
      message: 'Daily digests processed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Cron] Daily digest error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
