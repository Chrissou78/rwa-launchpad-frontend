// src/lib/kyc/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

interface EncryptedData {
    iv: string;
    data: string;
    tag: string;
    version: number;
}

// Get encryption key from env
function getEncryptionKey(): Buffer {
    const key = process.env.KYC_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('KYC_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

// Encrypt a string
export function encrypt(plaintext: string): EncryptedData {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        iv: iv.toString('hex'),
        data: encrypted,
        tag: cipher.getAuthTag().toString('hex'),
        version: 1
    };
}

// Decrypt data
export function decrypt(encrypted: EncryptedData): string {
    const key = getEncryptionKey();
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
    
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

// Encrypt an object
export function encryptObject<T extends object>(obj: T): EncryptedData {
    return encrypt(JSON.stringify(obj));
}

// Decrypt to object
export function decryptObject<T>(encrypted: EncryptedData): T {
    return JSON.parse(decrypt(encrypted));
}

// Hash wallet address (one-way, for pseudonymization)
export function hashWallet(address: string): string {
    const secret = process.env.KYC_WALLET_HASH_SECRET;
    if (!secret) throw new Error('KYC_WALLET_HASH_SECRET not set');
    
    return createHash('sha256')
        .update(address.toLowerCase())
        .update(secret)
        .digest('hex');
}

// Hash for audit log (one-way)
export function hashForAudit(data: string): string {
    const secret = process.env.KYC_AUDIT_HASH_SECRET;
    if (!secret) throw new Error('KYC_AUDIT_HASH_SECRET not set');
    
    return createHash('sha256')
        .update(data)
        .update(secret)
        .digest('hex');
}

// Hash email for deduplication
export function hashEmail(email: string): string {
    const secret = process.env.KYC_WALLET_HASH_SECRET;
    if (!secret) throw new Error('KYC_WALLET_HASH_SECRET not set');
    
    return createHash('sha256')
        .update(email.toLowerCase().trim())
        .update(secret)
        .digest('hex');
}

// Generate a secure random code
export function generateLinkCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
    let code = 'RWA-';
    for (let i = 0; i < 6; i++) {
        code += chars[randomBytes(1)[0] % chars.length];
    }
    return code;
}
