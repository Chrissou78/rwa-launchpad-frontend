// src/hooks/useKYCAdmin.ts

import { useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

export function useKYCAdmin() {
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const approveKYC = useCallback(async (
        identityId: string,
        level: number,
        notes?: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!address) {
            return { success: false, error: 'Wallet not connected' };
        }

        try {
            const timestamp = Date.now();
            
            const message = `RWA Launchpad - Approve KYC

Identity: ${identityId}
Level: ${level}
Notes: ${notes || 'None'}
Timestamp: ${timestamp}

This signature authorizes KYC approval.`;

            const signature = await signMessageAsync({ message });

            const response = await fetch('/api/kyc/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityId,
                    level,
                    notes,
                    adminAddress: address,
                    signature,
                    timestamp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }, [address, signMessageAsync]);

    const rejectKYC = useCallback(async (
        identityId: string,
        reason: string
    ): Promise<{ success: boolean; error?: string }> => {
        if (!address) {
            return { success: false, error: 'Wallet not connected' };
        }

        try {
            const timestamp = Date.now();
            
            const message = `RWA Launchpad - Reject KYC

Identity: ${identityId}
Reason: ${reason}
Timestamp: ${timestamp}

This signature authorizes KYC rejection.`;

            const signature = await signMessageAsync({ message });

            const response = await fetch('/api/kyc/admin/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityId,
                    reason,
                    adminAddress: address,
                    signature,
                    timestamp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }, [address, signMessageAsync]);

    return {
        approveKYC,
        rejectKYC
    };
}
