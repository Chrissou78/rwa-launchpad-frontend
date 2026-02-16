// src/app/api/admin/demote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { demoteToAdmin, removeAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetAddress, action } = body;

    if (!targetAddress || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result;
    if (action === 'demote') {
      result = await demoteToAdmin(targetAddress, walletAddress);
    } else if (action === 'remove') {
      result = await removeAdmin(targetAddress, walletAddress);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error demoting admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
