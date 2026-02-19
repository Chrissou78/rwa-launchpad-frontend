// src/app/api/kyc/limits/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { RPC_URL, CONTRACTS } from '@/config/contracts';
import { KYCManagerABI } from '@/config/abis';

const MAX_UINT256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

export async function GET() {
  try {
    if (!CONTRACTS.KYCManager) {
      return NextResponse.json({ 
        success: false, 
        error: 'KYCManager not configured' 
      }, { status: 500 });
    }

    const publicClient = createPublicClient({chain: avalancheFuji, transport: http(process.env.RPC_URL || RPC_URL),});

    const contractAddress = CONTRACTS.KYCManager as `0x${string}`;

    // Fetch all level limits (1-4)
    const limits: Record<string, number> = {};
    
    for (let level = 1; level <= 4; level++) {
      try {
        const limitRaw = await publicClient.readContract({
          address: contractAddress,
          abi: KYCManagerABI,
          functionName: 'levelInvestmentLimits',
          args: [level],
        }) as bigint;

        // Check if unlimited (max uint256 or very large)
        if (limitRaw >= MAX_UINT256 / BigInt(2)) {
          limits[level] = Infinity;
        } else {
          // Convert from 18 decimals to human-readable
          limits[level] = Number(formatUnits(limitRaw, 18));
        }
      } catch (e) {
        console.error(`Error fetching limit for level ${level}:`, e);
        limits[level] = 0;
      }
    }

    // Map to tier names
    const tierLimits = {
      None: 0,
      Bronze: limits[1] || 0,
      Silver: limits[2] || 0,
      Gold: limits[3] || 0,
      Diamond: Infinity,
      // Also include numeric keys for backwards compatibility
      1: limits[1] || 0,
      2: limits[2] || 0,
      3: limits[3] || 0,
      4: Infinity,
    };

    return NextResponse.json({
      success: true,
      limits: tierLimits,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Error fetching KYC limits:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}