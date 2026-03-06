import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, demoteToAdmin, removeAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdminCheck = await isSuperAdmin(walletAddress);
    if (!superAdminCheck) {
      return NextResponse.json({ error: 'Only super admins can demote users' }, { status: 403 });
    }

    const { targetAddress, action } = await request.json();

    if (!targetAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (action === 'remove') {
      result = await removeAdmin(targetAddress, walletAddress);
    } else {
      result = await demoteToAdmin(targetAddress, walletAddress);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error demoting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
