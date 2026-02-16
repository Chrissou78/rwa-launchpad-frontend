// src/app/projects/create/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { 
  SUPPORTED_CURRENCIES, 
  ACCEPTED_PAYMENT_TOKENS,
  type Milestone,
  type ProjectAmount,
  type Currency,
} from '@/types/project';
import { formatCurrency } from '@/lib/currencyService';

// ============================================
// TYPES
// ============================================

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

interface ProjectFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  category: string;
  
  // Step 2: Funding & Currency
  localCurrency: string;
  fundingGoalLocal: string;
  minInvestmentLocal: string;
  maxInvestmentLocal: string;
  acceptedTokens: string[];
  
  // Step 3: Milestones
  milestones: Milestone[];
  
  // Step 4: Timeline & Documents
  startDate: string;
  endDate: string;
  businessPlan: File | null;
  financialProjections: File | null;
  legalDocuments: File | null;
  
  // Step 5: Token Details
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  pricePerTokenLocal: string;
}

const STEPS = [
  { id: 1, name: 'Basic Info', description: 'Project name and description' },
  { id: 2, name: 'Funding', description: 'Currency and funding goals' },
  { id: 3, name: 'Milestones', description: 'Define project milestones' },
  { id: 4, name: 'Documents', description: 'Upload supporting documents' },
  { id: 5, name: 'Token', description: 'Configure your security token' },
  { id: 6, name: 'Review', description: 'Review and submit' },
];

const CATEGORIES = [
  'Real Estate',
  'Infrastructure',
  'Agriculture',
  'Energy & Renewables',
  'Technology',
  'Healthcare',
  'Manufacturing',
  'Hospitality',
  'Education',
  'Financial Services',
  'Other',
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CreateProjectPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    category: '',
    localCurrency: 'USD',
    fundingGoalLocal: '',
    minInvestmentLocal: '',
    maxInvestmentLocal: '',
    acceptedTokens: ['USDT', 'USDC'],
    milestones: [],
    startDate: '',
    endDate: '',
    businessPlan: null,
    financialProjections: null,
    legalDocuments: null,
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    pricePerTokenLocal: '',
  });

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ============================================
  // FETCH EXCHANGE RATES
  // ============================================

  const fetchExchangeRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);
    
    try {
      const response = await fetch('/api/currency/rates');
      const data = await response.json();
      
      if (data.success) {
        setExchangeRates(data);
      } else {
        setRatesError('Failed to fetch exchange rates');
      }
    } catch (error) {
      setRatesError('Failed to fetch exchange rates');
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  // ============================================
  // CURRENCY CONVERSION HELPERS
  // ============================================

  const convertToUSD = useCallback((localAmount: number, currency: string): number => {
    if (!exchangeRates || currency === 'USD') return localAmount;
    const rate = exchangeRates.rates[currency];
    if (!rate) return localAmount;
    return Math.round((localAmount / rate) * 100) / 100;
  }, [exchangeRates]);

  const getUSDEquivalent = useCallback((localAmountStr: string): string => {
    const localAmount = parseFloat(localAmountStr);
    if (isNaN(localAmount) || !exchangeRates) return '';
    const usd = convertToUSD(localAmount, formData.localCurrency);
    return formatCurrency(usd, 'USD');
  }, [exchangeRates, formData.localCurrency, convertToUSD]);

  const getCurrentCurrencySymbol = useCallback((): string => {
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === formData.localCurrency);
    return currency?.symbol || formData.localCurrency;
  }, [formData.localCurrency]);

  // ============================================
  // FORM HANDLERS
  // ============================================

  const updateFormData = (field: keyof ProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Project name is required';
        if (formData.name.length < 3) newErrors.name = 'Name must be at least 3 characters';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
        if (!formData.category) newErrors.category = 'Please select a category';
        break;

      case 2:
        if (!formData.fundingGoalLocal) newErrors.fundingGoalLocal = 'Funding goal is required';
        if (parseFloat(formData.fundingGoalLocal) <= 0) newErrors.fundingGoalLocal = 'Must be greater than 0';
        if (!formData.minInvestmentLocal) newErrors.minInvestmentLocal = 'Minimum investment is required';
        if (parseFloat(formData.minInvestmentLocal) <= 0) newErrors.minInvestmentLocal = 'Must be greater than 0';
        if (formData.acceptedTokens.length === 0) newErrors.acceptedTokens = 'Select at least one payment token';
        break;

      case 3:
        if (formData.milestones.length === 0) {
          newErrors.milestones = 'At least one milestone is required';
        } else {
          const totalPercentage = formData.milestones.reduce((sum, m) => sum + m.percentage, 0);
          if (totalPercentage !== 100) {
            newErrors.milestones = `Milestone percentages must total 100% (currently ${totalPercentage}%)`;
          }
        }
        break;

      case 4:
        if (!formData.startDate) newErrors.startDate = 'Start date is required';
        if (!formData.endDate) newErrors.endDate = 'End date is required';
        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;

      case 5:
        if (!formData.tokenName.trim()) newErrors.tokenName = 'Token name is required';
        if (!formData.tokenSymbol.trim()) newErrors.tokenSymbol = 'Token symbol is required';
        if (formData.tokenSymbol.length > 6) newErrors.tokenSymbol = 'Symbol must be 6 characters or less';
        if (!formData.totalSupply) newErrors.totalSupply = 'Total supply is required';
        if (parseFloat(formData.totalSupply) <= 0) newErrors.totalSupply = 'Must be greater than 0';
        if (!formData.pricePerTokenLocal) newErrors.pricePerTokenLocal = 'Token price is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    if (!isConnected || !address) {
      setSubmitResult({ type: 'error', message: 'Please connect your wallet' });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      // Prepare data with USD equivalents
      const fundingGoalUSD = convertToUSD(parseFloat(formData.fundingGoalLocal), formData.localCurrency);
      const minInvestmentUSD = convertToUSD(parseFloat(formData.minInvestmentLocal), formData.localCurrency);
      const maxInvestmentUSD = formData.maxInvestmentLocal 
        ? convertToUSD(parseFloat(formData.maxInvestmentLocal), formData.localCurrency)
        : null;
      const pricePerTokenUSD = convertToUSD(parseFloat(formData.pricePerTokenLocal), formData.localCurrency);

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('creator', address);
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('category', formData.category);
      
      // Currency info
      submitData.append('localCurrency', formData.localCurrency);
      submitData.append('fundingGoalLocal', formData.fundingGoalLocal);
      submitData.append('fundingGoalUSD', fundingGoalUSD.toString());
      submitData.append('minInvestmentLocal', formData.minInvestmentLocal);
      submitData.append('minInvestmentUSD', minInvestmentUSD.toString());
      if (maxInvestmentUSD) {
        submitData.append('maxInvestmentLocal', formData.maxInvestmentLocal);
        submitData.append('maxInvestmentUSD', maxInvestmentUSD.toString());
      }
      submitData.append('exchangeRate', (exchangeRates?.rates[formData.localCurrency] || 1).toString());
      submitData.append('acceptedTokens', JSON.stringify(formData.acceptedTokens));
      
      // Milestones
      submitData.append('milestones', JSON.stringify(formData.milestones));
      
      // Timeline
      submitData.append('startDate', formData.startDate);
      submitData.append('endDate', formData.endDate);
      
      // Token details
      submitData.append('tokenName', formData.tokenName);
      submitData.append('tokenSymbol', formData.tokenSymbol);
      submitData.append('totalSupply', formData.totalSupply);
      submitData.append('pricePerTokenLocal', formData.pricePerTokenLocal);
      submitData.append('pricePerTokenUSD', pricePerTokenUSD.toString());
      
      // Documents
      if (formData.businessPlan) submitData.append('businessPlan', formData.businessPlan);
      if (formData.financialProjections) submitData.append('financialProjections', formData.financialProjections);
      if (formData.legalDocuments) submitData.append('legalDocuments', formData.legalDocuments);

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (result.success) {
        setSubmitResult({ type: 'success', message: 'Project created successfully!' });
        // Redirect to project page after delay
        setTimeout(() => {
          router.push(`/projects/${result.projectId}`);
        }, 2000);
      } else {
        setSubmitResult({ type: 'error', message: result.error || 'Failed to create project' });
      }
    } catch (error: any) {
      setSubmitResult({ type: 'error', message: error.message || 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // MILESTONE HANDLERS
  // ============================================

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      title: '',
      description: '',
      percentage: 0,
      targetDate: '',
      deliverables: [''],
      status: 'pending',
    };
    updateFormData('milestones', [...formData.milestones, newMilestone]);
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    const updated = formData.milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    updateFormData('milestones', updated);
  };

  const removeMilestone = (id: string) => {
    updateFormData('milestones', formData.milestones.filter(m => m.id !== id));
  };

  const addDeliverable = (milestoneId: string) => {
    const updated = formData.milestones.map(m => 
      m.id === milestoneId 
        ? { ...m, deliverables: [...m.deliverables, ''] }
        : m
    );
    updateFormData('milestones', updated);
  };

  const updateDeliverable = (milestoneId: string, index: number, value: string) => {
    const updated = formData.milestones.map(m => {
      if (m.id === milestoneId) {
        const newDeliverables = [...m.deliverables];
        newDeliverables[index] = value;
        return { ...m, deliverables: newDeliverables };
      }
      return m;
    });
    updateFormData('milestones', updated);
  };

  const removeDeliverable = (milestoneId: string, index: number) => {
    const updated = formData.milestones.map(m => {
      if (m.id === milestoneId) {
        const newDeliverables = m.deliverables.filter((_, i) => i !== index);
        return { ...m, deliverables: newDeliverables.length ? newDeliverables : [''] };
      }
      return m;
    });
    updateFormData('milestones', updated);
  };

  const distributeMilestonesEvenly = () => {
    if (formData.milestones.length === 0) return;
    const evenPercentage = Math.floor(100 / formData.milestones.length);
    const remainder = 100 - (evenPercentage * formData.milestones.length);
    
    const updated = formData.milestones.map((m, i) => ({
      ...m,
      percentage: evenPercentage + (i === formData.milestones.length - 1 ? remainder : 0),
    }));
    updateFormData('milestones', updated);
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                currentStep > step.id
                  ? 'bg-green-600 border-green-600 text-white'
                  : currentStep === step.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400'
              }`}
            >
              {currentStep > step.id ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-full h-1 mx-2 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-700'
                }`}
                style={{ minWidth: '40px' }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <h2 className="text-xl font-semibold text-white">{STEPS[currentStep - 1].name}</h2>
        <p className="text-gray-400 text-sm">{STEPS[currentStep - 1].description}</p>
      </div>
    </div>
  );

  // ============================================
  // STEP RENDERS
  // ============================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Project Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          placeholder="Enter your project name"
          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-600'
          }`}
        />
        {errors.name && <p className="mt-1 text-red-400 text-sm">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Category *</label>
        <select
          value={formData.category}
          onChange={(e) => updateFormData('category', e.target.value)}
          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-blue-500 ${
            errors.category ? 'border-red-500' : 'border-gray-600'
          }`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-red-400 text-sm">{errors.category}</p>}
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Describe your project in detail (minimum 50 characters)"
          rows={6}
          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none ${
            errors.description ? 'border-red-500' : 'border-gray-600'
          }`}
        />
        <div className="flex justify-between mt-1">
          {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
          <p className="text-gray-500 text-sm ml-auto">{formData.description.length} characters</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Currency Selection */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-medium">Local Currency</h3>
            <p className="text-gray-400 text-sm">Select the currency for your business plan and documents</p>
          </div>
          {ratesLoading && (
            <div className="flex items-center text-gray-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
              Loading rates...
            </div>
          )}
        </div>
        
        <select
          value={formData.localCurrency}
          onChange={(e) => updateFormData('localCurrency', e.target.value)}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          {SUPPORTED_CURRENCIES.map(currency => (
            <option key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code} - {currency.name}
            </option>
          ))}
        </select>

        {exchangeRates && formData.localCurrency !== 'USD' && (
          <p className="mt-2 text-gray-400 text-sm">
            Exchange rate: 1 USD = {exchangeRates.rates[formData.localCurrency]?.toFixed(4)} {formData.localCurrency}
          </p>
        )}
      </div>

      {/* Funding Goal */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Funding Goal *</label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {getCurrentCurrencySymbol()}
            </span>
            <input
              type="number"
              value={formData.fundingGoalLocal}
              onChange={(e) => updateFormData('fundingGoalLocal', e.target.value)}
              placeholder="0"
              className={`w-full px-4 py-3 pl-10 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                errors.fundingGoalLocal ? 'border-red-500' : 'border-gray-600'
              }`}
            />
          </div>
          {formData.localCurrency !== 'USD' && formData.fundingGoalLocal && (
            <div className="flex items-center px-4 py-3 bg-gray-600 rounded-lg min-w-[150px]">
              <span className="text-gray-400 text-sm">≈</span>
              <span className="text-white ml-2">{getUSDEquivalent(formData.fundingGoalLocal)}</span>
            </div>
          )}
        </div>
        {errors.fundingGoalLocal && <p className="mt-1 text-red-400 text-sm">{errors.fundingGoalLocal}</p>}
      </div>

      {/* Min/Max Investment */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Minimum Investment *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {getCurrentCurrencySymbol()}
            </span>
            <input
              type="number"
              value={formData.minInvestmentLocal}
              onChange={(e) => updateFormData('minInvestmentLocal', e.target.value)}
              placeholder="0"
              className={`w-full px-4 py-3 pl-10 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                errors.minInvestmentLocal ? 'border-red-500' : 'border-gray-600'
              }`}
            />
          </div>
          {formData.localCurrency !== 'USD' && formData.minInvestmentLocal && (
            <p className="mt-1 text-gray-400 text-sm">≈ {getUSDEquivalent(formData.minInvestmentLocal)}</p>
          )}
          {errors.minInvestmentLocal && <p className="mt-1 text-red-400 text-sm">{errors.minInvestmentLocal}</p>}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Maximum Investment (Optional)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {getCurrentCurrencySymbol()}
            </span>
            <input
              type="number"
              value={formData.maxInvestmentLocal}
              onChange={(e) => updateFormData('maxInvestmentLocal', e.target.value)}
              placeholder="No limit"
              className="w-full px-4 py-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          {formData.localCurrency !== 'USD' && formData.maxInvestmentLocal && (
            <p className="mt-1 text-gray-400 text-sm">≈ {getUSDEquivalent(formData.maxInvestmentLocal)}</p>
          )}
        </div>
      </div>

      {/* Accepted Payment Tokens */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Accepted Payment Tokens *</label>
        <p className="text-gray-400 text-sm mb-3">Select which cryptocurrencies investors can use</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACCEPTED_PAYMENT_TOKENS.map(token => (
            <label
              key={token.symbol}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.acceptedTokens.includes(token.symbol)
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.acceptedTokens.includes(token.symbol)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateFormData('acceptedTokens', [...formData.acceptedTokens, token.symbol]);
                  } else {
                    updateFormData('acceptedTokens', formData.acceptedTokens.filter(t => t !== token.symbol));
                  }
                }}
                className="sr-only"
              />
              <span className="text-white font-medium">{token.symbol}</span>
              <span className="text-gray-400 text-sm ml-auto">{token.name}</span>
            </label>
          ))}
        </div>
        {errors.acceptedTokens && <p className="mt-2 text-red-400 text-sm">{errors.acceptedTokens}</p>}
      </div>
    </div>
  );

  const renderStep3 = () => {
    const totalPercentage = formData.milestones.reduce((sum, m) => sum + m.percentage, 0);
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Project Milestones</h3>
              <p className="text-gray-400 text-sm">Define milestones and the percentage of funds released at each stage</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                totalPercentage === 100 ? 'bg-green-600 text-white' : 
                totalPercentage > 100 ? 'bg-red-600 text-white' : 'bg-yellow-600 text-black'
              }`}>
                {totalPercentage}% / 100%
              </div>
              <button
                onClick={addMilestone}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                + Add Milestone
              </button>
            </div>
          </div>
        </div>

        {errors.milestones && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3">
            <p className="text-red-400 text-sm">{errors.milestones}</p>
          </div>
        )}

        {formData.milestones.length === 0 ? (
          <div className="text-center py-12 bg-gray-700/30 rounded-lg">
            <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-400 mb-4">No milestones defined yet</p>
            <button
              onClick={addMilestone}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add Your First Milestone
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.milestones.length > 1 && (
              <button
                onClick={distributeMilestonesEvenly}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Distribute percentages evenly
              </button>
            )}
            
            {formData.milestones.map((milestone, index) => (
              <div key={milestone.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-medium text-sm">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                      placeholder="Milestone title"
                      className="bg-transparent text-white text-lg font-medium focus:outline-none border-b border-transparent hover:border-gray-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => removeMilestone(milestone.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Fund Release %</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(milestone.id, 'percentage', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 pr-8 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                    {formData.fundingGoalLocal && (
                      <p className="text-gray-500 text-xs mt-1">
                        ≈ {formatCurrency(
                          (parseFloat(formData.fundingGoalLocal) * milestone.percentage) / 100,
                          formData.localCurrency
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Target Date</label>
                    <input
                      type="date"
                      value={milestone.targetDate}
                      onChange={(e) => updateMilestone(milestone.id, 'targetDate', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-1">Description</label>
                  <textarea
                    value={milestone.description}
                    onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                    placeholder="Describe what will be accomplished in this milestone"
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Deliverables</label>
                  <div className="space-y-2">
                    {milestone.deliverables.map((deliverable, dIndex) => (
                      <div key={dIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={deliverable}
                          onChange={(e) => updateDeliverable(milestone.id, dIndex, e.target.value)}
                          placeholder={`Deliverable ${dIndex + 1}`}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                        />
                        {milestone.deliverables.length > 1 && (
                          <button
                            onClick={() => removeDeliverable(milestone.id, dIndex)}
                            className="px-2 text-gray-400 hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addDeliverable(milestone.id)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      + Add deliverable
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Milestone Summary */}
        {formData.milestones.length > 0 && (
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Milestone Summary</h4>
            <div className="space-y-2">
              {formData.milestones.map((m, i) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{i + 1}. {m.title || 'Untitled'}</span>
                  <span className="text-white font-medium">{m.percentage}%</span>
                </div>
              ))}
              <div className="border-t border-gray-600 pt-2 mt-2 flex items-center justify-between">
                <span className="text-gray-300 font-medium">Total</span>
                <span className={`font-bold ${totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Funding Start Date *</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => updateFormData('startDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-blue-500 ${
              errors.startDate ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.startDate && <p className="mt-1 text-red-400 text-sm">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Funding End Date *</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => updateFormData('endDate', e.target.value)}
            min={formData.startDate || new Date().toISOString().split('T')[0]}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white focus:outline-none focus:border-blue-500 ${
              errors.endDate ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.endDate && <p className="mt-1 text-red-400 text-sm">{errors.endDate}</p>}
        </div>
      </div>

      {/* Document Currency Notice */}
      {formData.localCurrency !== 'USD' && (
        <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <strong>Note:</strong> Your documents can be in {formData.localCurrency}. We&apos;ll display both local currency and USD equivalents to investors.
          </p>
        </div>
      )}

      {/* Documents */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Business Plan</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => updateFormData('businessPlan', e.target.files?.[0] || null)}
            className="hidden"
            id="businessPlan"
          />
          <label htmlFor="businessPlan" className="cursor-pointer">
            {formData.businessPlan ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white">{formData.businessPlan.name}</span>
                <button
                  onClick={(e) => { e.preventDefault(); updateFormData('businessPlan', null); }}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-400">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">PDF, DOC, DOCX (max 10MB)</p>
              </>
            )}
          </label>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Financial Projections</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.xls"
            onChange={(e) => updateFormData('financialProjections', e.target.files?.[0] || null)}
            className="hidden"
            id="financialProjections"
          />
          <label htmlFor="financialProjections" className="cursor-pointer">
            {formData.financialProjections ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white">{formData.financialProjections.name}</span>
                <button
                  onClick={(e) => { e.preventDefault(); updateFormData('financialProjections', null); }}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-400">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">PDF, DOC, XLSX (max 10MB)</p>
              </>
            )}
          </label>
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Legal Documents (Optional)</label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => updateFormData('legalDocuments', e.target.files?.[0] || null)}
            className="hidden"
            id="legalDocuments"
          />
          <label htmlFor="legalDocuments" className="cursor-pointer">
            {formData.legalDocuments ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white">{formData.legalDocuments.name}</span>
                <button
                  onClick={(e) => { e.preventDefault(); updateFormData('legalDocuments', null); }}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-400">Click to upload or drag and drop</p>
                <p className="text-gray-500 text-sm">PDF, DOC, DOCX (max 10MB)</p>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <h3 className="text-white font-medium mb-2">Security Token Configuration</h3>
        <p className="text-gray-400 text-sm">
          Configure the security token that will represent ownership in your project. 
          Investors will receive these tokens when they invest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Token Name *</label>
          <input
            type="text"
            value={formData.tokenName}
            onChange={(e) => updateFormData('tokenName', e.target.value)}
            placeholder="e.g., Project Alpha Token"
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
              errors.tokenName ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.tokenName && <p className="mt-1 text-red-400 text-sm">{errors.tokenName}</p>}
        </div>
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">Token Symbol *</label>
          <input
            type="text"
            value={formData.tokenSymbol}
            onChange={(e) => updateFormData('tokenSymbol', e.target.value.toUpperCase())}
            placeholder="e.g., ALPHA"
            maxLength={6}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 uppercase ${
              errors.tokenSymbol ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {errors.tokenSymbol && <p className="mt-1 text-red-400 text-sm">{errors.tokenSymbol}</p>}
        </div>
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Total Token Supply *</label>
        <input
          type="number"
          value={formData.totalSupply}
          onChange={(e) => updateFormData('totalSupply', e.target.value)}
          placeholder="e.g., 1000000"
          className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
            errors.totalSupply ? 'border-red-500' : 'border-gray-600'
          }`}
        />
        {errors.totalSupply && <p className="mt-1 text-red-400 text-sm">{errors.totalSupply}</p>}
      </div>

      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">Price Per Token ({formData.localCurrency}) *</label>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {getCurrentCurrencySymbol()}
            </span>
            <input
              type="number"
              value={formData.pricePerTokenLocal}
              onChange={(e) => updateFormData('pricePerTokenLocal', e.target.value)}
              placeholder="0.00"
              step="0.01"
              className={`w-full px-4 py-3 pl-10 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${
                errors.pricePerTokenLocal ? 'border-red-500' : 'border-gray-600'
              }`}
            />
          </div>
          {formData.localCurrency !== 'USD' && formData.pricePerTokenLocal && (
            <div className="flex items-center px-4 py-3 bg-gray-600 rounded-lg min-w-[120px]">
              <span className="text-gray-400 text-sm">≈</span>
              <span className="text-white ml-2">{getUSDEquivalent(formData.pricePerTokenLocal)}</span>
            </div>
          )}
        </div>
        {errors.pricePerTokenLocal && <p className="mt-1 text-red-400 text-sm">{errors.pricePerTokenLocal}</p>}
      </div>

      {/* Token Summary */}
      {formData.totalSupply && formData.pricePerTokenLocal && (
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3">Token Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Total Supply</p>
              <p className="text-white font-medium">{parseInt(formData.totalSupply).toLocaleString()} {formData.tokenSymbol || 'tokens'}</p>
            </div>
            <div>
              <p className="text-gray-400">Market Cap</p>
              <p className="text-white font-medium">
                {formatCurrency(
                  parseFloat(formData.totalSupply) * parseFloat(formData.pricePerTokenLocal),
                  formData.localCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Price per Token</p>
              <p className="text-white font-medium">
                {formatCurrency(parseFloat(formData.pricePerTokenLocal), formData.localCurrency)}
                {formData.localCurrency !== 'USD' && (
                  <span className="text-gray-400 ml-2">({getUSDEquivalent(formData.pricePerTokenLocal)})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Funding Goal Coverage</p>
              <p className="text-white font-medium">
                {formData.fundingGoalLocal ? (
                  ((parseFloat(formData.totalSupply) * parseFloat(formData.pricePerTokenLocal)) / parseFloat(formData.fundingGoalLocal) * 100).toFixed(1)
                ) : '0'}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep6 = () => {
    const totalPercentage = formData.milestones.reduce((sum, m) => sum + m.percentage, 0);
    
    return (
      <div className="space-y-6">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">Review Your Project</h3>
          <p className="text-gray-400 text-sm">Please review all details before submitting</p>
        </div>

        {/* Basic Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">1</span>
            Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Name</p>
              <p className="text-white">{formData.name}</p>
            </div>
            <div>
              <p className="text-gray-400">Category</p>
              <p className="text-white">{formData.category}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400">Description</p>
              <p className="text-white text-sm">{formData.description.slice(0, 200)}...</p>
            </div>
          </div>
        </div>

        {/* Funding */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">2</span>
            Funding Details
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Local Currency</p>
              <p className="text-white">{formData.localCurrency}</p>
            </div>
            <div>
              <p className="text-gray-400">Funding Goal</p>
              <p className="text-white">
                {formatCurrency(parseFloat(formData.fundingGoalLocal), formData.localCurrency)}
                {formData.localCurrency !== 'USD' && (
                  <span className="text-gray-400 ml-2">({getUSDEquivalent(formData.fundingGoalLocal)})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Min Investment</p>
              <p className="text-white">
                {formatCurrency(parseFloat(formData.minInvestmentLocal), formData.localCurrency)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Accepted Tokens</p>
              <p className="text-white">{formData.acceptedTokens.join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">3</span>
            Milestones ({formData.milestones.length})
          </h4>
          <div className="space-y-2">
            {formData.milestones.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-700 last:border-0">
                <div>
                  <span className="text-white">{i + 1}. {m.title}</span>
                  {m.targetDate && (
                    <span className="text-gray-400 ml-2">({new Date(m.targetDate).toLocaleDateString()})</span>
                  )}
                </div>
                <span className="text-blue-400 font-medium">{m.percentage}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-sm font-medium">
              <span className="text-gray-300">Total</span>
              <span className={totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}>{totalPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Timeline & Documents */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">4</span>
            Timeline & Documents
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Start Date</p>
              <p className="text-white">{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-gray-400">End Date</p>
              <p className="text-white">{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400 mb-2">Documents</p>
              <div className="flex gap-2 flex-wrap">
                {formData.businessPlan && (
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Business Plan</span>
                )}
                {formData.financialProjections && (
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Financial Projections</span>
                )}
                {formData.legalDocuments && (
                  <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs">Legal Documents</span>
                )}
                {!formData.businessPlan && !formData.financialProjections && !formData.legalDocuments && (
                  <span className="text-gray-500">No documents uploaded</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Token */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">5</span>
            Token Details
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Token Name</p>
              <p className="text-white">{formData.tokenName}</p>
            </div>
            <div>
              <p className="text-gray-400">Symbol</p>
              <p className="text-white">{formData.tokenSymbol}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Supply</p>
              <p className="text-white">{parseInt(formData.totalSupply || '0').toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400">Price per Token</p>
              <p className="text-white">
                {formatCurrency(parseFloat(formData.pricePerTokenLocal || '0'), formData.localCurrency)}
              </p>
            </div>
          </div>
        </div>

        {submitResult && (
          <div className={`p-4 rounded-lg ${
            submitResult.type === 'success' ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
          }`}>
            {submitResult.message}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">Please connect your wallet to create a project</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Project</h1>
        <p className="text-gray-400 mb-8">Launch your tokenized real-world asset project</p>

        {renderStepIndicator()}

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            Previous
          </button>

          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? 'Creating Project...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
