// src/app/trade/deals/new/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Package,
  Users,
  DollarSign,
  Ship,
  Shield,
  Plus,
  Trash2,
  AlertCircle,
  Info,
  Upload,
  Calendar,
  Globe,
  Building2,
  Mail,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Star,
  Award,
  TrendingUp,
} from 'lucide-react';
import {
  ProductCategory,
  PRODUCT_CATEGORIES,
  Incoterm,
  INCOTERMS,
  PaymentCurrency,
  SUPPORTED_CURRENCIES,
  COUNTRIES,
  DEFAULT_MILESTONES,
  Milestone,
  MilestoneType,
} from '@/lib/trade/constants';

import { 
  checkTradeAuthorization, 
  validateMilestones,
  getDealRequirements,
  KYC_LEVEL_INFO,
  KYC_TRADE_LIMITS,
  KYCLevel,
  TradeAuthorizationResult,
} from '@/lib/trade/kyc-authorization';

// =============================================================================
// TYPES
// =============================================================================

type Step = 'parties' | 'product' | 'terms' | 'milestones' | 'review';

interface PartyInfo {
  companyName: string;
  country: string;
  registrationNumber: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  walletAddress: string;
}

interface ProductInfo {
  name: string;
  category: ProductCategory;
  description: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: PaymentCurrency;
  specifications: string;
}

interface TermsInfo {
  incoterm: Incoterm;
  originCountry: string;
  originPort: string;
  destinationCountry: string;
  destinationPort: string;
  deliveryDate: string;
  paymentTerms: string;
  inspectionRequired: boolean;
  insuranceRequired: boolean;
}

interface MilestoneConfig {
  id: string;
  type: MilestoneType;
  name: string;
  description: string;
  paymentPercentage: number;
  autoRelease: boolean;
}

interface FormData {
  buyer: PartyInfo;
  seller: PartyInfo;
  product: ProductInfo;
  terms: TermsInfo;
  milestones: MilestoneConfig[];
}

interface KYCInfo {
  level: KYCLevel;
  loading: boolean;
  error?: string;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialParty: PartyInfo = {
  companyName: '',
  country: '',
  registrationNumber: '',
  address: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  walletAddress: '',
};

const initialProduct: ProductInfo = {
  name: '',
  category: 'manufactured_goods',
  description: '',
  hsCode: '',
  quantity: 0,
  unit: 'PCS',
  unitPrice: 0,
  currency: 'USDC',
  specifications: '',
};

const initialTerms: TermsInfo = {
  incoterm: 'CIF',
  originCountry: '',
  originPort: '',
  destinationCountry: '',
  destinationPort: '',
  deliveryDate: '',
  paymentTerms: '',
  inspectionRequired: true,
  insuranceRequired: true,
};

const getInitialMilestones = (): MilestoneConfig[] => {
  return DEFAULT_MILESTONES.map((m, index) => ({
    id: `milestone-${index}`,
    type: m.type,
    name: m.name,
    description: m.description,
    paymentPercentage: m.paymentPercentage,
    autoRelease: m.autoRelease,
  }));
};

// =============================================================================
// KYC LEVEL ICONS
// =============================================================================

const KYC_ICONS: Record<KYCLevel, React.ReactNode> = {
  none: <Shield className="h-4 w-4" />,
  bronze: <Award className="h-4 w-4" />,
  silver: <Star className="h-4 w-4" />,
  gold: <Crown className="h-4 w-4" />,
  diamond: <Crown className="h-4 w-4" />,
};

// =============================================================================
// COMPONENTS
// =============================================================================

function StepIndicator({ 
  steps, 
  currentStep 
}: { 
  steps: { id: Step; label: string; icon: React.ReactNode }[];
  currentStep: Step;
}) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);
  
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                ${isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }
              `}>
                {isCompleted ? <Check className="h-6 w-6" /> : step.icon}
              </div>
              <span className={`mt-2 text-sm font-medium ${
                isCurrent ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 md:w-24 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-green-500' : 'bg-gray-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormSection({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description?: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-6">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon,
  helpText,
}: {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`
            w-full px-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 
            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : 'border-gray-700'}
          `}
        />
      </div>
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error,
  placeholder = 'Select...',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full px-4 py-3 bg-gray-900 border rounded-xl text-white appearance-none cursor-pointer
            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all
            ${error ? 'border-red-500' : 'border-gray-700'}
          `}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={`
          w-full px-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none
          ${error ? 'border-red-500' : 'border-gray-700'}
        `}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// =============================================================================
// KYC AUTHORIZATION BANNER
// =============================================================================

function KYCAuthorizationBanner({
  buyerKYC,
  sellerKYC,
  authResult,
  dealValue,
  onUpgradeClick,
}: {
  buyerKYC: KYCInfo;
  sellerKYC: KYCInfo;
  authResult: TradeAuthorizationResult | null;
  dealValue: number;
  onUpgradeClick: () => void;
}) {
  const isLoading = buyerKYC.loading || sellerKYC.loading;

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 mb-6">
        <div className="flex items-center">
          <Loader2 className="h-5 w-5 text-blue-400 animate-spin mr-3" />
          <span className="text-gray-400">Checking KYC authorization...</span>
        </div>
      </div>
    );
  }

  const effectiveLevel = buyerKYC.level === 'none' || sellerKYC.level === 'none' 
    ? 'none' 
    : ([buyerKYC.level, sellerKYC.level].sort((a, b) => {
        const order: KYCLevel[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];
        return order.indexOf(a) - order.indexOf(b);
      })[0]);

  const limits = KYC_TRADE_LIMITS[effectiveLevel];
  const buyerInfo = KYC_LEVEL_INFO[buyerKYC.level];
  const sellerInfo = KYC_LEVEL_INFO[sellerKYC.level];

  return (
    <div className="space-y-4 mb-6">
      {/* KYC Status Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Buyer KYC */}
        <div className={`rounded-xl p-4 border ${buyerInfo.color.replace('text-', 'border-').replace('400', '500/30')} ${buyerInfo.color.replace('text-', 'bg-').replace('400', '500/10')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Buyer KYC Level</span>
            <div className={`flex items-center ${buyerInfo.color}`}>
              {KYC_ICONS[buyerKYC.level]}
              <span className="ml-1 font-semibold">{buyerInfo.label}</span>
            </div>
          </div>
          {buyerKYC.level !== 'none' && limits && (
            <div className="text-xs text-gray-500">
              Max deal: ${limits.maxDealValue.toLocaleString()}
            </div>
          )}
        </div>

        {/* Seller KYC */}
        <div className={`rounded-xl p-4 border ${sellerInfo.color.replace('text-', 'border-').replace('400', '500/30')} ${sellerInfo.color.replace('text-', 'bg-').replace('400', '500/10')}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Seller KYC Level</span>
            <div className={`flex items-center ${sellerInfo.color}`}>
              {KYC_ICONS[sellerKYC.level]}
              <span className="ml-1 font-semibold">{sellerInfo.label}</span>
            </div>
          </div>
          {sellerKYC.level !== 'none' && limits && (
            <div className="text-xs text-gray-500">
              Max deal: ${limits.maxDealValue.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Authorization Result */}
      {authResult && (
        <>
          {/* Errors */}
          {authResult.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-400 font-semibold mb-2">Authorization Issues</p>
                  <ul className="space-y-1">
                    {authResult.errors.map((error, i) => (
                      <li key={i} className="text-sm text-red-300 flex items-start">
                        <span className="mr-2">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                  {authResult.requiredUpgrade && (
                    <div className="mt-3 pt-3 border-t border-red-500/20">
                      <p className="text-sm text-gray-400 mb-2">
                        Required KYC level for this deal: <span className="text-white font-semibold">{KYC_LEVEL_INFO[authResult.requiredUpgrade].label}</span>
                      </p>
                      <button
                        onClick={onUpgradeClick}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Upgrade KYC Level
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {authResult.warnings.length > 0 && authResult.errors.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-yellow-400 font-semibold mb-2">Warnings</p>
                  <ul className="space-y-1">
                    {authResult.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-yellow-300 flex items-start">
                        <span className="mr-2">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {authResult.authorized && authResult.errors.length === 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-400 mr-3" />
                <div>
                  <p className="text-green-400 font-semibold">Authorized for Trade</p>
                  <p className="text-sm text-gray-400">
                    Both parties meet KYC requirements for a ${dealValue.toLocaleString()} deal
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Effective Limits */}
          {limits && effectiveLevel !== 'none' && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-3">Effective Trade Limits (based on lowest KYC level)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Max Deal Value</p>
                  <p className="text-white font-semibold">${limits.maxDealValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Monthly Volume</p>
                  <p className="text-white font-semibold">${limits.maxMonthlyVolume.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Max Milestones</p>
                  <p className="text-white font-semibold">{limits.maxMilestones}</p>
                </div>
                <div>
                  <p className="text-gray-500">Min Advance</p>
                  <p className="text-white font-semibold">{limits.minAdvancePayment}%</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function PartiesStep({
  data,
  onChange,
  errors,
  buyerKYC,
  sellerKYC,
}: {
  data: FormData;
  onChange: (section: 'buyer' | 'seller', field: string, value: string) => void;
  errors: Record<string, string>;
  buyerKYC: KYCInfo;
  sellerKYC: KYCInfo;
}) {
  const { address } = useAccount();

  useEffect(() => {
    if (address && !data.buyer.walletAddress) {
      onChange('buyer', 'walletAddress', address);
    }
  }, [address]);

  const countryOptions = Object.entries(COUNTRIES).map(([code, country]) => ({
    value: code,
    label: country.name,
  }));

  const buyerInfo = KYC_LEVEL_INFO[buyerKYC.level];
  const sellerInfo = KYC_LEVEL_INFO[sellerKYC.level];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Buyer Section */}
      <FormSection title="Buyer Information" description="Your company details">
        {/* KYC Badge */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${buyerInfo.color.replace('text-', 'border-').replace('400', '500/30')} ${buyerInfo.color.replace('text-', 'bg-').replace('400', '500/10')} mb-4`}>
          <span className="text-sm text-gray-400">KYC Status</span>
          <div className={`flex items-center ${buyerInfo.color}`}>
            {buyerKYC.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {KYC_ICONS[buyerKYC.level]}
                <span className="ml-1 font-semibold text-sm">{buyerInfo.label}</span>
              </>
            )}
          </div>
        </div>

        <InputField
          label="Company Name"
          name="companyName"
          value={data.buyer.companyName}
          onChange={(e) => onChange('buyer', 'companyName', e.target.value)}
          placeholder="Enter company name"
          required
          icon={<Building2 className="h-5 w-5" />}
          error={errors['buyer.companyName']}
        />
        <SelectField
          label="Country"
          name="country"
          value={data.buyer.country}
          onChange={(e) => onChange('buyer', 'country', e.target.value)}
          options={countryOptions}
          required
          error={errors['buyer.country']}
        />
        <InputField
          label="Registration Number"
          name="registrationNumber"
          value={data.buyer.registrationNumber}
          onChange={(e) => onChange('buyer', 'registrationNumber', e.target.value)}
          placeholder="Company registration number"
          required
          error={errors['buyer.registrationNumber']}
        />
        <TextAreaField
          label="Business Address"
          name="address"
          value={data.buyer.address}
          onChange={(e) => onChange('buyer', 'address', e.target.value)}
          placeholder="Full business address"
          required
          error={errors['buyer.address']}
        />
        <InputField
          label="Contact Name"
          name="contactName"
          value={data.buyer.contactName}
          onChange={(e) => onChange('buyer', 'contactName', e.target.value)}
          placeholder="Primary contact name"
          required
          icon={<User className="h-5 w-5" />}
          error={errors['buyer.contactName']}
        />
        <InputField
          label="Contact Email"
          name="contactEmail"
          type="email"
          value={data.buyer.contactEmail}
          onChange={(e) => onChange('buyer', 'contactEmail', e.target.value)}
          placeholder="email@company.com"
          required
          icon={<Mail className="h-5 w-5" />}
          error={errors['buyer.contactEmail']}
        />
        <InputField
          label="Wallet Address"
          name="walletAddress"
          value={data.buyer.walletAddress}
          onChange={(e) => onChange('buyer', 'walletAddress', e.target.value)}
          placeholder="0x..."
          required
          helpText="This address will be used for escrow transactions"
          error={errors['buyer.walletAddress']}
        />
      </FormSection>

      {/* Seller Section */}
      <FormSection title="Seller Information" description="Counterparty details">
        {/* KYC Badge */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${sellerInfo.color.replace('text-', 'border-').replace('400', '500/30')} ${sellerInfo.color.replace('text-', 'bg-').replace('400', '500/10')} mb-4`}>
          <span className="text-sm text-gray-400">KYC Status</span>
          <div className={`flex items-center ${sellerInfo.color}`}>
            {sellerKYC.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {KYC_ICONS[sellerKYC.level]}
                <span className="ml-1 font-semibold text-sm">{sellerInfo.label}</span>
              </>
            )}
          </div>
        </div>

        <InputField
          label="Company Name"
          name="companyName"
          value={data.seller.companyName}
          onChange={(e) => onChange('seller', 'companyName', e.target.value)}
          placeholder="Enter company name"
          required
          icon={<Building2 className="h-5 w-5" />}
          error={errors['seller.companyName']}
        />
        <SelectField
          label="Country"
          name="country"
          value={data.seller.country}
          onChange={(e) => onChange('seller', 'country', e.target.value)}
          options={countryOptions}
          required
          error={errors['seller.country']}
        />
        <InputField
          label="Registration Number"
          name="registrationNumber"
          value={data.seller.registrationNumber}
          onChange={(e) => onChange('seller', 'registrationNumber', e.target.value)}
          placeholder="Company registration number"
          error={errors['seller.registrationNumber']}
        />
        <TextAreaField
          label="Business Address"
          name="address"
          value={data.seller.address}
          onChange={(e) => onChange('seller', 'address', e.target.value)}
          placeholder="Full business address"
          error={errors['seller.address']}
        />
        <InputField
          label="Contact Name"
          name="contactName"
          value={data.seller.contactName}
          onChange={(e) => onChange('seller', 'contactName', e.target.value)}
          placeholder="Primary contact name"
          required
          icon={<User className="h-5 w-5" />}
          error={errors['seller.contactName']}
        />
        <InputField
          label="Contact Email"
          name="contactEmail"
          type="email"
          value={data.seller.contactEmail}
          onChange={(e) => onChange('seller', 'contactEmail', e.target.value)}
          placeholder="email@company.com"
          required
          icon={<Mail className="h-5 w-5" />}
          error={errors['seller.contactEmail']}
        />
        <InputField
          label="Wallet Address"
          name="walletAddress"
          value={data.seller.walletAddress}
          onChange={(e) => onChange('seller', 'walletAddress', e.target.value)}
          placeholder="0x..."
          required
          helpText="Seller's receiving address for payments"
          error={errors['seller.walletAddress']}
        />
      </FormSection>
    </div>
  );
}

function ProductStep({
  data,
  onChange,
  errors,
  authResult,
}: {
  data: FormData;
  onChange: (field: string, value: string | number) => void;
  errors: Record<string, string>;
  authResult: TradeAuthorizationResult | null;
}) {
  const categoryOptions = Object.entries(PRODUCT_CATEGORIES).map(([value, cat]) => ({
    value,
    label: cat.label,
  }));

  const currencyOptions = Object.entries(SUPPORTED_CURRENCIES).map(([value, curr]) => ({
    value,
    label: `${curr.symbol} - ${curr.name}`,
  }));

  const unitOptions = [
    { value: 'PCS', label: 'Pieces (PCS)' },
    { value: 'MT', label: 'Metric Tons (MT)' },
    { value: 'KG', label: 'Kilograms (KG)' },
    { value: 'LBS', label: 'Pounds (LBS)' },
    { value: 'CBM', label: 'Cubic Meters (CBM)' },
    { value: 'SETS', label: 'Sets' },
    { value: 'UNITS', label: 'Units' },
    { value: 'CARTONS', label: 'Cartons' },
    { value: 'PALLETS', label: 'Pallets' },
    { value: 'CONTAINERS', label: 'Containers' },
  ];

  const totalValue = data.product.quantity * data.product.unitPrice;

  // Check if category requires higher KYC
  const categoryRequiresUpgrade = authResult?.errors.some(e => 
    e.toLowerCase().includes('category') || e.toLowerCase().includes('restricted')
  );

  return (
    <div className="space-y-6">
      <FormSection title="Product Details" description="Describe the goods being traded">
        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Product Name"
            name="name"
            value={data.product.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Enter product name"
            required
            error={errors['product.name']}
          />
          <div>
            <SelectField
              label="Category"
              name="category"
              value={data.product.category}
              onChange={(e) => onChange('category', e.target.value)}
              options={categoryOptions}
              required
              error={errors['product.category']}
            />
            {categoryRequiresUpgrade && (
              <p className="mt-1 text-xs text-yellow-400 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                This category may require higher KYC level
              </p>
            )}
          </div>
        </div>
        <TextAreaField
          label="Description"
          name="description"
          value={data.product.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Detailed product description..."
          rows={4}
          required
          error={errors['product.description']}
        />
        <InputField
          label="HS Code"
          name="hsCode"
          value={data.product.hsCode}
          onChange={(e) => onChange('hsCode', e.target.value)}
          placeholder="e.g., 8471.30"
          helpText="Harmonized System code for customs classification"
          error={errors['product.hsCode']}
        />
        <TextAreaField
          label="Technical Specifications"
          name="specifications"
          value={data.product.specifications}
          onChange={(e) => onChange('specifications', e.target.value)}
          placeholder="Technical specs, dimensions, materials, certifications required..."
          rows={3}
          error={errors['product.specifications']}
        />
      </FormSection>

      <FormSection title="Pricing & Quantity">
        <div className="grid md:grid-cols-3 gap-4">
          <InputField
            label="Quantity"
            name="quantity"
            type="number"
            value={data.product.quantity || ''}
            onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
            placeholder="0"
            required
            error={errors['product.quantity']}
          />
          <SelectField
            label="Unit"
            name="unit"
            value={data.product.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            options={unitOptions}
            required
            error={errors['product.unit']}
          />
          <InputField
            label="Unit Price"
            name="unitPrice"
            type="number"
            value={data.product.unitPrice || ''}
            onChange={(e) => onChange('unitPrice', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
            error={errors['product.unitPrice']}
          />
        </div>
        <SelectField
          label="Payment Currency"
          name="currency"
          value={data.product.currency}
          onChange={(e) => onChange('currency', e.target.value)}
          options={currencyOptions}
          required
          error={errors['product.currency']}
        />

        {/* Total Value Display */}
        <div className="mt-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Total Deal Value</span>
            <span className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
              }).format(totalValue)}
              <span className="text-sm text-gray-400 ml-2">{data.product.currency}</span>
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {data.product.quantity.toLocaleString()} {data.product.unit} × ${data.product.unitPrice.toLocaleString()} per unit
          </div>
          
          {/* Deal value authorization indicator */}
          {authResult && totalValue > 0 && (
            <div className={`mt-3 pt-3 border-t border-gray-700 flex items-center ${
              authResult.authorized ? 'text-green-400' : 'text-red-400'
            }`}>
              {authResult.authorized ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  <span className="text-sm">Within your KYC tier limit</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Exceeds your KYC tier limit - upgrade required</span>
                </>
              )}
            </div>
          )}
        </div>
      </FormSection>

      {/* Category-specific requirements notice */}
      {data.product.category && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-blue-400 font-medium">
                {PRODUCT_CATEGORIES[data.product.category].label} Requirements
              </p>
              <p className="text-sm text-gray-400 mt-1">
                This category requires: {PRODUCT_CATEGORIES[data.product.category].requiredCertifications.join(', ') || 'Standard documentation'}
              </p>
              {PRODUCT_CATEGORIES[data.product.category].specialDocuments.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  Special documents: {PRODUCT_CATEGORIES[data.product.category].specialDocuments.join(', ')}
                </p>
              )}
              {PRODUCT_CATEGORIES[data.product.category].minKycLevel && (
                <p className="text-sm text-yellow-400 mt-2">
                  Minimum KYC Level: {KYC_LEVEL_INFO[PRODUCT_CATEGORIES[data.product.category].minKycLevel!].label}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TermsStep({
  data,
  onChange,
  errors,
}: {
  data: FormData;
  onChange: (field: string, value: string | boolean) => void;
  errors: Record<string, string>;
}) {
  const incotermOptions = Object.entries(INCOTERMS).map(([value, term]) => ({
    value,
    label: `${value} - ${term.name}`,
  }));

  const countryOptions = Object.entries(COUNTRIES).map(([code, country]) => ({
    value: code,
    label: country.name,
  }));

  const selectedIncoterm = INCOTERMS[data.terms.incoterm];

  return (
    <div className="space-y-6">
      <FormSection title="Trade Terms (Incoterms 2020)">
        <SelectField
          label="Incoterm"
          name="incoterm"
          value={data.terms.incoterm}
          onChange={(e) => onChange('incoterm', e.target.value)}
          options={incotermOptions}
          required
          error={errors['terms.incoterm']}
        />

        {/* Incoterm Details */}
        {selectedIncoterm && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
            <h4 className="font-medium text-white mb-2">{selectedIncoterm.name}</h4>
            <p className="text-sm text-gray-400 mb-3">{selectedIncoterm.description}</p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Seller Responsibilities:</p>
                <ul className="list-disc list-inside text-gray-400">
                  {selectedIncoterm.sellerResponsibility.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Buyer Responsibilities:</p>
                <ul className="list-disc list-inside text-gray-400">
                  {selectedIncoterm.buyerResponsibility.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <span className="text-xs text-gray-500">Risk Transfer Point: </span>
              <span className="text-xs text-blue-400">{selectedIncoterm.riskTransfer}</span>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Shipping Route">
        <div className="grid md:grid-cols-2 gap-4">
          <SelectField
            label="Origin Country"
            name="originCountry"
            value={data.terms.originCountry}
            onChange={(e) => onChange('originCountry', e.target.value)}
            options={countryOptions}
            required
            error={errors['terms.originCountry']}
          />
          <InputField
            label="Origin Port/Location"
            name="originPort"
            value={data.terms.originPort}
            onChange={(e) => onChange('originPort', e.target.value)}
            placeholder="e.g., Shanghai Port, China"
            error={errors['terms.originPort']}
          />
          <SelectField
            label="Destination Country"
            name="destinationCountry"
            value={data.terms.destinationCountry}
            onChange={(e) => onChange('destinationCountry', e.target.value)}
            options={countryOptions}
            required
            error={errors['terms.destinationCountry']}
          />
          <InputField
            label="Destination Port/Location"
            name="destinationPort"
            value={data.terms.destinationPort}
            onChange={(e) => onChange('destinationPort', e.target.value)}
            placeholder="e.g., Los Angeles Port, USA"
            error={errors['terms.destinationPort']}
          />
        </div>
      </FormSection>

      <FormSection title="Delivery & Payment">
        <div className="grid md:grid-cols-2 gap-4">
          <InputField
            label="Expected Delivery Date"
            name="deliveryDate"
            type="date"
            value={data.terms.deliveryDate}
            onChange={(e) => onChange('deliveryDate', e.target.value)}
            required
            error={errors['terms.deliveryDate']}
          />
          <InputField
            label="Payment Terms"
            name="paymentTerms"
            value={data.terms.paymentTerms}
            onChange={(e) => onChange('paymentTerms', e.target.value)}
            placeholder="e.g., 30% advance, 70% on delivery"
            error={errors['terms.paymentTerms']}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <label className="flex items-center p-4 bg-gray-900 rounded-xl border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors">
            <input
              type="checkbox"
              checked={data.terms.inspectionRequired}
              onChange={(e) => onChange('inspectionRequired', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
            />
            <div className="ml-3">
              <span className="text-white font-medium">Third-Party Inspection</span>
              <p className="text-sm text-gray-400">Require pre-shipment inspection</p>
            </div>
          </label>
          <label className="flex items-center p-4 bg-gray-900 rounded-xl border border-gray-700 cursor-pointer hover:border-blue-500/50 transition-colors">
            <input
              type="checkbox"
              checked={data.terms.insuranceRequired}
              onChange={(e) => onChange('insuranceRequired', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
            />
            <div className="ml-3">
              <span className="text-white font-medium">Cargo Insurance</span>
              <p className="text-sm text-gray-400">Require insurance coverage</p>
            </div>
          </label>
        </div>
      </FormSection>
    </div>
  );
}

function MilestonesStep({
  data,
  onChange,
  errors,
  authResult,
}: {
  data: FormData;
  onChange: (milestones: MilestoneConfig[]) => void;
  errors: Record<string, string>;
  authResult: TradeAuthorizationResult | null;
}) {
  const totalPercentage = data.milestones.reduce((sum, m) => sum + m.paymentPercentage, 0);
  const totalValue = data.product.quantity * data.product.unitPrice;

  // Get milestone limits from KYC
  const milestoneValidation = authResult ? validateMilestones(
    data.milestones.map(m => ({ percentage: m.paymentPercentage, type: m.type })),
    authResult.effectiveKycLevel || 'bronze'
  ) : null;

  const updateMilestone = (id: string, field: string, value: string | number | boolean) => {
    const updated = data.milestones.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange(updated);
  };

  const addMilestone = () => {
    const newMilestone: MilestoneConfig = {
      id: `milestone-${Date.now()}`,
      type: 'custom',
      name: 'Custom Milestone',
      description: '',
      paymentPercentage: 0,
      autoRelease: false,
    };
    onChange([...data.milestones, newMilestone]);
  };

  const removeMilestone = (id: string) => {
    onChange(data.milestones.filter(m => m.id !== id));
  };

  // Check max milestones from KYC level
  const maxMilestones = authResult?.effectiveKycLevel 
    ? KYC_TRADE_LIMITS[authResult.effectiveKycLevel]?.maxMilestones || 5
    : 5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Payment Milestones</h3>
          <p className="text-sm text-gray-400">Define when payments will be released from escrow</p>
        </div>
        <button
          type="button"
          onClick={addMilestone}
          disabled={data.milestones.length >= maxMilestones}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </button>
      </div>

      {/* Milestone Limits Info */}
      {authResult?.effectiveKycLevel && (
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Your KYC level allows up to {maxMilestones} milestones
            </span>
            <span className={data.milestones.length >= maxMilestones ? 'text-yellow-400' : 'text-gray-400'}>
              {data.milestones.length} / {maxMilestones} used
            </span>
          </div>
        </div>
      )}

      {/* Total Percentage Bar */}
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Total Payment Allocation</span>
          <span className={`text-sm font-medium ${totalPercentage === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
            {totalPercentage}% / 100%
          </span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${totalPercentage === 100 ? 'bg-green-500' : totalPercentage > 100 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
        {totalPercentage !== 100 && (
          <p className="text-xs text-yellow-400 mt-2">
            {totalPercentage < 100 
              ? `${100 - totalPercentage}% remaining to allocate`
              : `${totalPercentage - 100}% over-allocated - please adjust`
            }
          </p>
        )}
      </div>

      {/* Milestone Validation Warnings */}
      {milestoneValidation && !milestoneValidation.valid && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-semibold mb-2">Milestone Configuration Issues</p>
              <ul className="space-y-1">
                {milestoneValidation.errors.map((error, i) => (
                  <li key={i} className="text-sm text-yellow-300 flex items-start">
                    <span className="mr-2">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {data.milestones.map((milestone, index) => (
          <div 
            key={milestone.id}
            className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium mr-3">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={milestone.name}
                  onChange={(e) => updateMilestone(milestone.id, 'name', e.target.value)}
                  className="text-lg font-semibold text-white bg-transparent border-none focus:ring-0 outline-none"
                  placeholder="Milestone name"
                />
              </div>
              {data.milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(milestone.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={milestone.description}
                  onChange={(e) => updateMilestone(milestone.id, 'description', e.target.value)}
                  placeholder="What triggers this milestone?"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Payment Release (%)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={milestone.paymentPercentage}
                    onChange={(e) => updateMilestone(milestone.id, 'paymentPercentage', parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                  />
                  <span className="ml-3 text-sm text-gray-400">
                    = {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((totalValue * milestone.paymentPercentage) / 100)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={milestone.autoRelease}
                  onChange={(e) => updateMilestone(milestone.id, 'autoRelease', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
                />
                <span className="ml-2 text-sm text-gray-400">
                  Auto-release when documents verified
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {errors['milestones'] && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <p className="text-red-400 text-sm">{errors['milestones']}</p>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ 
  data, 
  authResult,
  buyerKYC,
  sellerKYC,
}: { 
  data: FormData;
  authResult: TradeAuthorizationResult | null;
  buyerKYC: KYCInfo;
  sellerKYC: KYCInfo;
}) {
  const totalValue = data.product.quantity * data.product.unitPrice;
  const platformFee = totalValue * 0.005; // 0.5%

  const buyerInfo = KYC_LEVEL_INFO[buyerKYC.level];
  const sellerInfo = KYC_LEVEL_INFO[sellerKYC.level];

  return (
    <div className="space-y-6">
      {/* Authorization Status */}
      {authResult && (
        <div className={`rounded-xl p-4 border ${
          authResult.authorized 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center">
            {authResult.authorized ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-400 mr-3" />
                <div>
                  <p className="text-green-400 font-semibold">Ready to Submit</p>
                  <p className="text-sm text-gray-400">All authorization checks passed</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-6 w-6 text-red-400 mr-3" />
                <div>
                  <p className="text-red-400 font-semibold">Authorization Required</p>
                  <p className="text-sm text-gray-400">Please resolve the issues above before submitting</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start">
        <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <p className="text-blue-400 font-medium">Review Your Deal</p>
          <p className="text-sm text-gray-400 mt-1">
            Please review all details carefully before submitting. Once submitted, you'll need to sign
            the Letter of Intent and complete KYC verification.
          </p>
        </div>
      </div>

      {/* Parties Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Buyer
            </span>
            <span className={`flex items-center text-xs ${buyerInfo.color}`}>
              {KYC_ICONS[buyerKYC.level]}
              <span className="ml-1">{buyerInfo.label}</span>
            </span>
          </h4>
          <p className="text-lg font-semibold text-white">{data.buyer.companyName}</p>
          <p className="text-sm text-gray-400">{COUNTRIES[data.buyer.country]?.name}</p>
          <p className="text-sm text-gray-400 mt-2">{data.buyer.contactName}</p>
          <p className="text-sm text-gray-400">{data.buyer.contactEmail}</p>
          <p className="text-xs text-gray-500 mt-2 font-mono truncate">{data.buyer.walletAddress}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Seller
            </span>
            <span className={`flex items-center text-xs ${sellerInfo.color}`}>
              {KYC_ICONS[sellerKYC.level]}
              <span className="ml-1">{sellerInfo.label}</span>
            </span>
          </h4>
          <p className="text-lg font-semibold text-white">{data.seller.companyName}</p>
          <p className="text-sm text-gray-400">{COUNTRIES[data.seller.country]?.name}</p>
          <p className="text-sm text-gray-400 mt-2">{data.seller.contactName}</p>
          <p className="text-sm text-gray-400">{data.seller.contactEmail}</p>
          <p className="text-xs text-gray-500 mt-2 font-mono truncate">{data.seller.walletAddress}</p>
        </div>
      </div>

      {/* Product Summary */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <Package className="h-4 w-4 mr-2" />
          Product Details
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{data.product.name}</p>
            <p className="text-sm text-gray-400">{PRODUCT_CATEGORIES[data.product.category]?.label}</p>
            {data.product.hsCode && (
              <p className="text-sm text-gray-400">HS Code: {data.product.hsCode}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">
              {data.product.quantity.toLocaleString()} {data.product.unit} × ${data.product.unitPrice.toLocaleString()}
            </p>
            <p className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue)}
            </p>
            <p className="text-sm text-gray-400">{data.product.currency}</p>
          </div>
        </div>
        {data.product.description && (
          <p className="text-sm text-gray-400 mt-4 pt-4 border-t border-gray-700">
            {data.product.description}
          </p>
        )}
      </div>

      {/* Terms Summary */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <Ship className="h-4 w-4 mr-2" />
          Trade Terms
        </h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Incoterm</p>
            <p className="text-white font-medium">{data.terms.incoterm} - {INCOTERMS[data.terms.incoterm]?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Delivery Date</p>
            <p className="text-white font-medium">
              {new Date(data.terms.deliveryDate).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Origin</p>
            <p className="text-white font-medium">
              {data.terms.originPort ? `${data.terms.originPort}, ` : ''}{COUNTRIES[data.terms.originCountry]?.name}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Destination</p>
            <p className="text-white font-medium">
              {data.terms.destinationPort ? `${data.terms.destinationPort}, ` : ''}{COUNTRIES[data.terms.destinationCountry]?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-700">
          {data.terms.inspectionRequired && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Inspection Required
            </span>
          )}
          {data.terms.insuranceRequired && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Insurance Required
            </span>
          )}
        </div>
      </div>

      {/* Milestones Summary */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <DollarSign className="h-4 w-4 mr-2" />
          Payment Milestones
        </h4>
        <div className="space-y-3">
          {data.milestones.filter(m => m.paymentPercentage > 0).map((milestone, index) => (
            <div key={milestone.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
              <div className="flex items-center">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs mr-3">
                  {index + 1}
                </span>
                <div>
                  <p className="text-white text-sm font-medium">{milestone.name}</p>
                  {milestone.autoRelease && (
                    <p className="text-xs text-green-400">Auto-release</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((totalValue * milestone.paymentPercentage) / 100)}
                </p>
                <p className="text-xs text-gray-400">{milestone.paymentPercentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fee Summary */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Fee Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Deal Value</span>
            <span className="text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Platform Fee (0.5%)</span>
            <span className="text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(platformFee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
            <span className="text-white">Total to Deposit</span>
            <span className="text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValue + platformFee)}</span>
          </div>
        </div>
      </div>

      {/* Required Documents Preview */}
      {authResult?.effectiveKycLevel && (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Required Documents for This Deal
          </h4>
          <div className="grid md:grid-cols-2 gap-2">
            {getDealRequirements(data.product.category, totalValue).requiredDocuments.map((doc, i) => (
              <div key={i} className="flex items-center text-sm text-gray-400">
                <Check className="h-4 w-4 text-green-400 mr-2" />
                {doc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NewDealPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState<Step>('parties');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // KYC State
  const [buyerKYC, setBuyerKYC] = useState<KYCInfo>({ level: 'none', loading: true });
  const [sellerKYC, setSellerKYC] = useState<KYCInfo>({ level: 'none', loading: false });
  const [authResult, setAuthResult] = useState<TradeAuthorizationResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    buyer: { ...initialParty, walletAddress: address || '' },
    seller: initialParty,
    product: initialProduct,
    terms: initialTerms,
    milestones: getInitialMilestones(),
  });

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'parties', label: 'Parties', icon: <Users className="h-5 w-5" /> },
    { id: 'product', label: 'Product', icon: <Package className="h-5 w-5" /> },
    { id: 'terms', label: 'Terms', icon: <FileText className="h-5 w-5" /> },
    { id: 'milestones', label: 'Milestones', icon: <DollarSign className="h-5 w-5" /> },
    { id: 'review', label: 'Review', icon: <Check className="h-5 w-5" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const dealValue = formData.product.quantity * formData.product.unitPrice;

  // Fetch buyer KYC level
  const fetchBuyerKYC = useCallback(async () => {
    if (!formData.buyer.walletAddress) {
      setBuyerKYC({ level: 'none', loading: false });
      return;
    }

    setBuyerKYC(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`/api/kyc/level?address=${formData.buyer.walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setBuyerKYC({ level: data.level || 'none', loading: false });
      } else {
        setBuyerKYC({ level: 'none', loading: false });
      }
    } catch (error) {
      console.error('Error fetching buyer KYC:', error);
      setBuyerKYC({ level: 'none', loading: false, error: 'Failed to fetch KYC status' });
    }
  }, [formData.buyer.walletAddress]);

  // Fetch seller KYC level
  const fetchSellerKYC = useCallback(async () => {
    if (!formData.seller.walletAddress) {
      setSellerKYC({ level: 'none', loading: false });
      return;
    }

    setSellerKYC(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch(`/api/kyc/level?address=${formData.seller.walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setSellerKYC({ level: data.level || 'none', loading: false });
      } else {
        setSellerKYC({ level: 'none', loading: false });
      }
    } catch (error) {
      console.error('Error fetching seller KYC:', error);
      setSellerKYC({ level: 'none', loading: false, error: 'Failed to fetch KYC status' });
    }
  }, [formData.seller.walletAddress]);

  // Fetch KYC levels when wallet addresses change
  useEffect(() => {
    fetchBuyerKYC();
  }, [fetchBuyerKYC]);

  useEffect(() => {
    // Debounce seller KYC check
    const timer = setTimeout(() => {
      if (formData.seller.walletAddress && formData.seller.walletAddress.startsWith('0x')) {
        fetchSellerKYC();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.seller.walletAddress, fetchSellerKYC]);

  // Check authorization when relevant data changes
  useEffect(() => {
    if (!buyerKYC.loading && !sellerKYC.loading) {
      const result = checkTradeAuthorization({
        buyerKycLevel: buyerKYC.level,
        sellerKycLevel: sellerKYC.level,
        dealValue,
        productCategory: formData.product.category,
        buyerCountry: formData.buyer.country,
        sellerCountry: formData.seller.country,
        milestones: formData.milestones.map(m => ({
          percentage: m.paymentPercentage,
          type: m.type,
        })),
      });
      setAuthResult(result);
    }
  }, [
    buyerKYC.level, 
    buyerKYC.loading, 
    sellerKYC.level, 
    sellerKYC.loading, 
    dealValue, 
    formData.product.category,
    formData.buyer.country,
    formData.seller.country,
    formData.milestones,
  ]);

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'parties':
        if (!formData.buyer.companyName) newErrors['buyer.companyName'] = 'Required';
        if (!formData.buyer.country) newErrors['buyer.country'] = 'Required';
        if (!formData.buyer.contactName) newErrors['buyer.contactName'] = 'Required';
        if (!formData.buyer.contactEmail) newErrors['buyer.contactEmail'] = 'Required';
        if (!formData.buyer.walletAddress) newErrors['buyer.walletAddress'] = 'Required';
        if (!formData.seller.companyName) newErrors['seller.companyName'] = 'Required';
        if (!formData.seller.country) newErrors['seller.country'] = 'Required';
        if (!formData.seller.contactName) newErrors['seller.contactName'] = 'Required';
        if (!formData.seller.contactEmail) newErrors['seller.contactEmail'] = 'Required';
        if (!formData.seller.walletAddress) newErrors['seller.walletAddress'] = 'Required';
        
        // Check KYC levels
        if (buyerKYC.level === 'none') {
          newErrors['buyer.kyc'] = 'Buyer must complete KYC verification';
        }
        break;
      case 'product':
        if (!formData.product.name) newErrors['product.name'] = 'Required';
        if (!formData.product.description) newErrors['product.description'] = 'Required';
        if (formData.product.quantity <= 0) newErrors['product.quantity'] = 'Must be greater than 0';
        if (formData.product.unitPrice <= 0) newErrors['product.unitPrice'] = 'Must be greater than 0';
        
        // Check deal value against KYC limit
        if (authResult && !authResult.authorized) {
          const valueErrors = authResult.errors.filter(e => e.toLowerCase().includes('value') || e.toLowerCase().includes('limit'));
          if (valueErrors.length > 0) {
            newErrors['product.value'] = valueErrors[0];
          }
        }
        break;
      case 'terms':
        if (!formData.terms.originCountry) newErrors['terms.originCountry'] = 'Required';
        if (!formData.terms.destinationCountry) newErrors['terms.destinationCountry'] = 'Required';
        if (!formData.terms.deliveryDate) newErrors['terms.deliveryDate'] = 'Required';
        break;
      case 'milestones':
        const total = formData.milestones.reduce((sum, m) => sum + m.paymentPercentage, 0);
        if (total !== 100) newErrors['milestones'] = 'Milestone payments must total 100%';
        
        // Validate milestones against KYC limits
        if (authResult?.effectiveKycLevel) {
          const milestoneValidation = validateMilestones(
            formData.milestones.map(m => ({ percentage: m.paymentPercentage, type: m.type })),
            authResult.effectiveKycLevel
          );
          if (!milestoneValidation.valid) {
            newErrors['milestones'] = milestoneValidation.errors[0];
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('milestones')) return;
    
    // Final authorization check
    if (!authResult?.authorized) {
      setErrors({ submit: 'Deal not authorized. Please check KYC requirements and deal limits.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/trade/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': address || '',
        },
        body: JSON.stringify({
          ...formData,
          buyerKycLevel: buyerKYC.level,
          sellerKycLevel: sellerKYC.level,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create deal');
      }

      const deal = await response.json();
      router.push(`/trade/deals/${deal.id}`);
    } catch (error) {
      console.error('Error creating deal:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create deal. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradeKYC = () => {
    router.push('/kyc/upgrade');
  };

  const updateParty = (party: 'buyer' | 'seller', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [party]: { ...prev[party], [field]: value },
    }));
  };

  const updateProduct = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      product: { ...prev.product, [field]: value },
    }));
  };

  const updateTerms = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      terms: { ...prev.terms, [field]: value },
    }));
  };

  const updateMilestones = (milestones: MilestoneConfig[]) => {
    setFormData(prev => ({ ...prev, milestones }));
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connect Wallet</h1>
          <p className="text-gray-400 mb-6">Please connect your wallet to create a new deal</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/trade" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trade
          </Link>
          <h1 className="text-3xl font-bold text-white">Create New Deal</h1>
          <p className="text-gray-400 mt-1">Set up an international trade transaction with escrow protection</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* KYC Authorization Banner - Show on relevant steps */}
        {(currentStep === 'parties' || currentStep === 'product' || currentStep === 'review') && (
          <KYCAuthorizationBanner
            buyerKYC={buyerKYC}
            sellerKYC={sellerKYC}
            authResult={authResult}
            dealValue={dealValue}
            onUpgradeClick={handleUpgradeKYC}
          />
        )}

        {/* Form Content */}
        <div className="mb-8">
          {currentStep === 'parties' && (
            <PartiesStep 
              data={formData} 
              onChange={updateParty} 
              errors={errors}
              buyerKYC={buyerKYC}
              sellerKYC={sellerKYC}
            />
          )}
          {currentStep === 'product' && (
            <ProductStep 
              data={formData} 
              onChange={updateProduct} 
              errors={errors}
              authResult={authResult}
            />
          )}
          {currentStep === 'terms' && (
            <TermsStep data={formData} onChange={updateTerms} errors={errors} />
          )}
          {currentStep === 'milestones' && (
            <MilestonesStep 
              data={formData} 
              onChange={updateMilestones} 
              errors={errors}
              authResult={authResult}
            />
          )}
          {currentStep === 'review' && (
            <ReviewStep 
              data={formData}
              authResult={authResult}
              buyerKYC={buyerKYC}
              sellerKYC={sellerKYC}
            />
          )}
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <p className="text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !authResult?.authorized}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Deal...
                </>
              ) : (
                <>
                  Create Deal
                  <Check className="h-5 w-5 ml-2" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center"
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
