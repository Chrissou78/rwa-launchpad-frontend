// src/lib/kyc/audit.ts

import { getSupabaseAdmin } from '@/lib/supabase';
import { hashForAudit } from './encryption';

export const AUDIT_CATEGORIES = {
    KYC: 'KYC',
    CONSENT: 'CONSENT',
    WALLET: 'WALLET',
    DATA_ACCESS: 'DATA_ACCESS',
    GDPR: 'GDPR',
    ADMIN: 'ADMIN',
    PROOF: 'PROOF'
} as const;

export const AUDIT_ACTIONS = {
    // KYC
    KYC_SUBMITTED: 'KYC_SUBMITTED',
    KYC_APPROVED: 'KYC_APPROVED',
    KYC_REJECTED: 'KYC_REJECTED',
    KYC_EXPIRED: 'KYC_EXPIRED',
    KYC_RENEWED: 'KYC_RENEWED',
    
    // Consent
    CONSENT_GIVEN: 'CONSENT_GIVEN',
    CONSENT_WITHDRAWN: 'CONSENT_WITHDRAWN',
    
    // Wallet
    WALLET_LINKED: 'WALLET_LINKED',
    WALLET_UNLINKED: 'WALLET_UNLINKED',
    LINK_CODE_GENERATED: 'LINK_CODE_GENERATED',
    LINK_CODE_USED: 'LINK_CODE_USED',
    
    // Data access
    PROOF_GENERATED: 'PROOF_GENERATED',
    STATUS_CHECKED: 'STATUS_CHECKED',
    
    // GDPR
    DATA_EXPORTED: 'DATA_EXPORTED',
    DATA_DELETED: 'DATA_DELETED',
    DELETION_REQUESTED: 'DELETION_REQUESTED',
    
    // Admin
    ADMIN_VIEW: 'ADMIN_VIEW',
    ADMIN_UPDATE: 'ADMIN_UPDATE'
} as const;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES;
export type AuditAction = keyof typeof AUDIT_ACTIONS;

interface AuditLogEntry {
    identity_id?: string;
    wallet_hash?: string;
    actor_type: 'user' | 'admin' | 'system';
    action_category: AuditCategory;
    action: AuditAction;
    details?: Record<string, unknown>;
    ip?: string;
    chain_id?: number;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
        .from('kyc_audit_log')
        .insert({
            identity_id: entry.identity_id,
            wallet_hash: entry.wallet_hash,
            actor_type: entry.actor_type,
            action_category: entry.action_category,
            action: entry.action,
            details_hash: entry.details ? hashForAudit(JSON.stringify(entry.details)) : null,
            ip_hash: entry.ip ? hashForAudit(entry.ip) : null,
            chain_id: entry.chain_id
        });
    
    if (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break main flow
    }
}
