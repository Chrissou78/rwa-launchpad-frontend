// src/components/kyc/WalletLinking.tsx

'use client';

import { useState } from 'react';
import { useKYC } from '@/hooks/useKYC';
import { Copy, Check, Loader2, ArrowLeft } from 'lucide-react';

interface WalletLinkingProps {
    mode: 'generate' | 'use';
    onBack: () => void;
    onSuccess: () => void;
}

export function WalletLinking({ mode, onBack, onSuccess }: WalletLinkingProps) {
    const { generateLinkCode, useLinkCode, error } = useKYC();
    
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [label, setLabel] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        const result = await generateLinkCode();
        setLoading(false);

        if (result) {
            setGeneratedCode(result.code);
            setExpiresAt(result.expiresAt);
        }
    };

    const handleUseCode = async () => {
        if (!code.trim()) return;
        
        setLoading(true);
        const success = await useLinkCode(code.trim(), label || undefined);
        setLoading(false);

        if (success) {
            onSuccess();
        }
    };

    const copyCode = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (mode === 'generate') {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Generate Link Code
                </h2>
                <p className="text-gray-600 mb-6">
                    Generate a one-time code to link another wallet to your account.
                </p>

                {!generatedCode ? (
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Generate Code
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                            <div className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                                {generatedCode}
                            </div>
                            <button
                                onClick={copyCode}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy code
                                    </>
                                )}
                            </button>
                        </div>

                        {expiresAt && (
                            <p className="text-sm text-gray-500 text-center">
                                Expires: {new Date(expiresAt).toLocaleTimeString()}
                            </p>
                        )}

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                            Enter this code in your other wallet to link it to your account.
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-red-600 mt-4">{error}</p>
                )}
            </div>
        );
    }

    // Use code mode
    return (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
            <button
                onClick={onBack}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
                Link Wallet
            </h2>
            <p className="text-gray-600 mb-6">
                Enter the code from your KYC'd wallet to link this wallet.
            </p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link Code
                    </label>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="RWA-XXXXXX"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-center text-lg tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={10}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wallet Label (optional)
                    </label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="e.g., Hardware Wallet"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <button
                    onClick={handleUseCode}
                    disabled={loading || !code.trim()}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Link Wallet
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600 mt-4">{error}</p>
            )}

            <p className="text-xs text-gray-500 mt-4 text-center">
                Don't have a code? Generate one from Settings → Wallets on your KYC'd wallet.
            </p>
        </div>
    );
}
