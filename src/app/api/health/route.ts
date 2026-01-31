import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

export async function GET() {
  let blockchainConnected = false;
  let blockNumber = 0;

  try {
    const client = createPublicClient({
      chain: polygonAmoy,
      transport: http(RPC_URL),
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