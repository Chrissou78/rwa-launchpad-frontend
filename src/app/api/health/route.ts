// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { RPC_URL } from '@/config/contracts';

const RRPC_URL = process.env.NEXT_PUBLIC_RPC_URL || RPC_URL;

export async function GET() {
  let blockchainConnected = false;
  let blockNumber = 0;

  try {
    const client = createPublicClient({
      chain: avalancheFuji,
      transport: http(RRPC_URL),
    });
    const block = await client.getBlockNumber();
    blockNumber = Number(block);
    blockchainConnected = true;
  } catch (error) {
    console.error('Blockchain connection error:', error);
  }

  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      blockchain: {
        connected: blockchainConnected,
        blockNumber,
      },
    },
  });
}