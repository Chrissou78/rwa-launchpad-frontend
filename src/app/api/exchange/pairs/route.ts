// src/app/api/exchange/pairs/route.ts
import { NextResponse } from 'next/server';
import { getTradingPairs } from '@/lib/exchange';

export async function GET() {
  try {
    const pairs = await getTradingPairs();
    return NextResponse.json({ pairs });
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
