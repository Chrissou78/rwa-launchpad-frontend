// src/app/api/admin/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllAdmins, isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is an admin
    const callerIsAdmin = await isAdmin(walletAddress);
    if (!callerIsAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admins = await getAllAdmins();

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error getting admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
