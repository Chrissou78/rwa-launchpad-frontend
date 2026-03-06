import { NextRequest, NextResponse } from 'next/server';

// Using Pinata for IPFS - you can also use NFT.Storage, Web3.Storage, or Infura
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle JSON metadata upload
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { metadata, type } = body;
      
      if (type === 'metadata' && metadata) {
        const url = await uploadJsonToPinata(metadata);
        return NextResponse.json({ url, success: true });
      }
      
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    // Handle file upload (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const type = formData.get('type') as string | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      // Validate file type
      if (type === 'image') {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!validImageTypes.includes(file.type)) {
          return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 });
        }
      } else if (type === 'document') {
        const validDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validDocTypes.includes(file.type)) {
          return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
        }
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
          return NextResponse.json({ error: 'Document too large (max 50MB)' }, { status: 400 });
        }
      }
      
      const url = await uploadFileToPinata(file);
      return NextResponse.json({ url, success: true });
    }
    
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    
  } catch (error) {
    console.error('[IPFS Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

async function uploadFileToPinata(file: File): Promise<string> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    throw new Error('Pinata credentials not configured');
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  const metadata = JSON.stringify({
    name: file.name,
  });
  formData.append('pinataMetadata', metadata);
  
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);
  
  const headers: HeadersInit = {};
  if (PINATA_JWT) {
    headers['Authorization'] = `Bearer ${PINATA_JWT}`;
  } else {
    headers['pinata_api_key'] = PINATA_API_KEY!;
    headers['pinata_secret_api_key'] = PINATA_SECRET_KEY!;
  }
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Pinata] Upload error:', errorText);
    throw new Error('Failed to upload to IPFS');
  }
  
  const data = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

async function uploadJsonToPinata(json: object): Promise<string> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_KEY)) {
    throw new Error('Pinata credentials not configured');
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (PINATA_JWT) {
    headers['Authorization'] = `Bearer ${PINATA_JWT}`;
  } else {
    headers['pinata_api_key'] = PINATA_API_KEY!;
    headers['pinata_secret_api_key'] = PINATA_SECRET_KEY!;
  }
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: 'token-metadata.json',
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Pinata] JSON upload error:', errorText);
    throw new Error('Failed to upload metadata to IPFS');
  }
  
  const data = await response.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}
