import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { polygonAmoy } from 'viem/chains';

const KYC_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

const abi = parseAbi([
  'function tierLimits(uint8) view returns (uint256)'
]);

// Tier names for response
const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'] as const;

export async function GET() {
  try {
    if (!KYC_MANAGER_ADDRESS) {
      console.error('[KYC Limits API] KYC_MANAGER_ADDRESS not configured');
      return NextResponse.json({
        success: true,
        limits: {
          None: 0,
          Bronze: 10000,
          Silver: 100000,
          Gold: 1000000,
          Diamond: Infinity
        },
        byLevel: { 0: 0, 1: 10000, 2: 100000, 3: 1000000, 4: Infinity },
        source: 'fallback-no-config'
      });
    }

    const client = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL)
    });

    // Fetch tier limits from contract (tiers 1-4, tier 0 is always 0)
    const limitPromises = [1, 2, 3, 4].map(tier =>
      client.readContract({
        address: KYC_MANAGER_ADDRESS,
        abi,
        functionName: 'tierLimits',
        args: [tier]
      })
    );

    const rawLimits = await Promise.all(limitPromises);

    // Convert from USDC decimals (6) to USD
    // Diamond (tier 4) uses 0 to represent unlimited
    const limits: Record<string, number> = { None: 0 };
    const byLevel: Record<number, number> = { 0: 0 };

    rawLimits.forEach((limit, index) => {
      const tierNumber = index + 1; // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
      const tierName = TIER_NAMES[tierNumber];
      
      // Diamond: 0 means unlimited
      if (tierNumber === 4 && limit === 0n) {
        limits[tierName] = Infinity;
        byLevel[tierNumber] = Infinity;
      } else {
        const value = Number(limit) / 1_000_000;
        limits[tierName] = value;
        byLevel[tierNumber] = value;
      }
    });

    console.log('[KYC Limits API] Fetched from contract:', limits);

    return NextResponse.json({
      success: true,
      limits,
      byLevel,
      source: 'contract',
      contractAddress: KYC_MANAGER_ADDRESS
    });
  } catch (error) {
    console.error('[KYC Limits API] Error:', error);
    
    return NextResponse.json({
      success: true,
      limits: {
        None: 0,
        Bronze: 10000,
        Silver: 100000,
        Gold: 1000000,
        Diamond: Infinity
      },
      byLevel: { 0: 0, 1: 10000, 2: 100000, 3: 1000000, 4: Infinity },
      source: 'fallback-error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}