import { NextResponse } from 'next/server';

export async function GET() {
  console.log('=== KYC Test Endpoint ===');
  console.log('KYC_MANAGER_ADDRESS:', process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS);
  console.log('RPC_URL:', process.env.NEXT_PUBLIC_RPC_URL);
  console.log('VERIFIER_PRIVATE_KEY set:', !!process.env.VERIFIER_PRIVATE_KEY);
  
  return NextResponse.json({
    configured: {
      kycManager: !!process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS,
      rpcUrl: !!process.env.NEXT_PUBLIC_RPC_URL,
      verifierKey: !!process.env.VERIFIER_PRIVATE_KEY
    },
    values: {
      kycManager: process.env.NEXT_PUBLIC_KYC_MANAGER_ADDRESS,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL?.substring(0, 30) + '...'
    }
  });
}
