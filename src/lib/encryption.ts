// src/lib/encryption.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.KYC_ENCRYPTION_KEY;
  
  // Debug logging
  console.log("[encryption] KYC_ENCRYPTION_KEY exists:", !!key);
  console.log("[encryption] KYC_ENCRYPTION_KEY length:", key?.length);
  
  if (!key) {
    throw new Error("KYC_ENCRYPTION_KEY not configured");
  }
  
  if (key.length !== 64) {
    throw new Error(`KYC_ENCRYPTION_KEY must be 64 hex chars, got ${key.length}`);
  }
  
  return Buffer.from(key, "hex");
}

export async function encryptField(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export async function decryptField(ciphertext: string): Promise<string> {
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "[DECRYPTION_FAILED]";
  }
}

// Hash wallet address for privacy-preserving lookups
export function hashWalletAddress(address: string): string {
  const secret = process.env.KYC_WALLET_HASH_SECRET;
  if (!secret) {
    throw new Error("KYC_WALLET_HASH_SECRET not configured");
  }
  
  return crypto
    .createHmac("sha256", secret)
    .update(address.toLowerCase())
    .digest("hex");
}

// Generate audit hash for compliance logging
export function generateAuditHash(data: Record<string, any>): string {
  const secret = process.env.KYC_AUDIT_HASH_SECRET;
  if (!secret) {
    throw new Error("KYC_AUDIT_HASH_SECRET not configured");
  }
  
  const sortedData = JSON.stringify(data, Object.keys(data).sort());
  
  return crypto
    .createHmac("sha256", secret)
    .update(sortedData)
    .digest("hex");
}
