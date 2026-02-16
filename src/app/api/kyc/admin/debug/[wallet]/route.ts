// src/app/api/kyc/admin/debug/[wallet]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  // AWAIT the params object
  const { wallet } = await params;
  
  if (!wallet) {
    return NextResponse.json(
      { error: 'Wallet address required' },
      { status: 400 }
    );
  }

  try {
    const storagePath = path.join(STORAGE_DIR, `${wallet.toLowerCase()}.json`);
    const data = await readFile(storagePath, 'utf-8');
    const submission = JSON.parse(data);
    
    // Return debug summary
    return NextResponse.json({
      success: true,
      wallet: submission.walletAddress,
      submittedAt: new Date(submission.submittedAt).toISOString(),
      status: submission.status || 'Pending',
      currentLevel: submission.currentLevel,
      requestedLevel: submission.requestedLevel,
      isUpgrade: submission.isUpgrade,
      personalInfo: submission.personalInfo,
      documents: {
        idDocument: submission.idDocument ? {
          name: submission.idDocument.name,
          type: submission.idDocument.type,
          dataLength: submission.idDocument.data?.length || 0
        } : null,
        idDocumentFront: submission.idDocumentFront ? {
          name: submission.idDocumentFront.name,
          type: submission.idDocumentFront.type,
          dataLength: submission.idDocumentFront.data?.length || 0
        } : null,
        idDocumentBack: submission.idDocumentBack ? {
          name: submission.idDocumentBack.name,
          type: submission.idDocumentBack.type,
          dataLength: submission.idDocumentBack.data?.length || 0
        } : null,
        selfie: submission.selfie ? {
          name: submission.selfie.name,
          type: submission.selfie.type,
          dataLength: submission.selfie.data?.length || 0
        } : null,
        addressProof: submission.addressProof ? {
          name: submission.addressProof.name,
          type: submission.addressProof.type,
          dataLength: submission.addressProof.data?.length || 0
        } : null,
        accreditedProof: submission.accreditedProof ? {
          name: submission.accreditedProof.name,
          type: submission.accreditedProof.type,
          dataLength: submission.accreditedProof.data?.length || 0
        } : null
      },
      validationScores: {
        faceScore: submission.faceScore,
        faceSimilarity: submission.faceSimilarity,
        livenessScore: submission.livenessScore,
        livenessPassed: submission.livenessPassed,
        idValidationConfidence: submission.idValidationConfidence,
        idValidationPassed: submission.idValidationPassed
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Try to list all submissions to help debug
      try {
        const files = await readdir(STORAGE_DIR);
        return NextResponse.json({
          success: false,
          error: 'No submission found for this wallet',
          searchedWallet: wallet.toLowerCase(),
          availableSubmissions: files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
        }, { status: 404 });
      } catch {
        return NextResponse.json({
          success: false,
          error: 'No submissions found and storage directory does not exist'
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to read submission',
      details: error.message
    }, { status: 500 });
  }
}