import { NextRequest, NextResponse } from 'next/server';

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';
const POLYGONSCAN_API_URL = 'https://api-amoy.polygonscan.com/api';

// Implementation contract addresses (from deployment)
const IMPLEMENTATIONS = {
  securityToken: '0xF399A233884ADF36de64cBb01ff28c907670Ba71',
  escrowVault: '0x592E76b6883049D81f0118493AcDa9d8ce8C4c24',
  compliance: '0x175b5Fa6eb9b0331a2dd45820020D05617BA0AE3',
};

export async function POST(request: NextRequest) {
  try {
    const { address, contractType, projectId } = await request.json();

    if (!address || !contractType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For UUPS proxies, we verify the proxy contract pointing to the implementation
    // Polygonscan will auto-detect the proxy pattern
    
    const implementationAddress = IMPLEMENTATIONS[contractType as keyof typeof IMPLEMENTATIONS];
    
    if (!implementationAddress) {
      return NextResponse.json(
        { error: 'Unknown contract type' },
        { status: 400 }
      );
    }

    // Verify as ERC1967Proxy
    const verifyParams = new URLSearchParams({
      apikey: POLYGONSCAN_API_KEY,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: address,
      sourceCode: getProxySourceCode(),
      codeformat: 'solidity-single-file',
      contractname: 'ERC1967Proxy',
      compilerversion: 'v0.8.20+commit.a1b79de6',
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: encodeConstructorArgs(implementationAddress),
      evmversion: 'paris',
    });

    const response = await fetch(POLYGONSCAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    });

    const result = await response.json();

    if (result.status === '1') {
      // Verification submitted, check status
      const guid = result.result;
      
      // Poll for verification result (simplified - in production use proper polling)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const checkParams = new URLSearchParams({
        apikey: POLYGONSCAN_API_KEY,
        module: 'contract',
        action: 'checkverifystatus',
        guid,
      });

      const checkResponse = await fetch(`${POLYGONSCAN_API_URL}?${checkParams.toString()}`);
      const checkResult = await checkResponse.json();

      return NextResponse.json({
        success: checkResult.status === '1',
        message: checkResult.result,
        guid,
      });
    }

    // If direct verification fails, try marking as proxy
    const proxyParams = new URLSearchParams({
      apikey: POLYGONSCAN_API_KEY,
      module: 'contract',
      action: 'verifyproxycontract',
      address,
      expectedimplementation: implementationAddress,
    });

    const proxyResponse = await fetch(`${POLYGONSCAN_API_URL}?${proxyParams.toString()}`);
    const proxyResult = await proxyResponse.json();

    return NextResponse.json({
      success: proxyResult.status === '1',
      message: proxyResult.result || 'Verification submitted',
      fallbackUsed: true,
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

function getProxySourceCode(): string {
  // Minimal ERC1967Proxy source for verification
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
`;
}

function encodeConstructorArgs(implementation: string): string {
  // Encode (address implementation, bytes memory _data)
  // Implementation address + empty bytes for _data
  const impl = implementation.slice(2).padStart(64, '0');
  const dataOffset = '0000000000000000000000000000000000000000000000000000000000000040';
  const dataLength = '0000000000000000000000000000000000000000000000000000000000000000';
  return impl + dataOffset + dataLength;
}
