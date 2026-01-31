import { NextRequest, NextResponse } from 'next/server';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Pinata API keys not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { metadata, files } = body;

    // Upload metadata JSON to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name || 'Project'}-metadata.json`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Pinata error:', error);
      return NextResponse.json(
        { error: 'Failed to upload to IPFS' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;

    return NextResponse.json({
      success: true,
      ipfsHash,
      ipfsUri,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    });
  } catch (error: any) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
