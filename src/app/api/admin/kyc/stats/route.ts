// src/app/api/admin/kyc/stats/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Return placeholder stats for now
  return NextResponse.json({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
}
