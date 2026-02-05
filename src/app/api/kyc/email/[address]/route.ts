import { NextRequest, NextResponse } from 'next/server';
import { getKYCDocuments } from '@/lib/kycStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    console.log('[KYC Email] Raw address from params:', address);

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ found: false, error: 'Invalid address' }, { status: 400 });
    }

    const docs = await getKYCDocuments(address);
    console.log('[KYC Email] getKYCDocuments result:', docs);
    
    if (!docs) {
      console.log('[KYC Email] No docs found');
      return NextResponse.json({ found: false, email: null });
    }
    
    if (!docs.email) {
      console.log('[KYC Email] Docs found but no email field');
      return NextResponse.json({ found: false, email: null });
    }

    console.log('[KYC Email] Found email:', docs.email);
    return NextResponse.json({ found: true, email: docs.email });
  } catch (error) {
    console.error('[KYC Email] Error:', error);
    return NextResponse.json({ found: false, error: 'Internal error' }, { status: 500 });
  }
}