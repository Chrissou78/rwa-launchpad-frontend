'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, getCurrencyByCode, formatCurrencyAmount } from '@/types/project';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface ProjectData {
  projectName: string;
  category: string;
  description: string;
  website: string;
  localCurrency: string;
  amountToRaiseLocal: number;
  amountToRaise: number;
  exchangeRate: number;
  exchangeRateTimestamp: number;
  investorSharePercentage: number;
  projectedROI: number;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  platformFee: number;
  platformFeeTokens: number;
  investorTokens: number;
  milestones: any[];
}

interface StepProjectDetailsProps {
  data: ProjectData;
  updateData: (updates: Partial<ProjectData>) => void;
  onNext: () => void;
}

const CATEGORIES = [
  'Real Estate',
  'Agriculture',
  'Energy',
  'Infrastructure',
  'Manufacturing',
  'Technology',
  'Healthcare',
  'Education',
  'Hospitality',
  'Transportation',
  'Other',
];

// Format USD without decimals
const formatUSD = (amount: number): string => {
  return '$' + Math.round(amount).toLocaleString('en-US');
};

// Format number without decimals
const formatNumber = (amount: number): string => {
  return Math.round(amount).toLocaleString('en-US');
};

export default function StepProjectDetails({ data, updateData, onNext }: StepProjectDetailsProps) {
  const { rates, loading: ratesLoading, convertToUSD, getRate, lastUpdated } = useExchangeRates();
  const [showCurrencySearch, setShowCurrencySearch] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const selectedCurrency = getCurrencyByCode(data.localCurrency) || SUPPORTED_CURRENCIES[0];

  // Filter currencies based on search
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(
    c => c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
         c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  // Calculate estimated valuation
  const estimatedValuation = data.investorSharePercentage > 0 
    ? (data.amountToRaise / data.investorSharePercentage) * 100 
    : 0;
  
  const estimatedValuationLocal = data.investorSharePercentage > 0 
    ? (data.amountToRaiseLocal / data.investorSharePercentage) * 100 
    : 0;

  // Update USD equivalent when local amount or currency changes
  useEffect(() => {
    if (data.amountToRaiseLocal > 0 && data.localCurrency) {
      const rate = getRate(data.localCurrency);
      const usdAmount = convertToUSD(data.amountToRaiseLocal, data.localCurrency);
      
      updateData({
        amountToRaise: Math.round(usdAmount),
        exchangeRate: rate,
        exchangeRateTimestamp: Date.now(),
      });
    }
  }, [data.amountToRaiseLocal, data.localCurrency, rates]);

  // Update token economics when USD amount changes
  useEffect(() => {
    if (data.amountToRaise > 0) {
      const platformFeeAmount = Math.round(data.amountToRaise * 0.05);
      const totalSupply = Math.round(data.amountToRaise);
      const investorTokens = Math.round(totalSupply * (data.investorSharePercentage / 100));
      const platformFeeTokens = Math.round(totalSupply * 0.05);
      
      updateData({
        totalSupply,
        platformFee: platformFeeAmount,
        platformFeeTokens,
        investorTokens,
      });
    }
  }, [data.amountToRaise, data.investorSharePercentage]);

  // Auto-suggest token name and symbol
  useEffect(() => {
    if (data.projectName && !data.tokenName) {
      updateData({ tokenName: `${data.projectName} Token` });
    }
  }, [data.projectName]);

  const suggestSymbol = () => {
    if (!data.projectName) return;
    const words = data.projectName.split(' ').filter(w => w.length > 0);
    let symbol = '';
    if (words.length === 1) {
      symbol = words[0].substring(0, 4).toUpperCase();
    } else {
      symbol = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    }
    updateData({ tokenSymbol: symbol });
  };

  const handleCurrencySelect = (code: string) => {
    updateData({ localCurrency: code });
    setShowCurrencySearch(false);
    setCurrencySearch('');
  };

  const isValid = 
    data.projectName.trim() !== '' &&
    data.description.trim() !== '' &&
    data.category !== '' &&
    data.amountToRaiseLocal > 0 &&
    data.investorSharePercentage > 0 &&
    data.investorSharePercentage <= 100 &&
    data.tokenName.trim() !== '' &&
    data.tokenSymbol.trim() !== '';

  return (
    <div className="space-y-8">
      {/* Currency Selection Banner */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Project Currency</h3>
            <p className="text-sm text-gray-400">
              Select your local currency. Business documents can be in this currency.
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowCurrencySearch(!showCurrencySearch)}
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-lg border border-gray-600 transition-colors"
            >
              <span className="text-2xl">{selectedCurrency.flag}</span>
              <div className="text-left">
                <div className="font-medium text-white">{selectedCurrency.code}</div>
                <div className="text-xs text-gray-400">{selectedCurrency.name}</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showCurrencySearch && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg border border-gray-600 shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-700">
                  <input
                    type="text"
                    value={currencySearch}
                    onChange={(e) => setCurrencySearch(e.target.value)}
                    placeholder="Search currencies..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredCurrencies.map(currency => (
                    <button
                      key={currency.code}
                      onClick={() => handleCurrencySelect(currency.code)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                        currency.code === data.localCurrency ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      <span className="text-xl">{currency.flag}</span>
                      <div className="text-left flex-1">
                        <div className="font-medium text-white">{currency.code}</div>
                        <div className="text-xs text-gray-400">{currency.name}</div>
                      </div>
                      {currency.code === data.localCurrency && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Exchange Rate Info */}
        {data.localCurrency !== 'USD' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Exchange rate: 1 USD = {getRate(data.localCurrency).toFixed(4)} {data.localCurrency}
              {lastUpdated && (
                <span className="text-gray-500 ml-2">
                  (Updated {lastUpdated.toLocaleTimeString()})
                </span>
              )}
            </span>
            {ratesLoading && <span className="text-blue-400 animate-pulse">Updating...</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Basic Info */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
            Basic Information
          </h3>
          
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={data.projectName}
              onChange={(e) => updateData({ projectName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={data.category}
              onChange={(e) => updateData({ category: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              rows={4}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe your project..."
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website (Optional)
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Right Column - Financials */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white border-b border-gray-700 pb-2">
            Financials & Token
          </h3>

          {/* Amount to Raise - Local Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount to Raise ({selectedCurrency.code}) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {selectedCurrency.symbol}
              </span>
              <input
                type="number"
                value={data.amountToRaiseLocal || ''}
                onChange={(e) => updateData({ amountToRaiseLocal: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
            
            {/* USD Equivalent */}
            {data.amountToRaiseLocal > 0 && data.localCurrency !== 'USD' && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-gray-400">USD Equivalent:</span>
                <span className="text-lg font-semibold text-green-400">
                  {formatUSD(data.amountToRaise)}
                </span>
              </div>
            )}
            
            <p className="mt-1 text-xs text-gray-500">
              {data.localCurrency === 'USD' 
                ? 'Investments will be collected in USDC/USDT'
                : `Your documents can reference ${formatCurrencyAmount(Math.round(data.amountToRaiseLocal), data.localCurrency)}. Investments collected in USDC/USDT.`
              }
            </p>
          </div>

          {/* Investor Share */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Investor Share (%) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={data.investorSharePercentage || ''}
              onChange={(e) => updateData({ investorSharePercentage: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 30"
              min="1"
              max="100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Percentage of the company/project that investors will own
            </p>
          </div>

          {/* Projected ROI */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Projected ROI (%)
            </label>
            <input
              type="number"
              value={data.projectedROI || ''}
              onChange={(e) => updateData({ projectedROI: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 15"
            />
          </div>

          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={data.tokenName}
              onChange={(e) => updateData({ tokenName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Green Energy Token"
            />
          </div>

          {/* Token Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token Symbol <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.tokenSymbol}
                onChange={(e) => updateData({ tokenSymbol: e.target.value.toUpperCase() })}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                placeholder="e.g., GET"
                maxLength={5}
              />
              <button
                type="button"
                onClick={suggestSymbol}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Suggest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Token Economics Preview */}
      {data.amountToRaise > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4">Token Economics Preview</h4>
          
          {/* Estimated Valuation - Highlighted */}
          {data.investorSharePercentage > 0 && (
            <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Estimated Company Valuation</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {formatUSD(estimatedValuation)}
                  </div>
                </div>
              </div>
              {data.localCurrency !== 'USD' && (
                <div className="text-sm text-gray-400 ml-13 pl-13">
                  ≈ {formatCurrencyAmount(Math.round(estimatedValuationLocal), data.localCurrency)}
                </div>
              )}
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Based on {data.investorSharePercentage}% equity for {formatUSD(data.amountToRaise)} investment
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Supply</div>
              <div className="text-xl font-bold text-white">
                {formatNumber(data.totalSupply)} {data.tokenSymbol || 'TKN'}
              </div>
              <div className="text-xs text-gray-500">1 token = $1 USD</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Platform Fee (5%)</div>
              <div className="text-xl font-bold text-yellow-400">
                {formatUSD(data.platformFee)}
              </div>
              <div className="text-xs text-gray-500">{formatNumber(data.platformFeeTokens)} tokens</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Investor Tokens</div>
              <div className="text-xl font-bold text-green-400">
                {formatNumber(data.investorTokens)}
              </div>
              <div className="text-xs text-gray-500">{data.investorSharePercentage}% of supply</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Net to Project</div>
              <div className="text-xl font-bold text-blue-400">
                {formatUSD(data.amountToRaise - data.platformFee)}
              </div>
              {data.localCurrency !== 'USD' && (
                <div className="text-xs text-gray-500">
                  ≈ {formatCurrencyAmount(Math.round(data.amountToRaiseLocal * 0.95), data.localCurrency)}
                </div>
              )}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Price per 1% Equity</div>
              <div className="text-xl font-bold text-cyan-400">
                {data.investorSharePercentage > 0 
                  ? formatUSD(data.amountToRaise / data.investorSharePercentage)
                  : '$0'
                }
              </div>
              <div className="text-xs text-gray-500">Implied equity value</div>
            </div>
          </div>

          {/* Valuation Breakdown */}
          {data.investorSharePercentage > 0 && data.amountToRaise > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Valuation Breakdown</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${data.investorSharePercentage}%` }}
                    title={`Investors: ${data.investorSharePercentage}%`}
                  />
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${100 - data.investorSharePercentage}%` }}
                    title={`Founders/Company: ${100 - data.investorSharePercentage}%`}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-green-400">
                  Investors: {data.investorSharePercentage}% ({formatUSD(data.amountToRaise)})
                </span>
                <span className="text-blue-400">
                  Founders: {100 - data.investorSharePercentage}% ({formatUSD(estimatedValuation - data.amountToRaise)})
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Milestones
        </button>
      </div>
    </div>
  );
}
