import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdmin, promoteToAdmin, promoteToSuperAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superAdminCheck = await isSuperAdmin(walletAddress);
    if (!superAdminCheck) {
      return NextResponse.json({ error: 'Only super admins can promote users' }, { status: 403 });
    }

    const { targetAddress, role } = await request.json();

    if (!targetAddress || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (role === 'super_admin') {
      result = await promoteToSuperAdmin(targetAddress, walletAddress);
    } else {
      result = await promoteToAdmin(targetAddress, walletAddress);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error promoting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
