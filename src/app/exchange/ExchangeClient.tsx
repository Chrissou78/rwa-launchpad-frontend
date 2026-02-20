// src/app/exchange/ExchangeClient.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import Header from '@/components/Header';
import { ZERO_ADDRESS } from '@/config/contracts';
import { useChainConfig } from '@/hooks/useChainConfig';
import {RWAProjectNFTABI, RWASecurityTokenABI, RWASecurityExchangeABI, ERC20ABI} from '@/config/abis';

// Tradable statuses for security tokens
const TRADABLE_STATUSES = [2, 3, 4]; // Funded, Distributing, Active

// MEXC API configuration
const MEXC_CONFIG = {
  tradingFee: 0.001, // 0.1% MEXC fee
  platformMarkup: 0.005, // 0.5% platform markup
  platformFee: 0.01, // 1% total platform fee
  supportedPairs: ['AVAXUSDT', 'BTCUSDT', 'ETHUSDT'],
  refreshInterval: 10000, // 10 seconds
};

// Token icons mapping
const TOKEN_ICONS: Record<string, string> = {
  AVAX: '🔺',
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '💵',
  USDC: '💵',
  MATIC: '🟣',
  POL: '🟣',
};

// Types for MEXC data
interface MexcPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface MexcOrderBook {
  bids: [string, string][];
  asks: [string, string][];
  timestamp: number;
}

interface MexcTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

// Types for security token exchange
interface SecurityOrder {
  orderId: bigint;
  trader: Address;
  tokenAddress: Address;
  isBuy: boolean;
  price: bigint;
  amount: bigint;
  filled: bigint;
  timestamp: bigint;
  status: number;
}

interface TradingPair {
  token: Address;
  isActive: boolean;
  minOrderSize: bigint;
  maxOrderSize: bigint;
  priceDecimals: number;
}

interface TokenBalance {
  address: Address;
  symbol: string;
  balance: bigint;
  decimals: number;
}

interface SecurityTokenData {
  address: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  tradingPair: TradingPair | null;
  orderBook: {
    bids: SecurityOrder[];
    asks: SecurityOrder[];
  };
}

// Extended exchange ABI with additional view functions
const ExtendedExchangeABI = [
  ...RWASecurityExchangeABI,
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getTradingPair',
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'isActive', type: 'bool' },
      { name: 'minOrderSize', type: 'uint256' },
      { name: 'maxOrderSize', type: 'uint256' },
      { name: 'priceDecimals', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'validPairs',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getOrderBook',
    outputs: [
      { name: 'bids', type: 'tuple[]', components: [
        { name: 'orderId', type: 'uint256' },
        { name: 'trader', type: 'address' },
        { name: 'tokenAddress', type: 'address' },
        { name: 'isBuy', type: 'bool' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'filled', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'status', type: 'uint8' },
      ]},
      { name: 'asks', type: 'tuple[]', components: [
        { name: 'orderId', type: 'uint256' },
        { name: 'trader', type: 'address' },
        { name: 'tokenAddress', type: 'address' },
        { name: 'isBuy', type: 'bool' },
        { name: 'price', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'filled', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'status', type: 'uint8' },
      ]},
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'isBuy', type: 'bool' },
      { name: 'price', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'createOrder',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export default function ExchangeClient() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const walletChainId = useChainId();
  
  // Multichain config
  const {
    chainId,
    chainName,
    contracts,
    tokens,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains,
  } = useChainConfig();

  // Dynamic contract addresses
  const exchangeAddress = contracts?.RWASecurityExchange as Address | undefined;
  const projectNFTAddress = contracts?.RWAProjectNFT as Address | undefined;
  const usdcAddress = tokens?.USDC as Address | undefined;
  const usdtAddress = tokens?.USDT as Address | undefined;
  const platformWallet = contracts?.PlatformWallet as Address | undefined;

  // Check if on wrong chain
  const isWrongChain = useMemo(() => {
    if (!isConnected) return false;
    return walletChainId !== chainId;
  }, [isConnected, walletChainId, chainId]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'crypto' | 'security'>('crypto');
  
  // Deposit/Withdraw modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositToken, setDepositToken] = useState<'native' | 'USDT' | 'USDC'>('native');
  const [depositAmount, setDepositAmount] = useState('');
  
  // MEXC state
  const [selectedMexcPair, setSelectedMexcPair] = useState('AVAXUSDT');
  const [mexcOrderBook, setMexcOrderBook] = useState<MexcOrderBook | null>(null);
  const [mexcTicker, setMexcTicker] = useState<MexcTicker | null>(null);
  const [mexcTickers, setMexcTickers] = useState<Record<string, MexcTicker>>({});
  const [mexcLoading, setMexcLoading] = useState(true);
  const [walletBalances, setWalletBalances] = useState<Record<string, bigint>>({});
  
  // MEXC order form
  const [mexcOrderSide, setMexcOrderSide] = useState<'buy' | 'sell'>('buy');
  const [mexcOrderAmount, setMexcOrderAmount] = useState('');
  const [mexcOrderSubmitting, setMexcOrderSubmitting] = useState(false);
  
  // Security token state
  const [securityTokens, setSecurityTokens] = useState<SecurityTokenData[]>([]);
  const [selectedSecurityToken, setSelectedSecurityToken] = useState<SecurityTokenData | null>(null);
  const [securityTokenLoading, setSecurityTokenLoading] = useState(true);
  const [userTokenBalances, setUserTokenBalances] = useState<TokenBalance[]>([]);
  const [userUsdcBalance, setUserUsdcBalance] = useState<bigint>(BigInt(0));
  
  // Security order form
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  
  // Transaction state
  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Network switch handler
  const handleSwitchNetwork = useCallback(async (targetChainId?: number) => {
    try {
      await switchToChain(targetChainId);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  }, [switchToChain]);

  // Fetch MEXC order book
  const fetchMexcOrderBook = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/exchange/mexc/orderbook?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setMexcOrderBook(data);
      }
    } catch (error) {
      console.error('Error fetching MEXC order book:', error);
    }
  }, []);

  // Fetch MEXC ticker
  const fetchMexcTicker = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/exchange/mexc/ticker?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        setMexcTicker(data);
      }
    } catch (error) {
      console.error('Error fetching MEXC ticker:', error);
    }
  }, []);

  // Fetch all MEXC tickers
  const fetchAllMexcTickers = useCallback(async () => {
    try {
      const tickersData: Record<string, MexcTicker> = {};
      for (const pair of MEXC_CONFIG.supportedPairs) {
        const response = await fetch(`/api/exchange/mexc/ticker?symbol=${pair}`);
        if (response.ok) {
          const data = await response.json();
          tickersData[pair] = data;
        }
      }
      setMexcTickers(tickersData);
      setMexcLoading(false);
    } catch (error) {
      console.error('Error fetching MEXC tickers:', error);
      setMexcLoading(false);
    }
  }, []);

  // Load wallet balances
  const loadWalletBalances = useCallback(async () => {
    if (!publicClient || !address) return;
    
    try {
      // Get native balance
      const nativeBalance = await publicClient.getBalance({ address });
      
      const balances: Record<string, bigint> = {
        [nativeCurrency?.symbol || 'NATIVE']: nativeBalance,
      };
      
      // Get USDT balance if available
      if (usdtAddress && usdtAddress !== ZERO_ADDRESS) {
        try {
          const usdtBalance = await publicClient.readContract({
            address: usdtAddress,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
          }) as bigint;
          balances['USDT'] = usdtBalance;
        } catch (e) {
          console.error('Error loading USDT balance:', e);
        }
      }

      // Get USDC balance if available
      if (usdcAddress && usdcAddress !== ZERO_ADDRESS) {
        try {
          const usdcBalance = await publicClient.readContract({
            address: usdcAddress,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [address],
          }) as bigint;
          balances['USDC'] = usdcBalance;
        } catch (e) {
          console.error('Error loading USDC balance:', e);
        }
      }
      
      setWalletBalances(balances);
    } catch (error) {
      console.error('Error loading wallet balances:', error);
    }
  }, [publicClient, address, usdtAddress, usdcAddress, nativeCurrency?.symbol]);

  // Load user security token balances
  const loadUserBalances = useCallback(async () => {
    if (!publicClient || !address || !usdcAddress) return;
    
    try {
      // Get USDC balance
      const usdcBal = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;
      setUserUsdcBalance(usdcBal);
      
      // Get security token balances
      const tokenBalances: TokenBalance[] = [];
      for (const token of securityTokens) {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: RWASecurityTokenABI,
            functionName: 'balanceOf',
            args: [address],
          }) as bigint;
          
          tokenBalances.push({
            address: token.address,
            symbol: token.symbol,
            balance,
            decimals: 18,
          });
        } catch (e) {
          console.error(`Error loading balance for ${token.symbol}:`, e);
        }
      }
      setUserTokenBalances(tokenBalances);
    } catch (error) {
      console.error('Error loading user balances:', error);
    }
  }, [publicClient, address, usdcAddress, securityTokens]);

  // Load security tokens from projects
  const loadSecurityTokens = useCallback(async () => {
    if (!publicClient || !projectNFTAddress || !exchangeAddress || !isDeployed) {
      setSecurityTokenLoading(false);
      return;
    }
    
    setSecurityTokenLoading(true);
    
    try {
      // Get total projects
      const totalProjects = await publicClient.readContract({
        address: projectNFTAddress,
        abi: RWAProjectNFTABI,
        functionName: 'totalProjects',
      }) as bigint;
      
      const tokens: SecurityTokenData[] = [];
      
      for (let i = 1; i <= Number(totalProjects); i++) {
        try {
          const project = await publicClient.readContract({
            address: projectNFTAddress,
            abi: RWAProjectNFTABI,
            functionName: 'getProject',
            args: [BigInt(i)],
          }) as any;
          
          // Only include funded/distributing/active projects with security tokens
          if (!TRADABLE_STATUSES.includes(Number(project.status)) || 
              project.securityToken === ZERO_ADDRESS) {
            continue;
          }
          
          // Get token info
          const [name, symbol, totalSupply] = await Promise.all([
            publicClient.readContract({
              address: project.securityToken,
              abi: RWASecurityTokenABI,
              functionName: 'name',
            }),
            publicClient.readContract({
              address: project.securityToken,
              abi: RWASecurityTokenABI,
              functionName: 'symbol',
            }),
            publicClient.readContract({
              address: project.securityToken,
              abi: RWASecurityTokenABI,
              functionName: 'totalSupply',
            }),
          ]);
          
          // Check if trading pair exists
          let tradingPair: TradingPair | null = null;
          try {
            const pairData = await publicClient.readContract({
              address: exchangeAddress,
              abi: ExtendedExchangeABI,
              functionName: 'getTradingPair',
              args: [project.securityToken],
            }) as any;
            
            if (pairData && pairData.isActive) {
              tradingPair = {
                token: pairData.token,
                isActive: pairData.isActive,
                minOrderSize: pairData.minOrderSize,
                maxOrderSize: pairData.maxOrderSize,
                priceDecimals: pairData.priceDecimals,
              };
            }
          } catch (e) {
            // Trading pair may not exist
          }
          
          tokens.push({
            address: project.securityToken,
            name: name as string,
            symbol: symbol as string,
            totalSupply: totalSupply as bigint,
            tradingPair,
            orderBook: { bids: [], asks: [] },
          });
        } catch (e) {
          console.error(`Error loading project ${i}:`, e);
        }
      }
      
      setSecurityTokens(tokens);
      if (tokens.length > 0 && !selectedSecurityToken) {
        setSelectedSecurityToken(tokens[0]);
      }
    } catch (error) {
      console.error('Error loading security tokens:', error);
    } finally {
      setSecurityTokenLoading(false);
    }
  }, [publicClient, projectNFTAddress, exchangeAddress, isDeployed, selectedSecurityToken]);

  // Load order book for selected security token
  const loadSecurityOrderBook = useCallback(async () => {
    if (!publicClient || !exchangeAddress || !selectedSecurityToken) return;
    
    try {
      const orderBookData = await publicClient.readContract({
        address: exchangeAddress,
        abi: ExtendedExchangeABI,
        functionName: 'getOrderBook',
        args: [selectedSecurityToken.address],
      }) as any;
      
      setSelectedSecurityToken(prev => prev ? {
        ...prev,
        orderBook: {
          bids: orderBookData.bids || [],
          asks: orderBookData.asks || [],
        },
      } : null);
    } catch (error) {
      console.error('Error loading security order book:', error);
    }
  }, [publicClient, exchangeAddress, selectedSecurityToken]);

  // Initial data loading
  useEffect(() => {
    if (isDeployed) {
      fetchAllMexcTickers();
    }
  }, [fetchAllMexcTickers, isDeployed]);

  // MEXC data refresh
  useEffect(() => {
    if (!isDeployed) return;
    
    fetchMexcOrderBook(selectedMexcPair);
    fetchMexcTicker(selectedMexcPair);
    
    const interval = setInterval(() => {
      fetchMexcOrderBook(selectedMexcPair);
      fetchMexcTicker(selectedMexcPair);
      fetchAllMexcTickers();
    }, MEXC_CONFIG.refreshInterval);
    
    return () => clearInterval(interval);
  }, [selectedMexcPair, fetchMexcOrderBook, fetchMexcTicker, fetchAllMexcTickers, isDeployed]);

  // Load wallet balances
  useEffect(() => {
    if (isConnected && isDeployed && !isWrongChain) {
      loadWalletBalances();
    }
  }, [isConnected, isDeployed, isWrongChain, loadWalletBalances]);

  // Load security tokens
  useEffect(() => {
    if (isDeployed && !isWrongChain) {
      loadSecurityTokens();
    }
  }, [loadSecurityTokens, isDeployed, isWrongChain]);

  // Load user balances when security tokens change
  useEffect(() => {
    if (isConnected && securityTokens.length > 0 && !isWrongChain) {
      loadUserBalances();
    }
  }, [isConnected, securityTokens, loadUserBalances, isWrongChain]);

  // Load security order book when token selected
  useEffect(() => {
    if (selectedSecurityToken && !isWrongChain) {
      loadSecurityOrderBook();
    }
  }, [selectedSecurityToken, loadSecurityOrderBook, isWrongChain]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!address || !publicClient || !platformWallet) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      if (depositToken === 'native') {
        const value = parseUnits(depositAmount, nativeCurrency?.decimals || 18);
        writeContract({
          address: platformWallet,
          abi: [{
            inputs: [],
            name: 'deposit',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
          }],
          functionName: 'deposit',
          value,
        });
      } else {
        const tokenAddress = depositToken === 'USDT' ? usdtAddress : usdcAddress;
        if (!tokenAddress) return;
        
        const value = parseUnits(depositAmount, 6);
        writeContract({
          address: tokenAddress,
          abi: ERC20ABI,
          functionName: 'transfer',
          args: [platformWallet, value],
        });
      }
      
      // Record deposit via API
      await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          address,
          action: 'deposit',
          token: depositToken,
          amount: depositAmount,
        }),
      });
      
      setShowDepositModal(false);
      setDepositAmount('');
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!address) return;
    
    try {
      const response = await fetch('/api/exchange/balance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          address,
          action: 'withdraw',
          token: depositToken,
          amount: depositAmount,
        }),
      });
      
      if (response.ok) {
        setShowWithdrawModal(false);
        setDepositAmount('');
        loadWalletBalances();
      }
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  };

  // Handle MEXC trade
  const handleMexcTrade = async () => {
    if (!address || !mexcTicker) return;
    
    setMexcOrderSubmitting(true);
    
    try {
      const response = await fetch('/api/exchange/mexc/trade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-chain-id': chainId.toString(),
        },
        body: JSON.stringify({
          address,
          symbol: selectedMexcPair,
          side: mexcOrderSide,
          amount: mexcOrderAmount,
          price: mexcTicker.lastPrice,
        }),
      });
      
      if (response.ok) {
        setMexcOrderAmount('');
        loadWalletBalances();
      }
    } catch (error) {
      console.error('Trade error:', error);
    } finally {
      setMexcOrderSubmitting(false);
    }
  };

  // Handle security token order submission
  const handleSubmitSecurityOrder = async () => {
    if (!address || !publicClient || !selectedSecurityToken || !exchangeAddress || !usdcAddress) return;
    
    setOrderSubmitting(true);
    setOrderError(null);
    
    try {
      const priceValue = parseUnits(orderPrice, 6); // USDC decimals
      const amountValue = parseUnits(orderAmount, 18); // Token decimals
      
      if (orderSide === 'buy') {
        // Check USDC allowance
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [address, exchangeAddress],
        }) as bigint;
        
        const totalCost = (priceValue * amountValue) / BigInt(10 ** 18);
        
        if (allowance < totalCost) {
          // Approve USDC
          writeContract({
            address: usdcAddress,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [exchangeAddress, totalCost],
          });
          return;
        }
      } else {
        // Check token allowance for sell
        const allowance = await publicClient.readContract({
          address: selectedSecurityToken.address,
          abi: RWASecurityTokenABI,
          functionName: 'allowance',
          args: [address, exchangeAddress],
        }) as bigint;
        
        if (allowance < amountValue) {
          // Approve token
          writeContract({
            address: selectedSecurityToken.address,
            abi: RWASecurityTokenABI,
            functionName: 'approve',
            args: [exchangeAddress, amountValue],
          });
          return;
        }
      }
      
      // Create order
      writeContract({
        address: exchangeAddress,
        abi: ExtendedExchangeABI,
        functionName: 'createOrder',
        args: [
          selectedSecurityToken.address,
          orderSide === 'buy',
          priceValue,
          amountValue,
        ],
      });
      
      setOrderPrice('');
      setOrderAmount('');
    } catch (error: any) {
      setOrderError(error.message || 'Failed to submit order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (orderId: bigint) => {
    if (!exchangeAddress) return;
    
    try {
      writeContract({
        address: exchangeAddress,
        abi: ExtendedExchangeABI,
        functionName: 'cancelOrder',
        args: [orderId],
      });
    } catch (error) {
      console.error('Cancel order error:', error);
    }
  };

  // Helper functions
  const formatPrice = (price: string | number, decimals: number = 4) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatAmount = (amount: string | number | bigint, decimals: number = 2) => {
    if (typeof amount === 'bigint') {
      return parseFloat(formatUnits(amount, 18)).toLocaleString(undefined, { maximumFractionDigits: decimals });
    }
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  const getTokenIcon = (symbol: string) => {
    return TOKEN_ICONS[symbol] || '🪙';
  };

  const getUserTokenBalance = (tokenAddress: Address) => {
    const balance = userTokenBalances.find(b => b.address === tokenAddress);
    return balance?.balance || BigInt(0);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Network not supported view
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-8">
            <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold mb-2">Network Not Supported</h2>
            <p className="text-gray-400 mb-6">
              The Exchange is not deployed on {chainName}. Please switch to a supported network.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {deployedChains.slice(0, 4).map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={isSwitching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {chain.name}
                  {chain.testnet && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wrong chain warning component
  const WrongChainWarning = () => (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-500">Wrong Network</p>
            <p className="text-sm text-gray-400">Please switch to {chainName} to use the exchange</p>
          </div>
        </div>
        <button
          onClick={() => handleSwitchNetwork()}
          disabled={isSwitching}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-medium rounded-lg transition-colors"
        >
          {isSwitching ? 'Switching...' : `Switch to ${chainName}`}
        </button>
      </div>
    </div>
  );

  // Network badge component
  const NetworkBadge = () => (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <span className="text-sm text-gray-400">{chainName}</span>
      {isTestnet && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
          Testnet
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Exchange</h1>
            <p className="text-gray-400 mt-1">Trade crypto and security tokens</p>
          </div>
          <div className="flex items-center gap-4">
            <NetworkBadge />
            {explorerUrl && exchangeAddress && (
              <a
                href={`${explorerUrl}/address/${exchangeAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View Contract →
              </a>
            )}
          </div>
        </div>

        {/* Wrong Chain Warning */}
        {isWrongChain && <WrongChainWarning />}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'crypto'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Crypto Trading
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Security Tokens
          </button>
        </div>

        {/* Crypto Trading Tab */}
        {activeTab === 'crypto' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Market List */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Markets</h3>
              <div className="space-y-2">
                {MEXC_CONFIG.supportedPairs.map((pair) => {
                  const ticker = mexcTickers[pair];
                  const baseAsset = pair.replace('USDT', '');
                  return (
                    <button
                      key={pair}
                      onClick={() => setSelectedMexcPair(pair)}
                      className={`w-full p-3 rounded-lg transition-colors ${
                        selectedMexcPair === pair
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTokenIcon(baseAsset)}</span>
                          <span className="font-medium">{baseAsset}/USDT</span>
                        </div>
                        {ticker && (
                          <div className="text-right">
                            <div className="font-medium">${formatPrice(ticker.lastPrice)}</div>
                            <div className={`text-xs ${
                              parseFloat(ticker.priceChangePercent) >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}>
                              {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}
                              {parseFloat(ticker.priceChangePercent).toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Book */}
            <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4">
              {/* Ticker Header */}
              {mexcTicker && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTokenIcon(selectedMexcPair.replace('USDT', ''))}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedMexcPair.replace('USDT', '/USDT')}</h3>
                      <div className="text-sm text-gray-400">MEXC Market</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${formatPrice(mexcTicker.lastPrice)}</div>
                    <div className={`text-sm ${
                      parseFloat(mexcTicker.priceChangePercent) >= 0
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}>
                      {parseFloat(mexcTicker.priceChangePercent) >= 0 ? '+' : ''}
                      {parseFloat(mexcTicker.priceChangePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Order Book Display */}
              <div className="grid grid-cols-2 gap-4">
                {/* Asks (Sell Orders) */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Asks (Sell)</div>
                  <div className="space-y-1">
                    {mexcOrderBook?.asks.slice(0, 10).reverse().map(([price, amount], i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-red-500">{formatPrice(price)}</span>
                        <span className="text-gray-400">{formatAmount(amount)}</span>
                      </div>
                    ))}
                    {(!mexcOrderBook || mexcOrderBook.asks.length === 0) && (
                      <div className="text-gray-500 text-sm">No sell orders</div>
                    )}
                  </div>
                </div>

                {/* Bids (Buy Orders) */}
                <div>
                  <div className="text-sm text-gray-400 mb-2">Bids (Buy)</div>
                  <div className="space-y-1">
                    {mexcOrderBook?.bids.slice(0, 10).map(([price, amount], i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-green-500">{formatPrice(price)}</span>
                        <span className="text-gray-400">{formatAmount(amount)}</span>
                      </div>
                    ))}
                    {(!mexcOrderBook || mexcOrderBook.bids.length === 0) && (
                      <div className="text-gray-500 text-sm">No buy orders</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Form */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Quick Trade</h3>
              
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect wallet to trade</p>
                </div>
              ) : isWrongChain ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Switch to {chainName} to trade</p>
                </div>
              ) : (
                <>
                  {/* Wallet Balance */}
                  <div className="bg-gray-800 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-400 mb-2">Your Balance</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>{nativeCurrency?.symbol || 'NATIVE'}</span>
                        <span>{formatAmount(walletBalances[nativeCurrency?.symbol || 'NATIVE'] || BigInt(0), 4)}</span>
                      </div>
                      {usdtAddress && (
                        <div className="flex justify-between">
                          <span>USDT</span>
                          <span>{formatUnits(walletBalances['USDT'] || BigInt(0), 6)}</span>
                        </div>
                      )}
                      {usdcAddress && (
                        <div className="flex justify-between">
                          <span>USDC</span>
                          <span>{formatUnits(walletBalances['USDC'] || BigInt(0), 6)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setMexcOrderSide('buy')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        mexcOrderSide === 'buy'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setMexcOrderSide('sell')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        mexcOrderSide === 'sell'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">
                      Amount ({selectedMexcPair.replace('USDT', '')})
                    </label>
                    <input
                      type="number"
                      value={mexcOrderAmount}
                      onChange={(e) => setMexcOrderAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Fee Display */}
                  {mexcOrderAmount && mexcTicker && (
                    <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Price</span>
                        <span>${formatPrice(mexcTicker.lastPrice)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Subtotal</span>
                        <span>${formatPrice(parseFloat(mexcOrderAmount) * parseFloat(mexcTicker.lastPrice), 2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Platform Fee (1%)</span>
                        <span>${formatPrice(parseFloat(mexcOrderAmount) * parseFloat(mexcTicker.lastPrice) * MEXC_CONFIG.platformFee, 2)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-2 border-t border-gray-700">
                        <span>Total</span>
                        <span>${formatPrice(
                          parseFloat(mexcOrderAmount) * parseFloat(mexcTicker.lastPrice) * 
                          (mexcOrderSide === 'buy' ? (1 + MEXC_CONFIG.platformFee) : (1 - MEXC_CONFIG.platformFee)),
                          2
                        )}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleMexcTrade}
                    disabled={!mexcOrderAmount || mexcOrderSubmitting}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      mexcOrderSide === 'buy'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {mexcOrderSubmitting ? 'Processing...' : `${mexcOrderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedMexcPair.replace('USDT', '')}`}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Security Tokens Tab */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Token List */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Security Tokens</h3>
              
              {securityTokenLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-gray-400">Loading...</span>
                </div>
              ) : securityTokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No tradable tokens on {chainName}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {securityTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => setSelectedSecurityToken(token)}
                      className={`w-full p-3 rounded-lg transition-colors text-left ${
                        selectedSecurityToken?.address === token.address
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-sm text-gray-400 truncate">{token.name}</div>
                        </div>
                        {token.tradingPair?.isActive ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                            No Pair
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Order Book */}
            <div className="lg:col-span-2 bg-gray-900 rounded-xl p-4">
              {selectedSecurityToken ? (
                <>
                  {/* Token Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedSecurityToken.symbol}/USDC</h3>
                      <div className="text-sm text-gray-400">{selectedSecurityToken.name}</div>
                    </div>
                    <a
                      href={`${explorerUrl}/token/${selectedSecurityToken.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      View Token →
                    </a>
                  </div>

                  {/* Market Info */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Total Supply</div>
                      <div className="font-medium">{formatAmount(selectedSecurityToken.totalSupply)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Min Order</div>
                      <div className="font-medium">
                        {selectedSecurityToken.tradingPair
                          ? formatAmount(selectedSecurityToken.tradingPair.minOrderSize)
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400">Status</div>
                      <div className="font-medium">
                        {selectedSecurityToken.tradingPair?.isActive ? 'Trading' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  {/* Order Book */}
                  {selectedSecurityToken.tradingPair?.isActive ? (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Asks */}
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Asks (Sell Orders)</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {selectedSecurityToken.orderBook.asks.length > 0 ? (
                            selectedSecurityToken.orderBook.asks.map((order) => (
                              <div key={order.orderId.toString()} className="flex justify-between text-sm bg-red-500/10 rounded px-2 py-1">
                                <span className="text-red-500">${formatUnits(order.price, 6)}</span>
                                <span className="text-gray-400">{formatAmount(order.amount - order.filled)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 text-sm">No sell orders</div>
                          )}
                        </div>
                      </div>

                      {/* Bids */}
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Bids (Buy Orders)</div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {selectedSecurityToken.orderBook.bids.length > 0 ? (
                            selectedSecurityToken.orderBook.bids.map((order) => (
                              <div key={order.orderId.toString()} className="flex justify-between text-sm bg-green-500/10 rounded px-2 py-1">
                                <span className="text-green-500">${formatUnits(order.price, 6)}</span>
                                <span className="text-gray-400">{formatAmount(order.amount - order.filled)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 text-sm">No buy orders</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      Trading pair not active for this token
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  Select a token to view order book
                </div>
              )}
            </div>

            {/* Order Form */}
            <div className="bg-gray-900 rounded-xl p-4">
              <h3 className="font-semibold mb-4">Place Order</h3>
              
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect wallet to trade</p>
                </div>
              ) : isWrongChain ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Switch to {chainName} to trade</p>
                </div>
              ) : !selectedSecurityToken ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Select a token first</p>
                </div>
              ) : !selectedSecurityToken.tradingPair?.isActive ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Trading not available for this token</p>
                </div>
              ) : (
                <>
                  {/* User Balances */}
                  <div className="bg-gray-800 rounded-lg p-3 mb-4">
                    <div className="text-sm text-gray-400 mb-2">Your Balances</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>USDC</span>
                        <span>{formatUnits(userUsdcBalance, 6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{selectedSecurityToken.symbol}</span>
                        <span>{formatAmount(getUserTokenBalance(selectedSecurityToken.address))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buy/Sell Toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setOrderSide('buy')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        orderSide === 'buy'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setOrderSide('sell')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        orderSide === 'sell'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Price Input */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Price (USDC)</label>
                    <input
                      type="number"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Amount ({selectedSecurityToken.symbol})</label>
                    <input
                      type="number"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Order Summary */}
                  {orderPrice && orderAmount && (
                    <div className="bg-gray-800 rounded-lg p-3 mb-4 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Total</span>
                        <span>${(parseFloat(orderPrice) * parseFloat(orderAmount)).toFixed(2)} USDC</span>
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {orderError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-400">{orderError}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitSecurityOrder}
                    disabled={!orderPrice || !orderAmount || orderSubmitting || isWritePending || isTxConfirming}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      orderSide === 'buy'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {orderSubmitting || isWritePending || isTxConfirming
                      ? 'Processing...'
                      : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedSecurityToken.symbol}`}
                  </button>

                  {/* Transaction Status */}
                  {txHash && (
                    <div className="mt-4 text-sm">
                      <a
                        href={`${explorerUrl}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Transaction →
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Deposit Funds</h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Token Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Select Token</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepositToken('native')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      depositToken === 'native'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {nativeCurrency?.symbol || 'NATIVE'}
                  </button>
                  {usdtAddress && (
                    <button
                      onClick={() => setDepositToken('USDT')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        depositToken === 'USDT'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      USDT
                    </button>
                  )}
                  {usdcAddress && (
                    <button
                      onClick={() => setDepositToken('USDC')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        depositToken === 'USDC'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      USDC
                    </button>
                  )}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleDeposit}
                disabled={!depositAmount || isWritePending}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {isWritePending ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Withdraw Funds</h3>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Token Selection */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Select Token</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepositToken('native')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      depositToken === 'native'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {nativeCurrency?.symbol || 'NATIVE'}
                  </button>
                  {usdtAddress && (
                    <button
                      onClick={() => setDepositToken('USDT')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        depositToken === 'USDT'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      USDT
                    </button>
                  )}
                  {usdcAddress && (
                    <button
                      onClick={() => setDepositToken('USDC')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        depositToken === 'USDC'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      USDC
                    </button>
                  )}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Amount</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={!depositAmount}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                Request Withdrawal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
