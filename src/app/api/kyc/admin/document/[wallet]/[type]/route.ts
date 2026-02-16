// src/app/api/kyc/admin/document/[wallet]/[type]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string; type: string }> }
) {
  // AWAIT the params
  const { wallet, type } = await params;
  
  if (!wallet || !type) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  try {
    const storagePath = path.join(STORAGE_DIR, `${wallet.toLowerCase()}.json`);
    const data = await readFile(storagePath, 'utf-8');
    const submission = JSON.parse(data);
    
    // Map type to document field
    const docMap: Record<string, string> = {
      'idDocument': 'idDocument',
      'idDocumentFront': 'idDocumentFront',
      'idDocumentBack': 'idDocumentBack',
      'selfie': 'selfie',
      'addressProof': 'addressProof',
      'accreditedProof': 'accreditedProof'
    };
    
    const docKey = docMap[type] || type;
    let document = submission[docKey];
    
    // Fallback for ID document
    if (!document && type === 'idDocument') {
      document = submission.idDocumentFront;
    }
    
    if (!document || !document.data) {
      return NextResponse.json({
        error: 'Document not found',
        type,
        availableDocuments: Object.keys(submission).filter(k => 
          submission[k] && typeof submission[k] === 'object' && submission[k].data
        )
      }, { status: 404 });
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(document.data, 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${document.name || type}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to retrieve document',
      details: error.message
    }, { status: 500 });
  }
}