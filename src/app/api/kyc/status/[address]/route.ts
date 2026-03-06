import { NextRequest, NextResponse } from 'next/server';

const KYC_INVESTMENT_LIMITS: Record<number, number> = {
  0: 0,
  1: 20_000,
  2: 200_000,
  3: 2_000_000,
  4: Infinity,
};

const KYC_EXPIRY_DURATION = 365 * 24 * 60 * 60;

function formatLimit(kycLevel: number): string {
  const limit = KYC_INVESTMENT_LIMITS[kycLevel] ?? 0;
  if (limit === 0) return '$0';
  if (limit === Infinity) return 'Unlimited';
  if (limit >= 1_000_000) return `$${(limit / 1_000_000).toFixed(0)}M`;
  if (limit >= 1_000) return `$${(limit / 1_000).toFixed(0)}K`;
  return `$${limit.toLocaleString()}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const wallet = address;

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json({
        success: true,
        found: false,
        wallet: wallet?.toLowerCase() || 'unknown',
        kycStatus: 'none',
        applicationStatus: 'none',
        kycLevel: 0,
        isVerified: false,
        canInvest: false,
        investmentLimit: 0,
        investmentLimitFormatted: '$0',
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: true,
        found: false,
        wallet: wallet.toLowerCase(),
        kycStatus: 'none',
        applicationStatus: 'none',
        kycLevel: 0,
        isVerified: false,
        canInvest: false,
        investmentLimit: 0,
        investmentLimitFormatted: '$0',
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: kycData, error: kycError } = await supabase
      .from('kyc_applications')
      .select('*')
      .ilike('wallet_address', wallet)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kycError) {
      console.error('Supabase query error:', kycError);
    }

    if (!kycData) {
      return NextResponse.json({
        success: true,
        found: false,
        wallet: wallet.toLowerCase(),
        kycStatus: 'none',
        applicationStatus: 'none',
        kycLevel: 0,
        isVerified: false,
        canInvest: false,
        investmentLimit: 0,
        investmentLimitFormatted: '$0',
      });
    }

    const kycLevel = kycData.current_level || 0;
    const status = kycData.status || 'none';
    const requestedLevel = kycData.requested_level || 0;
    const approvedAt = kycData.approved_at;
    
    const expiresAt = approvedAt 
      ? new Date(new Date(approvedAt).getTime() + KYC_EXPIRY_DURATION * 1000)
      : null;
    const isExpired = expiresAt ? new Date() > expiresAt : false;

    const investmentLimit = KYC_INVESTMENT_LIMITS[kycLevel] || 0;
    const isApproved = status === 'approved' && !isExpired;

    // Determine effective KYC status for UI
    let effectiveKycStatus = status;
    if (isExpired) {
      effectiveKycStatus = 'expired';
    }

    return NextResponse.json({
      success: true,
      found: true,
      wallet: wallet.toLowerCase(),
      // Raw application status from DB
      applicationStatus: status,
      // Effective status (considering expiry)
      kycStatus: effectiveKycStatus,
      // Current verified level
      kycLevel: isApproved ? kycLevel : 0,
      // Requested level (for upgrades/pending)
      requestedLevel: requestedLevel,
      isVerified: isApproved,
      canInvest: isApproved && kycLevel >= 1,
      investmentLimit: isExpired ? 0 : (investmentLimit === Infinity ? null : investmentLimit),
      investmentLimitFormatted: formatLimit(isApproved ? kycLevel : 0),
      submittedAt: kycData.submitted_at,
      approvedAt: kycData.approved_at,
      expiresAt: expiresAt?.toISOString() || null,
      isExpired,
      // Flags for UI
      isPendingPayment: status === 'pending_payment',
      isPendingReview: status === 'pending',
      // Include submission object for KYCContext
      submission: {
        level: isApproved ? kycLevel : 0,
        status: isExpired ? 3 : (status === 'approved' ? 1 : status === 'rejected' ? 2 : 0),
        countryCode: kycData.country_code,
        requestedLevel: requestedLevel,
        expiresAt: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : null,
        totalInvested: 0,
      }
    });

  } catch (error) {
    console.error('Error fetching KYC status:', error);
    return NextResponse.json({
      success: true,
      found: false,
      wallet: 'error',
      kycStatus: 'none',
      applicationStatus: 'none',
      kycLevel: 0,
      isVerified: false,
      canInvest: false,
      investmentLimit: 0,
      investmentLimitFormatted: '$0',
    });
  }
}