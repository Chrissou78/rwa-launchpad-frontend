import { NextRequest, NextResponse } from 'next/server';
import { getKYCDocuments } from '@/lib/kycStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    
    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    
    const documents = await getKYCDocuments(address);
    
    if (!documents) {
      return NextResponse.json({ 
        found: false, 
        message: 'No documents found for this address' 
      });
    }
    
    return NextResponse.json({
      found: true,
      documents
    });
    
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
