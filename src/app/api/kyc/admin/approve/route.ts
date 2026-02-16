// src/app/api/kyc/admin/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, requestedLevel, isUpgrade } = await request.json();
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }
    
    // Update the stored submission
    const storagePath = path.join(STORAGE_DIR, `${walletAddress.toLowerCase()}.json`);
    const data = await readFile(storagePath, 'utf-8');
    const submission = JSON.parse(data);
    
    submission.status = 'Approved';
    submission.reviewedAt = Date.now();
    submission.currentLevel = requestedLevel;
    
    await writeFile(storagePath, JSON.stringify(submission, null, 2));
    
    // TODO: Call contract to approve on-chain if configured
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider);
    // const contract = new ethers.Contract(CONTRACTS.KYCManager, KYCManagerABI, wallet);
    // if (isUpgrade) {
    //   await contract.approveUpgrade(walletAddress);
    // } else {
    //   await contract.approveKYC(walletAddress);
    // }
    
    console.log(`[Admin] Approved ${isUpgrade ? 'upgrade' : 'KYC'} for ${walletAddress}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Approve error:', error);
    return NextResponse.json({ 
      error: 'Failed to approve', 
      details: error.message 
    }, { status: 500 });
  }
}
