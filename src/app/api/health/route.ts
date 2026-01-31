import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

export async function GET() {
  let blockchainConnected = false;
  let blockNumber = 0;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    blockNumber = await provider.getBlockNumber();
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
