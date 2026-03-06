// src/lib/kyc/consent.ts

import { createHash } from 'crypto';
import { verifyMessage } from 'viem';

export const CONSENT_TYPES = {
    KYC_PROCESSING: 'KYC_PROCESSING',
    DATA_RETENTION: 'DATA_RETENTION',
    CROSS_CHAIN_VERIFICATION: 'CROSS_CHAIN_VERIFICATION',
    MARKETING: 'MARKETING'
} as const;

export type ConsentType = keyof typeof CONSENT_TYPES;

export const CONSENT_VERSION = '1.0';

export const CONSENT_TEXTS: Record<ConsentType, string> = {
    KYC_PROCESSING: `I consent to RWA Launchpad processing my personal data for identity verification purposes.

This includes:
- Full name
- Date of birth
- Country of residence
- Identity documents
- Proof of address

My data will be encrypted and stored securely. I understand I have the right to:
- Access my data at any time
- Request correction of inaccurate data
- Request deletion (subject to legal retention requirements)
- Withdraw this consent

Data Controller: RWA Launchpad
Contact: privacy@rwalaunchpad.com`,

    DATA_RETENTION: `I understand that my KYC data will be retained for:
- 5 years after my last activity (AML/CFT legal requirement)
- Or until I request deletion, whichever is later

After the retention period, my data will be automatically deleted.`,

    CROSS_CHAIN_VERIFICATION: `I consent to my KYC verification status being used across multiple blockchain networks.

This allows me to:
- Complete KYC once
- Invest on any supported chain without re-verification
- Link multiple wallets to my identity

Only my KYC level and expiry date are shared on-chain via cryptographic signatures. No personal data is stored on any blockchain.`,

    MARKETING: `I consent to receiving marketing communications from RWA Launchpad about new investment opportunities, platform updates, and educational content.

I can withdraw this consent at any time.`
};

// Generate the full consent message for signing
export function generateConsentMessage(
    walletAddress: string,
    consentTypes: ConsentType[],
    timestamp: number
): string {
    const consents = consentTypes
        .map(type => `--- ${type} ---\n${CONSENT_TEXTS[type]}`)
        .join('\n\n');

    return `RWA Launchpad - Consent Agreement

Wallet: ${walletAddress}
Timestamp: ${new Date(timestamp).toISOString()}
Version: ${CONSENT_VERSION}

By signing this message, I agree to the following:

${consents}

This signature does not trigger any blockchain transaction or cost any gas.`;
}

// Hash consent text for storage
export function hashConsentText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

// Verify consent signature
export async function verifyConsentSignature(
    walletAddress: string,
    consentTypes: ConsentType[],
    timestamp: number,
    signature: `0x${string}`
): Promise<boolean> {
    const message = generateConsentMessage(walletAddress, consentTypes, timestamp);
    
    try {
        const recovered = await verifyMessage({
            address: walletAddress as `0x${string}`,
            message,
            signature
        });
        return recovered;
    } catch {
        return false;
    }
}

// Generate withdrawal message
export function generateWithdrawalMessage(
    walletAddress: string,
    consentType: ConsentType,
    timestamp: number
): string {
    return `RWA Launchpad - Withdraw Consent

Wallet: ${walletAddress}
Consent Type: ${consentType}
Timestamp: ${new Date(timestamp).toISOString()}

I hereby withdraw my consent for ${consentType}.

Note: Withdrawal of KYC_PROCESSING consent will result in loss of verified status.`;
}
