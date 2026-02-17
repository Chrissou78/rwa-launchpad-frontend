// src/app/api/admin/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  try {
    const adminStatus = await isAdmin(walletAddress);
    return NextResponse.json({ isAdmin: adminStatus });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}