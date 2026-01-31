import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.kyc-storage');

export interface KYCDocuments {
  walletAddress: string;
  submittedAt: number;
  idDocument?: { name: string; type: string; data: string }; // base64
  selfie?: { name: string; type: string; data: string };
  addressProof?: { name: string; type: string; data: string };
  accreditedProof?: { name: string; type: string; data: string };
  livenessScreenshots?: string[]; // base64 array
  personalInfo?: {
    fullName: string;
    dateOfBirth: string;
    countryCode: number;
  };
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
