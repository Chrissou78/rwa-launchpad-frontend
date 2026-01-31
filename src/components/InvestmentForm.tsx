'use client';

import { useState } from 'react';
import { useKYC } from '@/contexts/KYCContext';

interface InvestmentFormProps {
  projectId: string;
  minInvestment: number;
  maxInvestment: number;
  onInvest: (amount: number) => Promise<void>;
}

export default function InvestmentForm({ 
  projectId, 
  minInvestment, 
  maxInvestment,
  onInvest 
}: InvestmentFormProps) {
  const { kycData, tierInfo, canInvest, formatLimit } = useKYC();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = parseFloat(amount) || 0;
  const investCheck = canInvest(numericAmount);
  
  // Calculate effective max (minimum of project max and remaining KYC limit)
  const effectiveMax = Math.min(maxInvestment, kycData.remainingLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!investCheck.allowed) {
      setError(investCheck.reason || 'Cannot invest');
      return;
    }

    if (numericAmount < minInvestment) {
      setError(`Minimum investment is $${minInvestment}`);
      return;
    }

    if (numericAmount > effectiveMax) {
      setError(`Maximum investment is $${effectiveMax.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onInvest(numericAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Invest in Project</h3>

      {/* KYC Tier Info */}
      <div className={`mb-4 p-3 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{tierInfo.icon}</span>
            <span className={`text-sm font-medium ${tierInfo.color}`}>{tierInfo.label} Tier</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Remaining Limit</div>
            <div className={`text-sm font-medium ${tierInfo.color}`}>
              {formatLimit(kycData.remainingLimit)}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Form */}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Investment Amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              min={minInvestment}
              max={effectiveMax}
              step="0.01"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Min: ${minInvestment.toLocaleString()}</span>
            <span>Max: ${effectiveMax.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-4">
          {[100, 500, 1000, 5000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset.toString())}
              disabled={preset > effectiveMax}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                preset > effectiveMax
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              ${preset >= 1000 ? `${preset / 1000}K` : preset}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Investment Check Warning */}
        {!investCheck.allowed && numericAmount > 0 && (
          <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg text-yellow-400 text-sm">
            {investCheck.reason}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!investCheck.allowed || isSubmitting || numericAmount <= 0}
          className={`w-full py-4 rounded-lg font-semibold transition-all ${
            !investCheck.allowed || isSubmitting || numericAmount <= 0
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Invest $${numericAmount.toLocaleString()}`
          )}
        </button>
      </form>
    </div>
  );
}
