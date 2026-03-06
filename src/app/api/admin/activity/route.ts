import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, getAdminActivityLog } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdminCheck = await isSuperAdmin(walletAddress);
    if (!superAdminCheck) {
      return NextResponse.json({ error: 'Only super admins can view activity log' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const activityLog = await getAdminActivityLog(limit);
    return NextResponse.json({ activityLog });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
