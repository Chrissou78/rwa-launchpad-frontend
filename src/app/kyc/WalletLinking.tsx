// src/app/kyc/WalletLinking.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useKYC, LinkedWallet, WalletLinkCode } from "@/hooks/useKYC";

// ============================================================================
// TYPES
// ============================================================================

type LinkingMode = "none" | "generate" | "use";

// ============================================================================
// COMPONENTS
// ============================================================================

function LinkedWalletCard({
  wallet,
  isCurrentWallet,
  onUnlink,
}: {
  wallet: LinkedWallet;
  isCurrentWallet: boolean;
  onUnlink?: () => void;
}) {
  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-xl border transition-colors
        ${isCurrentWallet 
          ? "bg-blue-500/10 border-blue-500/30" 
          : "bg-gray-800 border-gray-700"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${wallet.isPrimary ? "bg-amber-500/20" : "bg-gray-700"}
        `}>
          {wallet.isPrimary ? "👑" : "👛"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-white">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
            {isCurrentWallet && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                Current
              </span>
            )}
            {wallet.isPrimary && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                Primary
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Linked {new Date(wallet.linkedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {!wallet.isPrimary && !isCurrentWallet && onUnlink && (
        <button
          onClick={onUnlink}
          className="px-3 py-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          Unlink
        </button>
      )}
    </div>
  );
}

function GenerateCodeSection({
  onGenerate,
  linkCode,
  isGenerating,
  error,
}: {
  onGenerate: () => void;
  linkCode: WalletLinkCode | null;
  isGenerating: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Countdown timer
  useEffect(() => {
    if (!linkCode) return;

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = linkCode.expiresAt - now;
      setTimeLeft(Math.max(0, remaining));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [linkCode]);

  const copyCode = useCallback(() => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [linkCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Generate Link Code
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Generate a one-time code to link another wallet to your KYC verification.
          The code expires after 15 minutes.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {linkCode && timeLeft > 0 ? (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm mb-2">Your Link Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-mono font-bold text-white tracking-widest">
                  {linkCode.code}
                </p>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-gray-400">📋</span>
                  )}
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Expires in{" "}
                <span className={timeLeft < 60 ? "text-red-400" : "text-white"}>
                  {formatTime(timeLeft)}
                </span>
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">Instructions:</h4>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Open this page on your other wallet</li>
                <li>Click "Link Existing Wallet"</li>
                <li>Enter this code: <span className="font-mono text-white">{linkCode.code}</span></li>
                <li>Sign the verification message</li>
              </ol>
            </div>

            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              Generate New Code
            </button>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⟳</span>
                Generating...
              </>
            ) : (
              <>
                <span>🔗</span>
                Generate Link Code
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function UseCodeSection({
  onUseCode,
  isLinking,
  error,
  success,
}: {
  onUseCode: (code: string) => void;
  isLinking: boolean;
  error: string | null;
  success: boolean;
}) {
  const [code, setCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 8) {
      onUseCode(code.toUpperCase());
    }
  };

  // Format code input (uppercase, max 8 chars)
  const handleCodeChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setCode(formatted);
  };

  if (success) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Wallet Linked Successfully!
        </h3>
        <p className="text-gray-400">
          This wallet now shares KYC verification with the primary wallet.
          You can use all investment features immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Link to Existing KYC
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Enter a link code from your verified wallet to share KYC verification
          with this wallet.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Link Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter 8-character code"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500 uppercase"
              maxLength={8}
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              {code.length}/8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={code.length !== 8 || isLinking}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLinking ? (
              <>
                <span className="animate-spin">⟳</span>
                Linking Wallet...
              </>
            ) : (
              <>
                <span>✓</span>
                Link This Wallet
              </>
            )}
          </button>
        </form>

        <div className="mt-4 p-4 bg-gray-900 rounded-lg">
          <h4 className="text-gray-400 text-sm font-medium mb-2">
            How to get a link code:
          </h4>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Connect your verified wallet</li>
            <li>Go to KYC → Wallet Linking</li>
            <li>Click "Generate Link Code"</li>
            <li>Copy the code and enter it here</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WalletLinking() {
  const { address, isConnected } = useAccount();
  const {
    status,
    linkedWallets,
    isLoading,
    error: kycError,
    generateLinkCode,
    useLinkCode,
    getLinkedWallets,
  } = useKYC();

  const [mode, setMode] = useState<LinkingMode>("none");
  const [linkCode, setLinkCode] = useState<WalletLinkCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Load linked wallets on mount
  useEffect(() => {
    if (isConnected && address) {
      getLinkedWallets();
    }
  }, [isConnected, address, getLinkedWallets]);

  // Handle generate link code
  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    setLocalError(null);

    try {
      const code = await generateLinkCode();
      if (code) {
        setLinkCode(code);
      } else {
        setLocalError("Failed to generate link code. Make sure you have approved KYC.");
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  }, [generateLinkCode]);

  // Handle use link code
  const handleUseLinkCode = useCallback(async (code: string) => {
    setIsLinking(true);
    setLocalError(null);

    try {
      const result = await useLinkCode(code);
      if (result.success) {
        setLinkSuccess(true);
        // Refresh linked wallets
        await getLinkedWallets();
      } else {
        setLocalError(result.error || "Failed to link wallet");
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to link wallet");
    } finally {
      setIsLinking(false);
    }
  }, [useLinkCode, getLinkedWallets]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-gray-400">
          Please connect your wallet to manage linked wallets.
        </p>
      </div>
    );
  }

  // Check if current wallet has KYC
  const hasKYC = status?.status === "approved" && status.hasValidProof;
  const isPrimaryWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && w.isPrimary
  );
  const isLinkedWallet = linkedWallets.some(
    (w) => w.address.toLowerCase() === address?.toLowerCase() && !w.isPrimary
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Linking</h1>
        <p className="text-gray-400">
          Link multiple wallets to share your KYC verification
        </p>
      </div>

      {/* Current Status */}
      <div className={`
        rounded-xl p-4 border
        ${hasKYC 
          ? "bg-green-500/10 border-green-500/30" 
          : "bg-yellow-500/10 border-yellow-500/30"
        }
      `}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{hasKYC ? "✅" : "⚠️"}</span>
          <div>
            <p className={`font-medium ${hasKYC ? "text-green-400" : "text-yellow-400"}`}>
              {hasKYC 
                ? `KYC Verified (Level ${status?.currentLevel || 1})` 
                : "KYC Not Verified"
              }
            </p>
            <p className="text-sm text-gray-400">
              {hasKYC
                ? isPrimaryWallet
                  ? "This is your primary verified wallet"
                  : isLinkedWallet
                  ? "This wallet is linked to a verified identity"
                  : "You can link additional wallets"
                : "Complete KYC verification or link to an existing verified wallet"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Linked Wallets List */}
      {linkedWallets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            Linked Wallets ({linkedWallets.length})
          </h2>
          {linkedWallets.map((wallet) => (
            <LinkedWalletCard
              key={wallet.address}
              wallet={wallet}
              isCurrentWallet={wallet.address.toLowerCase() === address?.toLowerCase()}
            />
          ))}
        </div>
      )}

      {/* Action Selection */}
      {mode === "none" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Generate Code Option */}
          <button
            onClick={() => {
              setMode("generate");
              setLocalError(null);
              setLinkCode(null);
            }}
            disabled={!hasKYC}
            className={`
              p-6 rounded-xl border-2 text-left transition-all
              ${hasKYC 
                ? "border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer" 
                : "border-gray-700 opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Link Another Wallet
            </h3>
            <p className="text-sm text-gray-400">
              Generate a code to share your KYC with another wallet you own
            </p>
            {!hasKYC && (
              <p className="text-xs text-yellow-400 mt-2">
                Requires verified KYC
              </p>
            )}
          </button>

          {/* Use Code Option */}
          <button
            onClick={() => {
              setMode("use");
              setLocalError(null);
              setLinkSuccess(false);
            }}
            disabled={hasKYC}
            className={`
              p-6 rounded-xl border-2 text-left transition-all
              ${!hasKYC 
                ? "border-green-500/30 hover:border-green-500 hover:bg-green-500/10 cursor-pointer" 
                : "border-gray-700 opacity-50 cursor-not-allowed"
              }
            `}
          >
            <div className="text-3xl mb-3">📥</div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Link to Existing KYC
            </h3>
            <p className="text-sm text-gray-400">
              Enter a link code from your verified wallet
            </p>
            {hasKYC && (
              <p className="text-xs text-blue-400 mt-2">
                This wallet already has KYC
              </p>
            )}
          </button>
        </div>
      )}

      {/* Generate Code View */}
      {mode === "generate" && (
        <>
          <GenerateCodeSection
            onGenerate={handleGenerateCode}
            linkCode={linkCode}
            isGenerating={isGenerating}
            error={localError}
          />
          <button
            onClick={() => {
              setMode("none");
              setLinkCode(null);
              setLocalError(null);
            }}
            className="w-full py-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </>
      )}

      {/* Use Code View */}
      {mode === "use" && (
        <>
          <UseCodeSection
            onUseCode={handleUseLinkCode}
            isLinking={isLinking}
            error={localError}
            success={linkSuccess}
          />
          {!linkSuccess && (
            <button
              onClick={() => {
                setMode("none");
                setLocalError(null);
              }}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
        </>
      )}

      {/* Info Section */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">
          About Wallet Linking
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-white font-medium">Privacy Preserved</p>
              <p className="text-gray-400">
                Your KYC data stays encrypted. Only the verification status is shared.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-white font-medium">Instant Linking</p>
              <p className="text-gray-400">
                Linked wallets can immediately use investment features.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl">🆓</span>
            <div>
              <p className="text-white font-medium">Free to Link</p>
              <p className="text-gray-400">
                No additional fees for linking wallets after initial KYC.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl">🔢</span>
            <div>
              <p className="text-white font-medium">Up to 10 Wallets</p>
              <p className="text-gray-400">
                Link up to 10 wallets per verified identity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">
          Frequently Asked Questions
        </h3>

        <details className="bg-gray-800 rounded-lg">
          <summary className="p-4 cursor-pointer text-white hover:text-gray-300">
            Why would I link multiple wallets?
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-400">
            You might use different wallets for different purposes (e.g., a hardware 
            wallet for long-term holdings and a hot wallet for active trading). 
            Linking allows you to use any of these wallets for KYC-gated features 
            without completing verification multiple times.
          </div>
        </details>

        <details className="bg-gray-800 rounded-lg">
          <summary className="p-4 cursor-pointer text-white hover:text-gray-300">
            Can I unlink a wallet?
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-400">
            You can unlink secondary wallets at any time. However, the primary wallet 
            (the one where you originally completed KYC) cannot be unlinked. If you 
            need to change your primary wallet, please contact support.
          </div>
        </details>

        <details className="bg-gray-800 rounded-lg">
          <summary className="p-4 cursor-pointer text-white hover:text-gray-300">
            What happens if I delete my KYC data?
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-400">
            If you request deletion of your KYC data (GDPR right to be forgotten), 
            all linked wallets will lose their verified status. You would need to 
            complete KYC again to regain access to investment features.
          </div>
        </details>

        <details className="bg-gray-800 rounded-lg">
          <summary className="p-4 cursor-pointer text-white hover:text-gray-300">
            Is linking secure?
          </summary>
          <div className="px-4 pb-4 text-sm text-gray-400">
            Yes. Link codes expire after 15 minutes and can only be used once. 
            Both wallets must sign messages to prove ownership. No private keys 
            are ever shared or exposed during the process.
          </div>
        </details>
      </div>
    </div>
  );
}

export default WalletLinking;
