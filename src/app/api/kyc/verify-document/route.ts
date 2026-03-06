// src/app/api/kyc/verify-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { applicationId, documentId, documentType } = await request.json();

    // Option A: Use a KYC provider API (recommended for production)
    // const verificationResult = await verifyWithProvider(documentId);

    // Option B: Basic validation (for testing/MVP)
    const verificationResult = await basicValidation(documentId);

    // Update application status
    await supabase
      .from('kyc_applications')
      .update({
        document_verified: verificationResult.valid,
        verification_notes: verificationResult.notes,
        status: verificationResult.valid ? 'pending_review' : 'document_invalid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    return NextResponse.json({
      success: true,
      valid: verificationResult.valid,
      message: verificationResult.message,
    });
  } catch (error: any) {
    console.error('Document verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function basicValidation(documentId: string) {
  // Basic checks - replace with real KYC provider
  // This is just a placeholder that always passes
  
  // Get document from storage
  const { data: document } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (!document) {
    return { valid: false, message: 'Document not found', notes: 'Missing document' };
  }

  // Check file size (should be reasonable for an ID photo)
  if (document.file_size < 10000) { // Less than 10KB is suspicious
    return { valid: false, message: 'Document image too small', notes: 'Low quality image' };
  }

  // For MVP: auto-approve and flag for manual review
  return {
    valid: true,
    message: 'Document uploaded successfully. Pending manual review.',
    notes: 'Auto-passed basic validation. Requires manual verification.',
  };
}
