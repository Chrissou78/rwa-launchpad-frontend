import { NextResponse } from 'next/server';
import {
  KYC_LEVELS,
  KYC_LEVEL_NAMES,
  KYC_INVESTMENT_LIMITS,
  formatInvestmentLimit,
} from '@/lib/constants/kyc';

export async function GET() {
  try {
    // Return limits as an object keyed by tier name
    const limits = {
      None: 0,
      Bronze: KYC_INVESTMENT_LIMITS[KYC_LEVELS.BASIC],
      Silver: KYC_INVESTMENT_LIMITS[KYC_LEVELS.STANDARD],
      Gold: KYC_INVESTMENT_LIMITS[KYC_LEVELS.ACCREDITED],
      Diamond: KYC_INVESTMENT_LIMITS[KYC_LEVELS.INSTITUTIONAL] === Infinity ? null : KYC_INVESTMENT_LIMITS[KYC_LEVELS.INSTITUTIONAL],
    };

    return NextResponse.json({
      success: true,
      limits,
      tiers: {
        basic: { level: KYC_LEVELS.BASIC, limit: KYC_INVESTMENT_LIMITS[KYC_LEVELS.BASIC], formatted: formatInvestmentLimit(KYC_LEVELS.BASIC) },
        standard: { level: KYC_LEVELS.STANDARD, limit: KYC_INVESTMENT_LIMITS[KYC_LEVELS.STANDARD], formatted: formatInvestmentLimit(KYC_LEVELS.STANDARD) },
        accredited: { level: KYC_LEVELS.ACCREDITED, limit: KYC_INVESTMENT_LIMITS[KYC_LEVELS.ACCREDITED], formatted: formatInvestmentLimit(KYC_LEVELS.ACCREDITED) },
        institutional: { level: KYC_LEVELS.INSTITUTIONAL, limit: null, formatted: formatInvestmentLimit(KYC_LEVELS.INSTITUTIONAL) },
      }
    });
  } catch (error) {
    console.error('Error fetching KYC limits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KYC limits' },
      { status: 500 }
    );
  }
}
