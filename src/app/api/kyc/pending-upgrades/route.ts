// src/app/api/kyc/pending-upgrades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization here
    // const authHeader = request.headers.get('authorization');
    // ... validate admin token

    // Fetch all pending upgrade submissions
    const pendingUpgrades = await prisma.kycSubmission.findMany({
      where: {
        isUpgrade: true,
        status: {
          in: ['Pending', 'ManualReview', 'AutoVerifying']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        walletAddress: true,
        requestedLevel: true,
        currentLevel: true,
        status: true,
        createdAt: true,
        fullName: true,
        email: true,
        dateOfBirth: true,
        countryCode: true,
        documentType: true,
        documentNumber: true,
        expiryDate: true,
        txHash: true,
        // Document paths/URLs
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        selfieUrl: true,
        addressProofUrl: true,
        accreditedProofUrl: true,
        // Validation data
        idValidationScore: true,
        idValidationPassed: true,
        idRequiresManualReview: true,
        idExtractedData: true,
        idFoundText: true,
        idMatches: true,
        mrzDetected: true,
        mrzData: true,
        // Face detection
        faceScore: true,
        // Liveness
        livenessScore: true,
        livenessPassed: true,
      }
    });

    // Also fetch regular pending submissions (non-upgrades)
    const pendingSubmissions = await prisma.kycSubmission.findMany({
      where: {
        isUpgrade: false,
        status: {
          in: ['Pending', 'ManualReview', 'AutoVerifying']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        walletAddress: true,
        requestedLevel: true,
        currentLevel: true,
        status: true,
        createdAt: true,
        fullName: true,
        email: true,
        dateOfBirth: true,
        countryCode: true,
        documentType: true,
        documentNumber: true,
        expiryDate: true,
        txHash: true,
        idDocumentFrontUrl: true,
        idDocumentBackUrl: true,
        selfieUrl: true,
        addressProofUrl: true,
        accreditedProofUrl: true,
        idValidationScore: true,
        idValidationPassed: true,
        idRequiresManualReview: true,
        idExtractedData: true,
        idFoundText: true,
        idMatches: true,
        mrzDetected: true,
        mrzData: true,
        faceScore: true,
        livenessScore: true,
        livenessPassed: true,
      }
    });

    return NextResponse.json({
      success: true,
      pendingUpgrades,
      pendingSubmissions,
      totalPendingUpgrades: pendingUpgrades.length,
      totalPendingSubmissions: pendingSubmissions.length,
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}