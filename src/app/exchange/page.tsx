// src/app/exchange/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import Header from '@/components/Header';
import { ZERO_ADDRESS, RPC_URL, CONTRACTS, EXPLORER_URL } from '@/config/contracts';
import { RWAProjectNFTABI, RWASecurityTokenABI, RWASecurityExchangeABI, ERC20ABI } from '@/config/abis';

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
});

const EXCHANGE_ADDRESS = (CONTRACTS as any).RWASecurityExchange as `0x${string}` || ZERO_ADDRESS as `0x${string}`;
const PLATFORM_WALLET = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '';

// Tradable statuses: Active (2), Funded (3), InProgress (4), Completed (5)
const TRADABLE_STATUSES = [2, 3, 4, 5];

type ExchangeTab = 'crypto' | 'security';
type ModalType = 'deposit' | 'withdraw' | null;

// ============ MEXC CONFIGURATION - UPDATED FEES ============
const MEXC_CONFIG = {
  MARKUP_PERCENT: 0.5,
  PLATFORM_FEE_PERCENT: 1.0,
  get TOTAL_FEE_PERCENT() {
    return this.MARKUP_PERCENT + this.PLATFORM_FEE_PERCENT;
  },
  SUPPORTED_PAIRS: [
    { symbol: 'USDCUSDT', base: 'USDC', quote: 'USDT', displaySymbol: 'USDC/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'POLUSDT', base: 'POL', quote: 'USDT', displaySymbol: 'POL/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT', displaySymbol: 'ETH/USDT', pricePrecision: 2, qtyPrecision: 5, minQty: 0.001 },
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT', displaySymbol: 'BTC/USDT', pricePrecision: 2, qtyPrecision: 6, minQty: 0.0001 },
    { symbol: 'SOLUSDT', base: 'SOL', quote: 'USDT', displaySymbol: 'SOL/USDT', pricePrecision: 2, qtyPrecision: 3, minQty: 0.01 },
    { symbol: 'BNBUSDT', base: 'BNB', quote: 'USDT', displaySymbol: 'BNB/USDT', pricePrecision: 2, qtyPrecision: 4, minQty: 0.001 },
    { symbol: 'AVAXUSDT', base: 'AVAX', quote: 'USDT', displaySymbol: 'AVAX/USDT', pricePrecision: 3, qtyPrecision: 2, minQty: 0.1 },
    { symbol: 'DAIUSDT', base: 'DAI', quote: 'USDT', displaySymbol: 'DAI/USDT', pricePrecision: 4, qtyPrecision: 2, minQty: 1 },
    { symbol: 'AAVEUSDT', base: 'AAVE', quote: 'USDT', displaySymbol: 'AAVE/USDT', pricePrecision: 2, qtyPrecision: 3, minQty: 0.01 },
  ],
  // Avalanche Fuji testnet token addresses
TOKENS: {
  AVAX: { address: ZERO_ADDRESS, decimals: 18, isNative: true },
  USDC: { address: '0x5425890298aed601595a70AB815c96711a31Bc65', decimals: 6 },
  USDT: { address: '0x134Dc38AE8C853D1aa2103d5047591acDAA16682', decimals: 6 },
  WAVAX: { address: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', decimals: 18 }, // Wrapped AVAX
  WETH: { address: '0x86d67c3D38D2bCeE722E601025C25a575021c6EA', decimals: 18 },  // WETH on Fuji
  LINK: { address: '0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846', decimals: 18 },  // Chainlink on Fuji
  DAI: { address: '0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3', decimals: 18 },   // DAI on Fuji
} as Record<string, { address: string; decimals: number; isNative?: boolean }>,
REFRESH_INTERVAL: 2000,
};

const TOKEN_ICONS: Record<string, string> = {
  USDC: '💵',
  USDT: '💲',
  POL: '🟣',
  ETH: '💎',
  BTC: '🟠',
  SOL: '🟢',
  BNB: '🔶',
  AVAX: '🔺',
  DAI: '🟡',
  AAVE: '👻',
};
// ============ INTERFACES ============
interface MexcPair {
  symbol: string;
  base: string;
  quote: string;
  displaySymbol: string;
  pricePrecision: number;
  qtyPrecision: number;
  minQty: number;
}

interface MexcOrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

interface MexcOrderBook {
  bids: MexcOrderBookLevel[];
  asks: MexcOrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

interface MexcTicker {
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface TradableToken {
  address: string;
  name: string;
  symbol: string;
  projectId: bigint;
  projectName: string;
  totalSupply: bigint;
  status: number;
  hasTradingPair: boolean;
  lastPrice: bigint;
  volume24h: bigint;
}

interface SecurityOrder {
  id: bigint;
  trader: string;
  securityToken: string;
  paymentToken: string;
  side: number;
  price: bigint;
  amount: bigint;
  filled: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  status: number;
}

interface SecurityTradingPair {
  securityToken: string;
  paymentToken: string;
  active: boolean;
  totalVolume: bigint;
  lastPrice: bigint;
  highPrice24h: bigint;
  lowPrice24h: bigint;
  orderCount: bigint;
}

interface UserBalance {
  token: string;
  available: number;
  locked: number;
}

const STATUS_LABELS = ['Draft', 'Pending', 'Active', 'Funded', 'In Progress', 'Completed', 'Cancelled', 'Failed'];

// Extended Exchange ABI
const ExtendedExchangeABI = [
  ...RWASecurityExchangeABI,
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'getTradingPair', outputs: [{ type: 'tuple', components: [{ name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'active', type: 'bool' }, { name: 'totalVolume', type: 'uint256' }, { name: 'lastPrice', type: 'uint256' }, { name: 'highPrice24h', type: 'uint256' }, { name: 'lowPrice24h', type: 'uint256' }, { name: 'orderCount', type: 'uint256' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'validPairs', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_limit', type: 'uint256' }], name: 'getOrderBook', outputs: [{ name: 'buyOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }, { name: 'sellOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }, { name: '_side', type: 'uint8' }, { name: '_price', type: 'uint256' }, { name: '_amount', type: 'uint256' }, { name: '_expiresAt', type: 'uint256' }], name: 'createOrder', outputs: [{ name: 'orderId', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
] as const;

export default function ExchangePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Tab state
  const [activeTab, setActiveTab] = useState<ExchangeTab>('crypto');

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalToken, setModalToken] = useState<string>('USDT');
  const [modalAmount, setModalAmount] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [walletTokenBalance, setWalletTokenBalance] = useState<bigint>(0n);

  // ============ MEXC CRYPTO STATE ============
  const [selectedMexcPair, setSelectedMexcPair] = useState<MexcPair>(MEXC_CONFIG.SUPPORTED_PAIRS[0]);
  const [mexcOrderBook, setMexcOrderBook] = useState<MexcOrderBook | null>(null);
  const [mexcTicker, setMexcTicker] = useState<MexcTicker | null>(null);
  const [mexcTickers, setMexcTickers] = useState<Record<string, MexcTicker>>({});
  const [loadingMexcData, setLoadingMexcData] = useState(true);
  const [walletBaseBalance, setWalletBaseBalance] = useState(0);
  const [walletQuoteBalance, setWalletQuoteBalance] = useState(0);
  
  // Order form
  const [cryptoOrderSide, setCryptoOrderSide] = useState<'buy' | 'sell'>('buy');
  const [cryptoOrderAmount, setCryptoOrderAmount] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [estimatedReceived, setEstimatedReceived] = useState(0);

  // ============ SECURITY TOKEN STATE ============
  const [tradableTokens, setTradableTokens] = useState<TradableToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<TradableToken | null>(null);
  const [securityTradingPair, setSecurityTradingPair] = useState<SecurityTradingPair | null>(null);
  const [buyOrders, setBuyOrders] = useState<SecurityOrder[]>([]);
  const [sellOrders, setSellOrders] = useState<SecurityOrder[]>([]);
  const [loadingSecurityTokens, setLoadingSecurityTokens] = useState(true);
  const [loadingSecurityOrderBook, setLoadingSecurityOrderBook] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(0n);
  const [userUsdcBalance, setUserUsdcBalance] = useState<bigint>(0n);
  const [securityOrderSide, setSecurityOrderSide] = useState<'buy' | 'sell'>('buy');
  const [securityOrderPrice, setSecurityOrderPrice] = useState('');
  const [securityOrderAmount, setSecurityOrderAmount] = useState('');

  // Shared state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ============ MEXC DATA FETCHING ============
  
  // Fetch order book from MEXC
  const fetchMexcOrderBook = useCallback(async (symbol: string) => {
  try {
    const response = await fetch(`/api/exchange/mexc/orderbook?symbol=${symbol}&limit=15`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch order book');
    }
    
    const data = await response.json();
    
    setMexcOrderBook({
      bids: data.bids || [],
      asks: data.asks || [],
      spread: data.spread || 0,
      spreadPercent: data.spreadPercent || 0,
    });
  } catch (err) {
    console.error('Error fetching MEXC order book:', err);
  }
}, []);

  const loadWalletBalances = useCallback(async () => {
    if (!address) return;
    
    try {
      const baseToken = MEXC_CONFIG.TOKENS[selectedMexcPair.base];
      const quoteToken = MEXC_CONFIG.TOKENS[selectedMexcPair.quote];
      
      // Load base token balance
      if (baseToken?.isNative) {
        const balance = await publicClient.getBalance({ address });
        setWalletBaseBalance(parseFloat(formatUnits(balance, 18)));
      } else if (baseToken?.address && baseToken.address !== ZERO_ADDRESS) {
        const balance = await publicClient.readContract({
          address: baseToken.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        setWalletBaseBalance(parseFloat(formatUnits(balance as bigint, baseToken.decimals)));
      }
      
      // Load quote token balance (usually USDT)
      if (quoteToken?.address && quoteToken.address !== ZERO_ADDRESS) {
        const balance = await publicClient.readContract({
          address: quoteToken.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        setWalletQuoteBalance(parseFloat(formatUnits(balance as bigint, quoteToken.decimals)));
      }
    } catch (err) {
      console.error('Error loading wallet balances:', err);
    }
  }, [address, selectedMexcPair]);

  // Add useEffect to load balances
  useEffect(() => {
    if (address && activeTab === 'crypto') {
      loadWalletBalances();
      const interval = setInterval(loadWalletBalances, 15000);
      return () => clearInterval(interval);
    }
  }, [address, activeTab, loadWalletBalances]);

  // Fetch ticker from MEXC
  const fetchMexcTicker = useCallback(async (symbol: string) => {
  try {
    const response = await fetch(`/api/exchange/mexc/ticker?symbol=${symbol}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch ticker');
    }
    
    const data = await response.json();
    
    const ticker: MexcTicker = {
      lastPrice: data.lastPrice || 0,
      priceChange: data.priceChange || 0,
      priceChangePercent: data.priceChangePercent || 0,
      high24h: data.high24h || 0,
      low24h: data.low24h || 0,
      volume24h: data.volume24h || 0,
    };
    
    setMexcTicker(ticker);
    setMexcTickers(prev => ({ ...prev, [symbol]: ticker }));
  } catch (err) {
    console.error('Error fetching MEXC ticker:', err);
  }
}, []);

  // Fetch all tickers
  const fetchAllMexcTickers = useCallback(async () => {
  try {
    const response = await fetch('/api/exchange/mexc/ticker');
    
    if (!response.ok) {
      throw new Error('Failed to fetch tickers');
    }
    
    const data = await response.json();
    
    if (data.tickers) {
      setMexcTickers(data.tickers);
    }
  } catch (err) {
    console.error('Error fetching all MEXC tickers:', err);
  }
}, []);

  // Load user balances from database
  const loadUserBalances = useCallback(async () => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/exchange/balance', {
        headers: { 'x-wallet-address': address },
      });
      const data = await response.json();
      
      if (data.balances) {
        setUserBalances(data.balances.map((b: any) => ({
          token: b.token_symbol,
          available: parseFloat(b.available_balance) || 0,
          locked: parseFloat(b.locked_balance) || 0,
        })));
      }
    } catch (err) {
      console.error('Error loading user balances:', err);
    }
  }, [address]);

  // Load wallet token balance for deposit modal
  const loadWalletTokenBalance = useCallback(async (tokenSymbol: string) => {
    if (!address) return;
    
    const tokenConfig = MEXC_CONFIG.TOKENS[tokenSymbol];
    if (!tokenConfig) return;
    
    try {
      if (tokenConfig.isNative) {
        const balance = await publicClient.getBalance({ address });
        setWalletTokenBalance(balance);
      } else if (tokenConfig.address !== ZERO_ADDRESS) {
        const balance = await publicClient.readContract({
          address: tokenConfig.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        setWalletTokenBalance(balance as bigint);
      }
    } catch (err) {
      console.error('Error loading wallet balance:', err);
      setWalletTokenBalance(0n);
    }
  }, [address]);

  // ============ DEPOSIT/WITHDRAW HANDLERS ============

  const handleDeposit = async () => {
    if (!address || !modalAmount || !PLATFORM_WALLET) return;
    
    setModalLoading(true);
    setError('');
    
    try {
      const tokenConfig = MEXC_CONFIG.TOKENS[modalToken];
      if (!tokenConfig) throw new Error('Invalid token');
      
      const amount = parseUnits(modalAmount, tokenConfig.decimals);
      
      if (amount < parseUnits(MEXC_CONFIG.MIN_DEPOSIT.toString(), tokenConfig.decimals)) {
        throw new Error(`Minimum deposit is ${MEXC_CONFIG.MIN_DEPOSIT} ${modalToken}`);
      }
      
      let txHashResult: `0x${string}`;
      
      if (tokenConfig.isNative) {
        // Send native token (POL/MATIC)
        txHashResult = await writeContractAsync({
          address: PLATFORM_WALLET as `0x${string}`,
          abi: [],
          functionName: '',
          value: amount,
        } as any);
      } else {
        // Send ERC20 token
        txHashResult = await writeContractAsync({
          address: tokenConfig.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'transfer',
          args: [PLATFORM_WALLET as `0x${string}`, amount],
        });
      }
      
      // Record deposit in database
      const response = await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          action: 'deposit',
          tokenSymbol: modalToken,
          amount: modalAmount,
          txHash: txHashResult,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to record deposit');
      }
      
      setSuccessMessage(`Deposited ${modalAmount} ${modalToken} successfully!`);
      setModalType(null);
      setModalAmount('');
      loadUserBalances();
    } catch (err: any) {
      console.error('Deposit error:', err);
      setError(err.message || 'Deposit failed');
    } finally {
      setModalLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !modalAmount) return;
    
    setModalLoading(true);
    setError('');
    
    try {
      const tokenConfig = MEXC_CONFIG.TOKENS[modalToken];
      if (!tokenConfig) throw new Error('Invalid token');
      
      if (parseFloat(modalAmount) < MEXC_CONFIG.MIN_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal is ${MEXC_CONFIG.MIN_WITHDRAWAL} ${modalToken}`);
      }
      
      const response = await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          action: 'withdraw',
          tokenSymbol: modalToken,
          amount: modalAmount,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Withdrawal request failed');
      }
      
      setSuccessMessage(`Withdrawal of ${modalAmount} ${modalToken} requested! Processing...`);
      setModalType(null);
      setModalAmount('');
      loadUserBalances();
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setError(err.message || 'Withdrawal failed');
    } finally {
      setModalLoading(false);
    }
  };

  // ============ EFFECTS ============

  // Load MEXC data on mount and when pair changes
  useEffect(() => {
  if (activeTab !== 'crypto') return;
  
  let isMounted = true;
  
  const loadData = async () => {
    if (!isMounted) return;
    setLoadingMexcData(true);
    
    await Promise.all([
      fetchMexcOrderBook(selectedMexcPair.symbol),
      fetchMexcTicker(selectedMexcPair.symbol),
      fetchAllMexcTickers(),
    ]);
    
    if (isMounted) {
      setLoadingMexcData(false);
    }
  };
  
  // Initial load
  loadData();
  
  // Auto-refresh order book and ticker every 2 seconds
  const orderBookInterval = setInterval(() => {
    if (isMounted) {
      fetchMexcOrderBook(selectedMexcPair.symbol);
      fetchMexcTicker(selectedMexcPair.symbol);
    }
  }, MEXC_CONFIG.REFRESH_INTERVAL);
  
  // Refresh all tickers every 5 seconds
  const tickersInterval = setInterval(() => {
    if (isMounted) {
      fetchAllMexcTickers();
    }
  }, 5000);
  
  return () => {
    isMounted = false;
    clearInterval(orderBookInterval);
    clearInterval(tickersInterval);
  };
}, [activeTab, selectedMexcPair.symbol, fetchMexcOrderBook, fetchMexcTicker, fetchAllMexcTickers]);

  // Load user balances
  useEffect(() => {
    if (address) {
      loadUserBalances();
      const interval = setInterval(loadUserBalances, 10000);
      return () => clearInterval(interval);
    }
  }, [address, loadUserBalances]);

  // Load wallet balance when modal opens
  useEffect(() => {
    if (modalType === 'deposit' && modalToken) {
      loadWalletTokenBalance(modalToken);
    }
  }, [modalType, modalToken, loadWalletTokenBalance]);

  // Calculate estimated amounts with UPDATED FEES
  useEffect(() => {
    if (!mexcTicker || !cryptoOrderAmount) {
      setEstimatedTotal(0);
      setEstimatedReceived(0);
      return;
    }
    
    const amount = parseFloat(cryptoOrderAmount) || 0;
    const markupMultiplier = MEXC_CONFIG.MARKUP_PERCENT / 100;
    const feeMultiplier = MEXC_CONFIG.PLATFORM_FEE_PERCENT / 100; // Now 1%
    
    if (cryptoOrderSide === 'buy') {
      // Buying base token with quote token
      const priceWithMarkup = mexcTicker.lastPrice * (1 + markupMultiplier);
      const subtotal = amount * priceWithMarkup;
      const fee = subtotal * feeMultiplier;
      setEstimatedTotal(subtotal + fee);
      setEstimatedReceived(amount);
    } else {
      // Selling base token for quote token
      const priceWithMarkup = mexcTicker.lastPrice * (1 - markupMultiplier);
      const grossReceived = amount * priceWithMarkup;
      const fee = grossReceived * feeMultiplier;
      setEstimatedTotal(amount);
      setEstimatedReceived(grossReceived - fee);
    }
  }, [cryptoOrderAmount, cryptoOrderSide, mexcTicker]);

  // ============ SECURITY TOKENS LOADING ============
  useEffect(() => {
    const loadTradableTokens = async () => {
      try {
        setLoadingSecurityTokens(true);

        if (!CONTRACTS.RWAProjectNFT) {
          setTradableTokens([]);
          setLoadingSecurityTokens(false);
          return;
        }

        const total = await publicClient.readContract({
          address: CONTRACTS.RWAProjectNFT as `0x${string}`,
          abi: RWAProjectNFTABI,
          functionName: 'totalProjects',
        });

        if (total === 0n) {
          setTradableTokens([]);
          setLoadingSecurityTokens(false);
          return;
        }

        const tokens: TradableToken[] = [];

        for (let i = 1n; i <= total; i++) {
          try {
            const projectData = await publicClient.readContract({
              address: CONTRACTS.RWAProjectNFT as `0x${string}`,
              abi: RWAProjectNFTABI,
              functionName: 'getProject',
              args: [i],
            }) as any;

            if (!TRADABLE_STATUSES.includes(projectData.status) || projectData.securityToken === ZERO_ADDRESS) {
              continue;
            }

            const [name, symbol, totalSupply] = await Promise.all([
              publicClient.readContract({ address: projectData.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'name' }),
              publicClient.readContract({ address: projectData.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'symbol' }),
              publicClient.readContract({ address: projectData.securityToken as `0x${string}`, abi: RWASecurityTokenABI, functionName: 'totalSupply' }),
            ]);

            let hasTradingPair = false;
            let lastPrice = 0n;
            let volume24h = 0n;

            if (EXCHANGE_ADDRESS !== ZERO_ADDRESS) {
              try {
                const isValidPair = await publicClient.readContract({
                  address: EXCHANGE_ADDRESS,
                  abi: ExtendedExchangeABI,
                  functionName: 'validPairs',
                  args: [projectData.securityToken as `0x${string}`, CONTRACTS.USDC as `0x${string}`],
                });
                hasTradingPair = isValidPair as boolean;

                if (hasTradingPair) {
                  const pair = await publicClient.readContract({
                    address: EXCHANGE_ADDRESS,
                    abi: ExtendedExchangeABI,
                    functionName: 'getTradingPair',
                    args: [projectData.securityToken as `0x${string}`, CONTRACTS.USDC as `0x${string}`],
                  });
                  const typedPair = pair as unknown as SecurityTradingPair;
                  lastPrice = typedPair.lastPrice;
                  volume24h = typedPair.totalVolume;
                }
              } catch {}
            }

            let projectName = `Project #${i}`;
            if (projectData.metadataURI) {
              try {
                let url = projectData.metadataURI;
                if (url.startsWith('ipfs://')) {
                  const hash = url.replace('ipfs://', '');
                  if (hash.length >= 46) {
                    url = `https://gateway.pinata.cloud/ipfs/${hash}`;
                    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
                    if (res.ok) {
                      const meta = await res.json();
                      if (meta.name) projectName = meta.name;
                    }
                  }
                }
              } catch {}
            }

            tokens.push({
              address: projectData.securityToken,
              name: name as string,
              symbol: symbol as string,
              projectId: projectData.id,
              projectName,
              totalSupply: totalSupply as bigint,
              status: projectData.status,
              hasTradingPair,
              lastPrice,
              volume24h,
            });
          } catch (e) {
            console.error(`Error loading project ${i}:`, e);
          }
        }

        setTradableTokens(tokens);
      } catch (err) {
        console.error('Error loading tradable tokens:', err);
      } finally {
        setLoadingSecurityTokens(false);
      }
    };

    loadTradableTokens();
  }, []);

  // Load security order book when token selected
  useEffect(() => {
    if (activeTab !== 'security' || !selectedToken || EXCHANGE_ADDRESS === ZERO_ADDRESS) return;

    const loadOrderBook = async () => {
      try {
        setLoadingSecurityOrderBook(true);

        const [buyOrderList, sellOrderList] = await publicClient.readContract({
          address: EXCHANGE_ADDRESS,
          abi: ExtendedExchangeABI,
          functionName: 'getOrderBook',
          args: [selectedToken.address as `0x${string}`, BigInt(50)],
        });

        setBuyOrders(buyOrderList as unknown as SecurityOrder[]);
        setSellOrders(sellOrderList as unknown as SecurityOrder[]);

        const pair = await publicClient.readContract({
          address: EXCHANGE_ADDRESS,
          abi: ExtendedExchangeABI,
          functionName: 'getTradingPair',
          args: [selectedToken.address as `0x${string}`, CONTRACTS.USDC as `0x${string}`],
        });

        setSecurityTradingPair(pair as unknown as SecurityTradingPair);
      } catch (err) {
        console.error('Error loading order book:', err);
      } finally {
        setLoadingSecurityOrderBook(false);
      }
    };

    loadOrderBook();
    const interval = setInterval(loadOrderBook, 10000);
    return () => clearInterval(interval);
  }, [activeTab, selectedToken]);

  // Load user security balances
  useEffect(() => {
    if (activeTab !== 'security' || !address || !selectedToken) return;

    const loadBalances = async () => {
      try {
        const [tokenBal, usdcBal] = await Promise.all([
          publicClient.readContract({ address: selectedToken.address as `0x${string}`, abi: ERC20ABI, functionName: 'balanceOf', args: [address] }),
          publicClient.readContract({ address: CONTRACTS.USDC as `0x${string}`, abi: ERC20ABI, functionName: 'balanceOf', args: [address] }),
        ]);

        setUserTokenBalance(tokenBal as bigint);
        setUserUsdcBalance(usdcBal as bigint);
      } catch (err) {
        console.error('Error loading balances:', err);
      }
    };

    loadBalances();
  }, [activeTab, address, selectedToken]);

  // ============ TRADE HANDLERS ============

  // Execute MEXC trade via API
  const handleMexcTrade = async () => {
    if (!selectedMexcPair || !cryptoOrderAmount || !isConnected || !address) return;

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/exchange/mexc/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          symbol: selectedMexcPair.symbol,
          side: cryptoOrderSide.toUpperCase(),
          quantity: cryptoOrderAmount,
          price: mexcTicker?.lastPrice.toString() || '0',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Trade failed');
      }

      setSuccessMessage(
        `Trade executed! ${cryptoOrderSide === 'buy' ? 'Bought' : 'Sold'} ${data.trade?.executedQty || cryptoOrderAmount} ${selectedMexcPair.base} at $${data.trade?.executedPrice || mexcTicker?.lastPrice.toFixed(selectedMexcPair.pricePrecision)}`
      );
      setCryptoOrderAmount('');
      loadUserBalances();
    } catch (err: any) {
      console.error('Error executing trade:', err);
      setError(err.message || 'Failed to execute trade');
    } finally {
      setSubmitting(false);
    }
  };

  // Security token order
  const handleSubmitSecurityOrder = async () => {
    if (!selectedToken || !securityOrderPrice || !securityOrderAmount || !isConnected || !address) return;

    setSubmitting(true);
    setError('');

    try {
      const price = parseUnits(securityOrderPrice, 6);
      const amount = parseUnits(securityOrderAmount, 18);
      const side = securityOrderSide === 'buy' ? 0 : 1;
      const totalCost = (price * amount) / BigInt(1e18);

      if (securityOrderSide === 'buy') {
        const allowance = await publicClient.readContract({
          address: CONTRACTS.USDC as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [address, EXCHANGE_ADDRESS],
        });

        if ((allowance as bigint) < totalCost) {
          await writeContractAsync({
            address: CONTRACTS.USDC as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [EXCHANGE_ADDRESS, totalCost],
          });
        }
      } else {
        const allowance = await publicClient.readContract({
          address: selectedToken.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [address, EXCHANGE_ADDRESS],
        });

        if ((allowance as bigint) < amount) {
          await writeContractAsync({
            address: selectedToken.address as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [EXCHANGE_ADDRESS, amount],
          });
        }
      }

      await writeContractAsync({
        address: EXCHANGE_ADDRESS,
        abi: ExtendedExchangeABI,
        functionName: 'createOrder',
        args: [selectedToken.address as `0x${string}`, CONTRACTS.USDC as `0x${string}`, side, price, amount, BigInt(0)],
      });

      setSecurityOrderPrice('');
      setSecurityOrderAmount('');
      setSuccessMessage('Order placed successfully!');
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.shortMessage || err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSecurityOrder = async (orderId: bigint) => {
    try {
      await writeContractAsync({
        address: EXCHANGE_ADDRESS,
        abi: RWASecurityExchangeABI,
        functionName: 'cancelOrder',
        args: [orderId],
      });
      setSuccessMessage('Order cancelled');
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };

  // ============ HELPERS ============
  const formatPrice = (price: bigint) => `$${formatUnits(price, 6)}`;
  const formatAmount = (amount: bigint) => formatUnits(amount, 18);
  const formatUSDC = (amount: bigint) => `$${(Number(amount) / 1e6).toLocaleString()}`;
  
  const getTokenIcon = (symbol: string) => TOKEN_ICONS[symbol] || '🪙';
  
  const getUserBalance = (token: string) => {
    const balance = userBalances.find(b => b.token === token);
    return balance?.available || 0;
  };

  const exchangeDeployed = EXCHANGE_ADDRESS !== ZERO_ADDRESS;
  const totalFee = MEXC_CONFIG.TOTAL_FEE_PERCENT; // 1.5%

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      {/* ============ DEPOSIT/WITHDRAW MODAL ============ */}
      {modalType && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {modalType === 'deposit' ? '📥 Deposit' : '📤 Withdraw'}
              </h3>
              <button
                onClick={() => { setModalType(null); setModalAmount(''); setError(''); }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Token Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Token</label>
                <select
                  value={modalToken}
                  onChange={(e) => setModalToken(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  {Object.keys(MEXC_CONFIG.TOKENS).filter(t => MEXC_CONFIG.TOKENS[t].address !== ZERO_ADDRESS || MEXC_CONFIG.TOKENS[t].isNative).map((token) => (
                    <option key={token} value={token}>
                      {getTokenIcon(token)} {token}
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance Display */}
              <div className="p-3 bg-gray-700/50 rounded-lg">
                {modalType === 'deposit' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Wallet Balance:</span>
                    <span className="text-white">
                      {formatUnits(walletTokenBalance, MEXC_CONFIG.TOKENS[modalToken]?.decimals || 18)} {modalToken}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Available Balance:</span>
                    <span className="text-white">
                      {getUserBalance(modalToken).toFixed(4)} {modalToken}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    placeholder={modalType === 'deposit' ? `Min: ${MEXC_CONFIG.MIN_DEPOSIT}` : `Min: ${MEXC_CONFIG.MIN_WITHDRAWAL}`}
                    min={modalType === 'deposit' ? MEXC_CONFIG.MIN_DEPOSIT : MEXC_CONFIG.MIN_WITHDRAWAL}
                    step="0.0001"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none pr-16"
                  />
                  <button
                    onClick={() => {
                      if (modalType === 'deposit') {
                        setModalAmount(formatUnits(walletTokenBalance, MEXC_CONFIG.TOKENS[modalToken]?.decimals || 18));
                      } else {
                        setModalAmount(getUserBalance(modalToken).toString());
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                {modalType === 'deposit' ? (
                  <p className="text-blue-400">
                    💡 Tokens will be sent to the platform wallet. Your exchange balance will be credited after confirmation.
                  </p>
                ) : (
                  <p className="text-blue-400">
                    💡 Withdrawals are processed automatically. Tokens will be sent to your connected wallet.
                  </p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={modalType === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={modalLoading || !modalAmount || parseFloat(modalAmount) <= 0}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  modalType === 'deposit'
                    ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-600'
                    : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-600'
                } text-white disabled:cursor-not-allowed`}
              >
                {modalLoading
                  ? 'Processing...'
                  : modalType === 'deposit'
                    ? `Deposit ${modalToken}`
                    : `Withdraw ${modalToken}`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Exchange</h1>
            <p className="text-gray-400 mt-1">Trade tokens and real-world assets</p>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('crypto')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'crypto'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💱 Crypto Pairs
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'security'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🏢 Security Tokens
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
            <p className="text-green-400">{successMessage}</p>
            <button onClick={() => setSuccessMessage('')} className="text-green-400 hover:text-green-300">✕</button>
          </div>
        )}
        {error && !modalType && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <p className="text-red-400">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {/* ============ CRYPTO PAIRS TAB (MEXC) ============ */}
        {activeTab === 'crypto' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Pairs List */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Markets</h3>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto">
                  {MEXC_CONFIG.SUPPORTED_PAIRS.map((pair) => {
                    const ticker = mexcTickers[pair.symbol];
                    return (
                      <button
                        key={pair.symbol}
                        onClick={() => setSelectedMexcPair(pair)}
                        className={`w-full p-3 text-left border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors ${
                          selectedMexcPair.symbol === pair.symbol ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTokenIcon(pair.base)}</span>
                            <div>
                              <div className="font-medium text-white text-sm">{pair.displaySymbol}</div>
                              <div className="text-[10px] text-gray-400">{pair.base}/{pair.quote}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-xs">
                              {ticker ? `$${ticker.lastPrice.toFixed(pair.pricePrecision)}` : '-'}
                            </div>
                            {ticker && (
                              <div className={`text-[10px] ${ticker.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {ticker.priceChangePercent >= 0 ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Trading Area */}
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {/* Ticker Header */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getTokenIcon(selectedMexcPair.base)}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{selectedMexcPair.displaySymbol}</h2>
                        <p className="text-gray-400 text-sm">Live prices from MEXC</p>
                      </div>
                    </div>
                    {mexcTicker && (
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">
                          ${mexcTicker.lastPrice.toFixed(selectedMexcPair.pricePrecision)}
                        </p>
                        <p className={`text-sm ${mexcTicker.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {mexcTicker.priceChangePercent >= 0 ? '+' : ''}{mexcTicker.priceChangePercent.toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {mexcTicker && (
                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                      <div>
                        <p className="text-xs text-gray-400">24h High</p>
                        <p className="text-green-400 font-medium">${mexcTicker.high24h.toFixed(selectedMexcPair.pricePrecision)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">24h Low</p>
                        <p className="text-red-400 font-medium">${mexcTicker.low24h.toFixed(selectedMexcPair.pricePrecision)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">24h Volume</p>
                        <p className="text-white font-medium">{mexcTicker.volume24h.toLocaleString()} {selectedMexcPair.base}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Spread</p>
                        <p className="text-white font-medium">{mexcOrderBook?.spreadPercent.toFixed(3) || '-'}%</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Book */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Order Book</h3>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-[10px] text-gray-400">Live</span>
                        </div>
                      </div>

                      {loadingMexcData ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                          <p className="text-gray-400 mt-2">Loading...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 divide-x divide-gray-700">
                          {/* Bids */}
                          <div>
                            <div className="p-1.5 bg-gray-900/50 text-[10px] text-gray-400 grid grid-cols-3 font-medium">
                              <span>Bid</span>
                              <span className="text-right">Qty</span>
                              <span className="text-right">Total</span>
                            </div>
                            <div className="h-[390px] overflow-y-auto">
                              {mexcOrderBook?.bids && mexcOrderBook.bids.length > 0 ? (
                                mexcOrderBook.bids.map((level, i) => (
                                  <div
                                    key={`bid-${i}`}
                                    className="px-1.5 py-1 text-[11px] grid grid-cols-3 hover:bg-green-500/10 cursor-pointer border-b border-gray-700/20 relative"
                                    onClick={() => setCryptoOrderSide('sell')}
                                  >
                                    <div 
                                      className="absolute inset-0 bg-green-500/10"
                                      style={{ width: `${Math.min(100, (level.quantity / (mexcOrderBook.bids[0]?.total || 1)) * 100)}%` }}
                                    />
                                    <span className="text-green-400 font-medium relative z-10">
                                      {level.price.toFixed(selectedMexcPair.pricePrecision)}
                                    </span>
                                    <span className="text-right text-white relative z-10">
                                      {level.quantity.toFixed(selectedMexcPair.qtyPrecision)}
                                    </span>
                                    <span className="text-right text-gray-400 relative z-10">
                                      {level.total.toFixed(selectedMexcPair.qtyPrecision)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="p-4 text-center text-gray-500 text-[11px]">No bids</p>
                              )}
                            </div>
                          </div>

                          {/* Asks */}
                          <div>
                            <div className="p-1.5 bg-gray-900/50 text-[10px] text-gray-400 grid grid-cols-3 font-medium">
                              <span>Ask</span>
                              <span className="text-right">Qty</span>
                              <span className="text-right">Total</span>
                            </div>
                            <div className="h-[390px] overflow-y-auto">
                              {mexcOrderBook?.asks && mexcOrderBook.asks.length > 0 ? (
                                mexcOrderBook.asks.map((level, i) => (
                                  <div
                                    key={`ask-${i}`}
                                    className="px-1.5 py-1 text-[11px] grid grid-cols-3 hover:bg-red-500/10 cursor-pointer border-b border-gray-700/20 relative"
                                    onClick={() => setCryptoOrderSide('buy')}
                                  >
                                    <div 
                                      className="absolute inset-0 bg-red-500/10"
                                      style={{ width: `${Math.min(100, (level.quantity / (mexcOrderBook.asks[0]?.total || 1)) * 100)}%` }}
                                    />
                                    <span className="text-red-400 font-medium relative z-10">
                                      {level.price.toFixed(selectedMexcPair.pricePrecision)}
                                    </span>
                                    <span className="text-right text-white relative z-10">
                                      {level.quantity.toFixed(selectedMexcPair.qtyPrecision)}
                                    </span>
                                    <span className="text-right text-gray-400 relative z-10">
                                      {level.total.toFixed(selectedMexcPair.qtyPrecision)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="p-4 text-center text-gray-500 text-[11px]">No asks</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Trade Form */}
                  <div>
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <h3 className="text-sm font-semibold text-white mb-1">Quick Trade</h3>
                      <p className="text-[10px] text-gray-400 mb-4">Market order • Direct wallet swap</p>

                      {/* Buy/Sell Toggle */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => setCryptoOrderSide('buy')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            cryptoOrderSide === 'buy'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Buy {selectedMexcPair.base}
                        </button>
                        <button
                          onClick={() => setCryptoOrderSide('sell')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            cryptoOrderSide === 'sell'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          Sell {selectedMexcPair.base}
                        </button>
                      </div>

                      {/* Wallet Balance Display */}
                      {isConnected && (
                        <div className="mb-4 p-2 bg-gray-700/30 rounded-lg text-[11px]">
                          <div className="flex justify-between mb-1">
                            <span className="text-gray-400">Wallet {selectedMexcPair.quote}:</span>
                            <span className="text-white">{walletQuoteBalance.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Wallet {selectedMexcPair.base}:</span>
                            <span className="text-white">{walletBaseBalance.toFixed(4)}</span>
                          </div>
                        </div>
                      )}

                      {/* Amount Input */}
                      <div className="mb-4">
                        <label className="block text-[11px] text-gray-400 mb-1">
                          Amount ({selectedMexcPair.base})
                        </label>
                        <input
                          type="number"
                          value={cryptoOrderAmount}
                          onChange={(e) => setCryptoOrderAmount(e.target.value)}
                          placeholder={`Min: ${selectedMexcPair.minQty}`}
                          min={selectedMexcPair.minQty}
                          step={Math.pow(10, -selectedMexcPair.qtyPrecision)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {isConnected && cryptoOrderSide === 'sell' && walletBaseBalance > 0 && (
                          <button
                            onClick={() => setCryptoOrderAmount(walletBaseBalance.toString())}
                            className="text-[10px] text-blue-400 hover:text-blue-300 mt-1"
                          >
                            Max: {walletBaseBalance.toFixed(selectedMexcPair.qtyPrecision)}
                          </button>
                        )}
                      </div>

                      {/* Order Summary */}
                      <div className="mb-4 p-2 bg-gray-700/50 rounded-lg space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Price</span>
                          <span className="text-white">
                            ${mexcTicker 
                              ? (cryptoOrderSide === 'buy' 
                                  ? (mexcTicker.lastPrice * (1 + MEXC_CONFIG.MARKUP_PERCENT / 100))
                                  : (mexcTicker.lastPrice * (1 - MEXC_CONFIG.MARKUP_PERCENT / 100))
                                ).toFixed(selectedMexcPair.pricePrecision)
                              : '-'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Fee ({MEXC_CONFIG.PLATFORM_FEE_PERCENT}%)</span>
                          <span className="text-yellow-400">
                            ~${((cryptoOrderSide === 'buy' ? estimatedTotal : estimatedReceived) * MEXC_CONFIG.PLATFORM_FEE_PERCENT / (100 + MEXC_CONFIG.PLATFORM_FEE_PERCENT)).toFixed(4)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-gray-600">
                          <span className="text-gray-400">
                            {cryptoOrderSide === 'buy' ? 'You Pay' : 'You Send'}
                          </span>
                          <span className="text-white font-medium">
                            {cryptoOrderSide === 'buy' 
                              ? `~${estimatedTotal.toFixed(4)} ${selectedMexcPair.quote}`
                              : `${cryptoOrderAmount || '0'} ${selectedMexcPair.base}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">You Receive</span>
                          <span className="text-green-400 font-medium">
                            {cryptoOrderSide === 'buy' 
                              ? `~${estimatedReceived.toFixed(selectedMexcPair.qtyPrecision)} ${selectedMexcPair.base}`
                              : `~${estimatedReceived.toFixed(4)} ${selectedMexcPair.quote}`
                            }
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      {!isConnected ? (
                        <div className="p-2 bg-gray-700 rounded-lg text-center">
                          <p className="text-gray-400 text-xs">Connect wallet to trade</p>
                        </div>
                      ) : (
                        <button
                          onClick={handleMexcTrade}
                          disabled={submitting || !cryptoOrderAmount || parseFloat(cryptoOrderAmount) < selectedMexcPair.minQty}
                          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                            cryptoOrderSide === 'buy'
                              ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-600'
                              : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-600'
                          } text-white disabled:cursor-not-allowed`}
                        >
                          {submitting
                            ? 'Processing...'
                            : `${cryptoOrderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedMexcPair.base}`
                          }
                        </button>
                      )}

                      <p className="text-[9px] text-gray-500 mt-2 text-center">
                        Tokens sent directly to/from your wallet
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ SECURITY TOKENS TAB ============ */}
        {activeTab === 'security' && (
          <>
            {!exchangeDeployed && (
              <div className="mb-4 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg inline-block">
                <span className="text-yellow-400 text-sm">⚠️ Security Exchange not deployed yet</span>
              </div>
            )}

            {loadingSecurityTokens && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Loading security tokens...</p>
                </div>
              </div>
            )}

            {!loadingSecurityTokens && tradableTokens.length === 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-xl font-bold text-white mb-2">No Security Tokens</h2>
                <p className="text-gray-400 mb-6">
                  There are no security tokens available for trading yet. Tokens become tradable once their projects are active or funded.
                </p>
              </div>
            )}

            {!loadingSecurityTokens && tradableTokens.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Token List Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-lg font-semibold text-white">Security Tokens</h3>
                      <p className="text-xs text-gray-400 mt-1">{tradableTokens.length} tokens available</p>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {tradableTokens.map((token) => (
                        <button
                          key={token.address}
                          onClick={() => setSelectedToken(token)}
                          className={`w-full p-4 text-left border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors ${
                            selectedToken?.address === token.address ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">{token.symbol}/USDC</div>
                              <div className="text-xs text-gray-400 truncate max-w-[120px]">{token.projectName}</div>
                            </div>
                            <div className="text-right">
                              {token.lastPrice > 0n ? (
                                <div className="text-white text-sm">{formatPrice(token.lastPrice)}</div>
                              ) : (
                                <div className="text-gray-500 text-sm">-</div>
                              )}
                              <div className={`text-xs ${token.hasTradingPair ? 'text-green-400' : 'text-yellow-400'}`}>
                                {token.hasTradingPair ? 'Active' : 'New'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              token.status === 2 ? 'bg-blue-500/20 text-blue-400' :
                              token.status === 3 ? 'bg-green-500/20 text-green-400' :
                              token.status === 4 ? 'bg-purple-500/20 text-purple-400' :
                              'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {STATUS_LABELS[token.status]}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Trading Area */}
                <div className="lg:col-span-3">
                  {!selectedToken ? (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
                      <div className="text-5xl mb-4">👈</div>
                      <h2 className="text-xl font-bold text-white mb-2">Select a Token</h2>
                      <p className="text-gray-400">Choose a security token from the list to start trading</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Market Info Header */}
                      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-white">{selectedToken.symbol}/USDC</h2>
                            <p className="text-gray-400">{selectedToken.projectName}</p>
                            <a
                              href={`${EXPLORER_URL}/address/${selectedToken.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              {selectedToken.address.slice(0, 10)}...{selectedToken.address.slice(-8)}
                            </a>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-white">
                              {securityTradingPair && securityTradingPair.lastPrice > 0n
                                ? formatPrice(securityTradingPair.lastPrice)
                                : '-'
                              }
                            </p>
                            <p className="text-sm text-gray-400">Last Price</p>
                          </div>
                        </div>

                        {securityTradingPair && (
                          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                            <div>
                              <p className="text-xs text-gray-400">24h High</p>
                              <p className="text-green-400 font-medium">
                                {securityTradingPair.highPrice24h > 0n ? formatPrice(securityTradingPair.highPrice24h) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">24h Low</p>
                              <p className="text-red-400 font-medium">
                                {securityTradingPair.lowPrice24h < BigInt(2) ** BigInt(200)
                                  ? formatPrice(securityTradingPair.lowPrice24h)
                                  : '-'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">24h Volume</p>
                              <p className="text-white font-medium">{formatUSDC(securityTradingPair.totalVolume)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400">Orders</p>
                              <p className="text-white font-medium">{securityTradingPair.orderCount.toString()}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Order Book */}
                        <div className="lg:col-span-2">
                          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-700">
                              <h3 className="text-lg font-semibold text-white">Order Book</h3>
                            </div>

                            {!exchangeDeployed || !selectedToken.hasTradingPair ? (
                              <div className="p-8 text-center">
                                <p className="text-gray-400">
                                  {!exchangeDeployed ? 'Exchange contract not deployed' : 'Trading pair not created yet'}
                                </p>
                              </div>
                            ) : loadingSecurityOrderBook ? (
                              <div className="p-8 text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 divide-x divide-gray-700">
                                {/* Buy Orders */}
                                <div>
                                  <div className="p-2 bg-gray-900/50 text-xs text-gray-400 grid grid-cols-3 font-medium">
                                    <span>Price</span>
                                    <span className="text-right">Amount</span>
                                    <span className="text-right">Total</span>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    {buyOrders.filter(o => o.status === 0 || o.status === 2).length > 0 ? (
                                      buyOrders.filter(o => o.status === 0 || o.status === 2).map((order) => (
                                        <div
                                          key={order.id.toString()}
                                          className="p-2 text-sm grid grid-cols-3 hover:bg-green-500/10 cursor-pointer border-b border-gray-700/30"
                                          onClick={() => {
                                            setSecurityOrderSide('sell');
                                            setSecurityOrderPrice(formatUnits(order.price, 6));
                                          }}
                                        >
                                          <span className="text-green-400 font-medium">{formatPrice(order.price)}</span>
                                          <span className="text-right text-white">
                                            {Number(formatAmount(order.amount - order.filled)).toFixed(2)}
                                          </span>
                                          <span className="text-right text-gray-400 text-xs">
                                            {formatUSDC((order.price * (order.amount - order.filled)) / BigInt(1e18))}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="p-4 text-center text-gray-500 text-sm">No buy orders</p>
                                    )}
                                  </div>
                                </div>

                                {/* Sell Orders */}
                                <div>
                                  <div className="p-2 bg-gray-900/50 text-xs text-gray-400 grid grid-cols-3 font-medium">
                                    <span>Price</span>
                                    <span className="text-right">Amount</span>
                                    <span className="text-right">Total</span>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    {sellOrders.filter(o => o.status === 0 || o.status === 2).length > 0 ? (
                                      sellOrders.filter(o => o.status === 0 || o.status === 2).map((order) => (
                                        <div
                                          key={order.id.toString()}
                                          className="p-2 text-sm grid grid-cols-3 hover:bg-red-500/10 cursor-pointer border-b border-gray-700/30"
                                          onClick={() => {
                                            setSecurityOrderSide('buy');
                                            setSecurityOrderPrice(formatUnits(order.price, 6));
                                          }}
                                        >
                                          <span className="text-red-400 font-medium">{formatPrice(order.price)}</span>
                                          <span className="text-right text-white">
                                            {Number(formatAmount(order.amount - order.filled)).toFixed(2)}
                                          </span>
                                          <span className="text-right text-gray-400 text-xs">
                                            {formatUSDC((order.price * (order.amount - order.filled)) / BigInt(1e18))}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="p-4 text-center text-gray-500 text-sm">No sell orders</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Form */}
                        <div>
                          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">Place Order</h3>

                            <div className="flex gap-2 mb-4">
                              <button
                                onClick={() => setSecurityOrderSide('buy')}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
                                  securityOrderSide === 'buy'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                              >
                                Buy
                              </button>
                              <button
                                onClick={() => setSecurityOrderSide('sell')}
                                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
                                  securityOrderSide === 'sell'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                              >
                                Sell
                              </button>
                            </div>

                            {isConnected && (
                              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg text-sm">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-400">USDC Balance:</span>
                                  <span className="text-white">{formatUSDC(userUsdcBalance)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{selectedToken.symbol} Balance:</span>
                                  <span className="text-white">{Number(formatAmount(userTokenBalance)).toFixed(4)}</span>
                                </div>
                              </div>
                            )}

                            <div className="mb-4">
                              <label className="block text-sm text-gray-400 mb-2">Price (USDC)</label>
                              <input
                                type="number"
                                value={securityOrderPrice}
                                onChange={(e) => setSecurityOrderPrice(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <div className="mb-4">
                              <label className="block text-sm text-gray-400 mb-2">Amount ({selectedToken.symbol})</label>
                              <input
                                type="number"
                                value={securityOrderAmount}
                                onChange={(e) => setSecurityOrderAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                              />
                              {isConnected && securityOrderSide === 'sell' && (
                                <button
                                  onClick={() => setSecurityOrderAmount(formatAmount(userTokenBalance))}
                                  className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                                >
                                  Max: {Number(formatAmount(userTokenBalance)).toFixed(4)}
                                </button>
                              )}
                            </div>

                            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Total</span>
                                <span className="text-white font-medium">
                                  ${((parseFloat(securityOrderPrice) || 0) * (parseFloat(securityOrderAmount) || 0)).toFixed(2)} USDC
                                </span>
                              </div>
                            </div>

                            {!exchangeDeployed ? (
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                                <p className="text-yellow-400 text-sm">Exchange not deployed</p>
                              </div>
                            ) : !isConnected ? (
                              <div className="p-3 bg-gray-700 rounded-lg text-center">
                                <p className="text-gray-400">Connect wallet to trade</p>
                              </div>
                            ) : !selectedToken.hasTradingPair ? (
                              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                                <p className="text-yellow-400 text-sm">Trading pair not active</p>
                              </div>
                            ) : (
                              <button
                                onClick={handleSubmitSecurityOrder}
                                disabled={submitting || !securityOrderPrice || !securityOrderAmount}
                                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                                  securityOrderSide === 'buy'
                                    ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-600'
                                    : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-600'
                                } text-white disabled:cursor-not-allowed`}
                              >
                                {submitting
                                  ? 'Placing Order...'
                                  : `${securityOrderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedToken.symbol}`
                                }
                              </button>
                            )}
                          </div>

                          {/* User's Open Orders */}
                          {isConnected && (
                            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mt-4">
                              <h3 className="text-sm font-semibold text-white mb-3">Your Open Orders</h3>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {[...buyOrders, ...sellOrders]
                                  .filter(o => o.trader.toLowerCase() === address?.toLowerCase() && (o.status === 0 || o.status === 2))
                                  .map((order) => (
                                    <div key={order.id.toString()} className="p-2 bg-gray-700/50 rounded-lg text-sm">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className={`font-medium ${order.side === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {order.side === 0 ? 'BUY' : 'SELL'}
                                        </span>
                                        <button
                                          onClick={() => handleCancelSecurityOrder(order.id)}
                                          className="text-xs text-red-400 hover:text-red-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      <div className="text-gray-300 text-xs">
                                        {Number(formatAmount(order.amount - order.filled)).toFixed(2)} @ {formatPrice(order.price)}
                                      </div>
                                    </div>
                                  ))}
                                {[...buyOrders, ...sellOrders].filter(
                                  o => o.trader.toLowerCase() === address?.toLowerCase() && (o.status === 0 || o.status === 2)
                                ).length === 0 && (
                                  <p className="text-center text-gray-500 text-xs py-2">No open orders</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
