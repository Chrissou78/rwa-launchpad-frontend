// src/components/kyc/KYCStatus.tsx

'use client';

import { useKYC } from '@/hooks/useKYC';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export function KYCStatus() {
    const { status, loading, isRegistered, isKYCValid, kycLevelName } = useKYC();

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
        );
    }

    if (!isRegistered) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">KYC Required</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                    Complete identity verification to invest
                </p>
            </div>
        );
    }

    const statusConfig = {
        APPROVED: { icon: CheckCircle, color: 'green', label: 'Verified' },
        PENDING: { icon: Clock, color: 'yellow', label: 'Pending' },
        SUBMITTED: { icon: Clock, color: 'blue', label: 'Under Review' },
        REJECTED: { icon: XCircle, color: 'red', label: 'Rejected' },
        EXPIRED: { icon: AlertTriangle, color: 'orange', label: 'Expired' }
    };

    const displayStatus = status?.kyc?.isExpired ? 'EXPIRED' : status?.kyc?.status;
    const config = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
        <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 text-${config.color}-600`} />
                    <span className={`font-medium text-${config.color}-800`}>
                        {config.label}
                    </span>
                </div>
                {isKYCValid && (
                    <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                        {kycLevelName}
                    </span>
                )}
            </div>
            
            {status?.kyc?.expiresAt && (
                <p className="text-sm text-gray-600 mt-2">
                    {status.kyc.isExpired ? 'Expired' : 'Expires'}: {' '}
                    {new Date(status.kyc.expiresAt).toLocaleDateString()}
                </p>
            )}
            
            {status?.linkedWallets && status.linkedWallets > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                    {status.linkedWallets} wallets linked
                </p>
            )}
        </div>
    );
}
