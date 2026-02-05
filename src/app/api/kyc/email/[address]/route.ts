import { NextRequest, NextResponse } from 'next/server';
import { getKYCEmail, saveKYCEmail } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ found: false, error: 'Invalid address' }, { status: 400 });
    }

    // Try Supabase first
    try {
      const email = await getKYCEmail(address);
      if (email) {
        return NextResponse.json({ found: true, email });
      }
    } catch (e) {
      console.log('[KYC Email] Supabase not available, trying file storage');
    }

    // Fallback to file storage for local dev
    try {
      const { getKYCDocuments } = await import('@/lib/kycStorage');
      const docs = await getKYCDocuments(address);
      if (docs?.email) {
        return NextResponse.json({ found: true, email: docs.email });
      }
    } catch (e) {
      // File storage not available
    }

    return NextResponse.json({ found: false, email: null });
  } catch (error: any) {
    console.error('[KYC Email] Error:', error);
    return NextResponse.json({ found: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { email } = await request.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const success = await saveKYCEmail(address, email);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[KYC Email] Save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
