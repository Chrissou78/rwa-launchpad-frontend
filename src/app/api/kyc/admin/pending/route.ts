// src/app/api/kyc/admin/pending/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export async function GET(request: NextRequest) {
  try {
    const files = await readdir(STORAGE_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const submissions = [];
    const upgrades = [];
    
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(STORAGE_DIR, file);
        const data = await readFile(filePath, 'utf-8');
        const submission = JSON.parse(data);
        
        // Only include pending ones
        if (submission.status !== 'Approved' && submission.status !== 'Rejected') {
          const entry = {
            id: submission.walletAddress,
            walletAddress: submission.walletAddress,
            currentLevel: submission.currentLevel || 0,
            requestedLevel: submission.requestedLevel,
            submittedAt: submission.submittedAt,
            status: submission.status || 'Pending',
            isUpgrade: submission.isUpgrade || false,
            personalInfo: submission.personalInfo,
            documents: {
              hasIdDocument: !!(submission.idDocument || submission.idDocumentFront),
              hasIdDocumentBack: !!submission.idDocumentBack,
              hasSelfie: !!submission.selfie,
              hasAddressProof: !!submission.addressProof,
              hasAccreditedProof: !!submission.accreditedProof
            },
            documentUrls: {
              idDocumentFrontUrl: (submission.idDocument || submission.idDocumentFront) 
                ? `/api/kyc/admin/document/${submission.walletAddress}/idDocumentFront` 
                : null,
              idDocumentBackUrl: submission.idDocumentBack 
                ? `/api/kyc/admin/document/${submission.walletAddress}/idDocumentBack` 
                : null,
              selfieUrl: submission.selfie 
                ? `/api/kyc/admin/document/${submission.walletAddress}/selfie` 
                : null,
              addressProofUrl: submission.addressProof 
                ? `/api/kyc/admin/document/${submission.walletAddress}/addressProof` 
                : null,
              accreditedProofUrl: submission.accreditedProof 
                ? `/api/kyc/admin/document/${submission.walletAddress}/accreditedProof` 
                : null
            },
            validationScores: {
              faceScore: submission.faceScore,
              idValidationConfidence: submission.idValidationConfidence,
              idValidationPassed: submission.idValidationPassed,
              livenessScore: submission.livenessScore,
              livenessPassed: submission.livenessPassed
            }
          };
          
          if (submission.isUpgrade) {
            upgrades.push(entry);
          } else {
            submissions.push(entry);
          }
        }
      } catch (e) {
        // Skip invalid files
        console.error(`Error parsing ${file}:`, e);
      }
    }
    
    // Sort by submission time, newest first
    const sortByTime = (a: any, b: any) => b.submittedAt - a.submittedAt;
    submissions.sort(sortByTime);
    upgrades.sort(sortByTime);
    
    return NextResponse.json({
      success: true,
      pendingSubmissions: submissions,
      pendingUpgrades: upgrades,
      counts: {
        submissions: submissions.length,
        upgrades: upgrades.length,
        total: submissions.length + upgrades.length
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        pendingSubmissions: [],
        pendingUpgrades: [],
        counts: { submissions: 0, upgrades: 0, total: 0 }
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to load pending submissions',
      details: error.message
    }, { status: 500 });
  }
}