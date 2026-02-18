// src/app/api/kyc/level/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KYCLevel, KYC_TRADE_LIMITS, KYC_LEVEL_INFO } from '@/lib/trade/kyc-authorization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET - Get KYC level for a wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Get KYC data
    const { data: kyc, error } = await supabase
      .from('trade_kyc')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error || !kyc) {
      // No KYC record found
      return NextResponse.json({
        level: 'none' as KYCLevel,
        verified: false,
        limits: KYC_TRADE_LIMITS['none'],
        info: KYC_LEVEL_INFO['none'],
      });
    }

    // Determine KYC level based on verification status and documents
    const level = determineKycLevel(kyc);

    return NextResponse.json({
      level,
      verified: kyc.status === 'verified',
      verificationLevel: kyc.verification_level,
      companyName: kyc.company_name,
      country: kyc.company_country,
      limits: KYC_TRADE_LIMITS[level],
      info: KYC_LEVEL_INFO[level],
      expiresAt: kyc.expires_at,
      sanctionsStatus: kyc.sanctions_status,
      pepStatus: kyc.pep_status,
    });
  } catch (error) {
    console.error('Error fetching KYC level:', error);
    return NextResponse.json({ error: 'Failed to fetch KYC level' }, { status: 500 });
  }
}

function determineKycLevel(kyc: any): KYCLevel {
  // If not verified, return none
  if (kyc.status !== 'verified') {
    return 'none';
  }

  // Check verification level set by admin
  if (kyc.verification_level) {
    const levels: KYCLevel[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];
    if (kyc.verification_level >= 1 && kyc.verification_level <= 4) {
      return levels[kyc.verification_level];
    }
  }

  // Auto-determine based on documents and checks
  const documents = kyc.documents ? JSON.parse(kyc.documents) : [];
  const beneficialOwners = kyc.beneficial_owners ? JSON.parse(kyc.beneficial_owners) : [];

  // Diamond requirements
  if (
    documents.some((d: any) => d.type === 'board_resolution') &&
    documents.some((d: any) => d.type === 'credit_rating') &&
    documents.some((d: any) => d.type === 'insurance_certificate') &&
    kyc.sanctions_status === 'clear' &&
    kyc.pep_status === 'clear'
  ) {
    return 'diamond';
  }

  // Gold requirements
  if (
    beneficialOwners.length > 0 &&
    documents.some((d: any) => d.type === 'bank_reference') &&
    documents.some((d: any) => d.type === 'financial_statements') &&
    kyc.sanctions_status === 'clear'
  ) {
    return 'gold';
  }

  // Silver requirements
  if (
    documents.some((d: any) => d.type === 'proof_of_address') &&
    documents.some((d: any) => d.type === 'company_registration') &&
    documents.some((d: any) => d.type === 'source_of_funds')
  ) {
    return 'silver';
  }

  // Bronze - basic verification
  if (
    documents.some((d: any) => d.type === 'government_id') &&
    kyc.contact_email
  ) {
    return 'bronze';
  }

  return 'none';
}
