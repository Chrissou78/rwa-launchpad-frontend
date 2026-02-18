// src/app/api/trade/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST - Upload document
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dealId = formData.get('dealId') as string;
    const documentType = formData.get('documentType') as string;
    const name = formData.get('name') as string;

    if (!file || !dealId || !documentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify deal exists and user is a party
    const { data: deal, error: dealError } = await supabase
      .from('trade_deals')
      .select('buyer_wallet, seller_wallet')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const isParty = 
      deal.buyer_wallet === walletAddress.toLowerCase() ||
      deal.seller_wallet === walletAddress.toLowerCase();

    if (!isParty) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${dealId}/${documentType}/${uuidv4()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('trade-documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('trade-documents')
      .getPublicUrl(fileName);

    // Create document record
    const documentId = uuidv4();
    const documentData = {
      id: documentId,
      deal_id: dealId,
      type: documentType,
      name: name || file.name,
      original_name: file.name,
      url: publicUrl,
      storage_path: fileName,
      size: file.size,
      mime_type: file.type,
      uploaded_by: walletAddress.toLowerCase(),
      uploaded_at: new Date().toISOString(),
      status: 'pending',
    };

    const { error: docError } = await supabase
      .from('trade_documents')
      .insert(documentData);

    if (docError) throw docError;

    // Log timeline event
    const timelineEvent = {
      id: uuidv4(),
      deal_id: dealId,
      type: 'document_upload',
      title: 'Document Uploaded',
      description: `${name || file.name} uploaded`,
      actor: walletAddress.toLowerCase(),
      metadata: JSON.stringify({ documentId, documentType }),
      created_at: new Date().toISOString(),
    };

    await supabase.from('trade_timeline').insert(timelineEvent);

    return NextResponse.json({
      id: documentId,
      url: publicUrl,
      message: 'Document uploaded successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}

// GET - List documents for a deal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID required' }, { status: 400 });
    }

    const { data: documents, error } = await supabase
      .from('trade_documents')
      .select('*')
      .eq('deal_id', dealId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}