// src/app/api/admin/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminActivityLog, isSuperAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can view activity log
    const callerIsSuperAdmin = await isSuperAdmin(walletAddress);
    if (!callerIsSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const activityLog = await getAdminActivityLog(limit);

    return NextResponse.json({ activityLog });
  } catch (error) {
    console.error('Error getting activity log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
