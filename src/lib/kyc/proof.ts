// src/lib/kyc/proof.ts

import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

export interface KYCProofData {
    wallet: `0x${string}`;
    level: number;
    countryCode: number;
    expiry: number;
}

export interface SignedKYCProof extends KYCProofData {
    signature: `0x${string}`;
}

const EIP712_DOMAIN = {
    name: 'RWA Launchpad KYC',
    version: '1',
    // chainId will be added dynamically
    // verifyingContract will be added dynamically
};

const KYC_PROOF_TYPES = {
    KYCProof: [
        { name: 'wallet', type: 'address' },
        { name: 'level', type: 'uint8' },
        { name: 'countryCode', type: 'uint16' },
        { name: 'expiry', type: 'uint256' }
    ]
};

export async function signKYCProof(
    proofData: KYCProofData,
    chainId: number,
    verifierAddress: `0x${string}`
): Promise<SignedKYCProof> {
    // Use your existing VERIFIER_PRIVATE_KEY
    const privateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
        throw new Error('VERIFIER_PRIVATE_KEY not configured');
    }

    const account = privateKeyToAccount(privateKey);
    
    const domain = {
        ...EIP712_DOMAIN,
        chainId: BigInt(chainId),
        verifyingContract: verifierAddress
    };

    const signature = await account.signTypedData({
        domain,
        types: KYC_PROOF_TYPES,
        primaryType: 'KYCProof',
        message: {
            wallet: proofData.wallet,
            level: proofData.level,
            countryCode: proofData.countryCode,
            expiry: BigInt(proofData.expiry)
        }
    });

    return {
        ...proofData,
        signature
    };
}

// Get signer address for verification
export function getSignerAddress(): `0x${string}` {
    // Use your existing NEXT_PUBLIC_ADMIN_ADDRESS
    const address = process.env.NEXT_PUBLIC_ADMIN_ADDRESS as `0x${string}`;
    if (!address) {
        throw new Error('NEXT_PUBLIC_ADMIN_ADDRESS not configured');
    }
    return address;
}
