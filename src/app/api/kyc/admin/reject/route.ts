// src/app/api/kyc/admin/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, isUpgrade, reason } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // Update the stored submission
    const storagePath = path.join(STORAGE_DIR, `${walletAddress.toLowerCase()}.json`);
    const data = await readFile(storagePath, 'utf-8');
    const submission = JSON.parse(data);
    
    submission.status = 'Rejected';
    submission.reviewedAt = Date.now();
    submission.rejectionReason = reason;
    
    await writeFile(storagePath, JSON.stringify(submission, null, 2));
    
    // TODO: Call contract to reject on-chain if configured
    
    console.log(`[Admin] Rejected ${isUpgrade ? 'upgrade' : 'KYC'} for ${walletAddress}: ${reason}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Reject error:', error);
    return NextResponse.json({ 
      error: 'Failed to reject', 
      details: error.message 
    }, { status: 500 });
  }
}
