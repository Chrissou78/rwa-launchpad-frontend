// src/types/project.ts

// ============================================
// PAYMENT TOKENS (for blockchain payments)
// ============================================

export const ACCEPTED_PAYMENT_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon Amoy USDC
    decimals: 6,
    icon: '💵'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD', 
    address: '0x1dBe87Efd97c84d3a73807399EBbfcfF13Ff578e', // Polygon Amoy USDT
    decimals: 6,
    icon: '💲'
  }
] as const;

export type AcceptedPaymentToken = typeof ACCEPTED_PAYMENT_TOKENS[number];
export type PaymentTokenSymbol = AcceptedPaymentToken['symbol'];

// ============================================
// FIAT CURRENCIES
// ============================================

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', flag: '🇲🇦' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', flag: '🇹🇿' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', flag: '🇺🇬' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA', flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA', flag: '🌍' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', flag: '🇷🇼' },
];

// ============================================
// MILESTONES
// ============================================

export interface Milestone {
  id: string;
  title: string;
  description: string;
  percentage: number;
  targetDate?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  percentageOfFunds: number;
  targetDate: string;
  deliverables: string[];
  amountUSD: number;
  amountLocal: number;
}

// ============================================
// PROJECT AMOUNTS
// ============================================

export interface ProjectAmount {
  amount: number;
  currency: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getCurrencyByCode(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(c => c.code === code);
}

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const currency = getCurrencyByCode(currencyCode);
    const symbol = currency?.symbol || currencyCode;
    return `${symbol}${amount.toLocaleString()}`;
  }
}

export function getPaymentTokenBySymbol(symbol: string): AcceptedPaymentToken | undefined {
  return ACCEPTED_PAYMENT_TOKENS.find(t => t.symbol === symbol);
}

export function getPaymentTokenByAddress(address: string): AcceptedPaymentToken | undefined {
  return ACCEPTED_PAYMENT_TOKENS.find(
    t => t.address.toLowerCase() === address.toLowerCase()
  );
}
