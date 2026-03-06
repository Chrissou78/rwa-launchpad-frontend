import { NextRequest, NextResponse } from 'next/server';
import {
  KYC_INVESTMENT_LIMITS,
  formatInvestmentLimit,
  KYC_EXPIRY_DURATION,
} from '@/lib/constants/kyc';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        },
        message: 'Database not configured'
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: kycData, error: kycError } = await supabase
      .from('kyc_applications')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError) {
      console.error('Supabase query error:', kycError);
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        },
        message: 'Error querying database'
      });
    }

    if (!kycData) {
      return NextResponse.json({
        success: true,
        status: {
          wallet: wallet.toLowerCase(),
          kycStatus: 'none',
          kycLevel: 0,
          isVerified: false,
          canInvest: false,
          investmentLimit: 0,
          investmentLimitFormatted: '$0',
          submittedAt: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
        }
      });
    }

    const expiresAt = kycData.verified_at 
      ? new Date(new Date(kycData.verified_at).getTime() + KYC_EXPIRY_DURATION * 1000)
      : null;
    const isExpired = expiresAt ? new Date() > expiresAt : false;

    const kycLevel = kycData.kyc_level || 0;
    const investmentLimit = KYC_INVESTMENT_LIMITS[kycLevel as keyof typeof KYC_INVESTMENT_LIMITS] || 0;

    return NextResponse.json({
      success: true,
      status: {
        wallet: wallet.toLowerCase(),
        kycStatus: isExpired ? 'expired' : kycData.status,
        kycLevel: isExpired ? 0 : kycLevel,
        isVerified: kycData.status === 'approved' && !isExpired,
        canInvest: kycData.status === 'approved' && !isExpired && kycLevel >= 1,
        investmentLimit: isExpired ? 0 : (investmentLimit === Infinity ? null : investmentLimit),
        investmentLimitFormatted: formatInvestmentLimit(isExpired ? 0 : kycLevel),
        submittedAt: kycData.created_at,
        verifiedAt: kycData.verified_at,
        expiresAt: expiresAt?.toISOString() || null,
        isExpired,
      }
    });

  } catch (error) {
    console.error('Error fetching KYC status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
