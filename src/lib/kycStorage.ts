// src/lib/kycStorage.ts
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export interface KYCDocument {
  name: string;
  type: string;
  data: string; // base64
}

export interface KYCDocuments {
  walletAddress: string;
  submittedAt: number;
  requestedLevel?: number;
  currentLevel?: number;
  isUpgrade?: boolean;
  txHash?: string;
  status?: string; // 'Pending' | 'Approved' | 'Rejected'
  reviewedAt?: number;
  rejectionReason?: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  expiryDate?: string;
  // Documents
  idDocument?: KYCDocument;
  idDocumentFront?: KYCDocument;
  idDocumentBack?: KYCDocument;
  selfie?: KYCDocument;
  addressProof?: KYCDocument;
  accreditedProof?: KYCDocument;
  livenessScreenshots?: string[];
  // Personal info
  personalInfo?: {
    fullName: string;
    dateOfBirth: string;
    countryCode: number;
  };
  // Validation results
  idValidationScore?: number;
  idValidationPassed?: boolean;
  idRequiresManualReview?: boolean;
  mrzDetected?: boolean;
  idFoundText?: any;
  idMatches?: any;
  mrzData?: any;
  // Scores
  faceScore?: number;
  livenessScore?: number;
  livenessPassed?: boolean;
}

async function ensureDir() {
  try {
    await mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    // Directory exists
  }
}

export async function saveKYCDocuments(data: KYCDocuments): Promise<void> {
  await ensureDir();
  
  // Set default status if not provided
  if (!data.status) {
    data.status = 'Pending';
  }
  
  const filePath = path.join(STORAGE_DIR, `${data.walletAddress.toLowerCase()}.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2));
  console.log(`[KYC Storage] Saved documents for ${data.walletAddress}`);
}

export async function getKYCDocuments(walletAddress: string): Promise<KYCDocuments | null> {
  try {
    const filePath = path.join(STORAGE_DIR, `${walletAddress.toLowerCase()}.json`);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

export async function deleteKYCDocuments(walletAddress: string): Promise<boolean> {
  try {
    const filePath = path.join(STORAGE_DIR, `${walletAddress.toLowerCase()}.json`);
    const { unlink } = await import('fs/promises');
    await unlink(filePath);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Get all KYC submissions
 */
export async function getAllKYCSubmissions(): Promise<KYCDocuments[]> {
  try {
    await ensureDir();
    const files = await readdir(STORAGE_DIR);
    const submissions: KYCDocuments[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(STORAGE_DIR, file);
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content) as KYCDocuments;
          submissions.push(data);
        } catch (e) {
          console.error(`Error reading ${file}:`, e);
        }
      }
    }
    
    // Sort newest first
    submissions.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    
    return submissions;
  } catch (e) {
    console.error('Error reading submissions:', e);
    return [];
  }
}

/**
 * Get pending KYC submissions (not yet approved/rejected)
 */
export async function getPendingKYCSubmissions(): Promise<KYCDocuments[]> {
  const all = await getAllKYCSubmissions();
  return all.filter(s => !s.status || s.status === 'Pending' || s.status === 'pending');
}

/**
 * Update submission status
 */
export async function updateKYCStatus(
  walletAddress: string,
  status: string,
  rejectionReason?: string
): Promise<boolean> {
  const data = await getKYCDocuments(walletAddress);
  if (!data) return false;
  
  data.status = status;
  data.reviewedAt = Date.now();
  if (rejectionReason) {
    data.rejectionReason = rejectionReason;
  }
  
  await saveKYCDocuments(data);
  return true;
}

/**
 * Get a specific document as base64
 */
export async function getKYCDocument(
  walletAddress: string,
  documentType: 'idDocument' | 'idDocumentFront' | 'idDocumentBack' | 'selfie' | 'addressProof' | 'accreditedProof'
): Promise<KYCDocument | null> {
  const data = await getKYCDocuments(walletAddress);
  if (!data) return null;
  
  return data[documentType] || null;
}