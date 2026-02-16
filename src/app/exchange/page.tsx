// src/app/exchange/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import Header from '@/components/Header';
import { CONTRACTS, EXPLORER_URL } from '@/config/contracts';
import { RWAProjectNFTABI, RWASecurityTokenABI, RWASecurityExchangeABI, ERC20ABI } from '@/config/abis';

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'),
});

const EXCHANGE_ADDRESS = (CONTRACTS as any).RWASecurityExchange as `0x${string}` || '0x0000000000000000000000000000000000000000' as `0x${string}`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Tradable statuses: Active (2), Funded (3), InProgress (4), Completed (5)
const TRADABLE_STATUSES = [2, 3, 4, 5];

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

interface Order {
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

interface TradingPair {
  securityToken: string;
  paymentToken: string;
  active: boolean;
  totalVolume: bigint;
  lastPrice: bigint;
  highPrice24h: bigint;
  lowPrice24h: bigint;
  orderCount: bigint;
}

const STATUS_LABELS = ['Draft', 'Pending', 'Active', 'Funded', 'In Progress', 'Completed', 'Cancelled', 'Failed'];

// Extended Exchange ABI for functions not in central file
const ExtendedExchangeABI = [
  ...RWASecurityExchangeABI,
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'getTradingPair', outputs: [{ type: 'tuple', components: [{ name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'active', type: 'bool' }, { name: 'totalVolume', type: 'uint256' }, { name: 'lastPrice', type: 'uint256' }, { name: 'highPrice24h', type: 'uint256' }, { name: 'lowPrice24h', type: 'uint256' }, { name: 'orderCount', type: 'uint256' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }], name: 'validPairs', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_limit', type: 'uint256' }], name: 'getOrderBook', outputs: [{ name: 'buyOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }, { name: 'sellOrderList', type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'trader', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'side', type: 'uint8' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'filled', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'status', type: 'uint8' }] }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_securityToken', type: 'address' }, { name: '_paymentToken', type: 'address' }, { name: '_side', type: 'uint8' }, { name: '_price', type: 'uint256' }, { name: '_amount', type: 'uint256' }, { name: '_expiresAt', type: 'uint256' }], name: 'createOrder', outputs: [{ name: 'orderId', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function' },
] as const;

export default function ExchangePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [tradableTokens, setTradableTokens] = useState<TradableToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<TradableToken | null>(null);
  const [tradingPair, setTradingPair] = useState<TradingPair | null>(null);
  const [buyOrders, setBuyOrders] = useState<Order[]>([]);
  const [sellOrders, setSellOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrderBook, setLoadingOrderBook] = useState(false);

  // User balances
  const [userTokenBalance, setUserTokenBalance] = useState<bigint>(0n);
  const [userUsdcBalance, setUserUsdcBalance] = useState<bigint>(0n);

  // Order form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load tradable tokens from projects
  useEffect(() => {
    const loadTradableTokens = async () => {
      try {
        setLoading(true);

        if (!CONTRACTS.RWAProjectNFT) {
          setTradableTokens([]);
          setLoading(false);
          return;
        }

        const total = await publicClient.readContract({
          address: CONTRACTS.RWAProjectNFT as `0x${string}`,
          abi: RWAProjectNFTABI,
          functionName: 'totalProjects',
        });

        if (total === 0n) {
          setTradableTokens([]);
          setLoading(false);
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
                  const typedPair = pair as unknown as TradingPair;
                  lastPrice = typedPair.lastPrice;
                  volume24h = typedPair.totalVolume;
                }
              } catch {
                // Exchange not deployed or error
              }
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
        setLoading(false);
      }
    };

    loadTradableTokens();
  }, []);

  // Load order book when token selected
  useEffect(() => {
    if (!selectedToken || EXCHANGE_ADDRESS === ZERO_ADDRESS) return;

    const loadOrderBook = async () => {
      try {
        setLoadingOrderBook(true);

        const [buyOrderList, sellOrderList] = await publicClient.readContract({
          address: EXCHANGE_ADDRESS,
          abi: ExtendedExchangeABI,
          functionName: 'getOrderBook',
          args: [selectedToken.address as `0x${string}`, BigInt(50)],
        });

        setBuyOrders(buyOrderList as unknown as Order[]);
        setSellOrders(sellOrderList as unknown as Order[]);

        const pair = await publicClient.readContract({
          address: EXCHANGE_ADDRESS,
          abi: ExtendedExchangeABI,
          functionName: 'getTradingPair',
          args: [selectedToken.address as `0x${string}`, CONTRACTS.USDC as `0x${string}`],
        });

        setTradingPair(pair as unknown as TradingPair);
      } catch (err) {
        console.error('Error loading order book:', err);
      } finally {
        setLoadingOrderBook(false);
      }
    };

    loadOrderBook();
    const interval = setInterval(loadOrderBook, 10000);
    return () => clearInterval(interval);
  }, [selectedToken]);

  // Load user balances
  useEffect(() => {
    if (!address || !selectedToken) return;

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
  }, [address, selectedToken]);

  const handleSubmitOrder = async () => {
    if (!selectedToken || !orderPrice || !orderAmount || !isConnected || !address) return;

    setSubmitting(true);
    setError('');

    try {
      const price = parseUnits(orderPrice, 6);
      const amount = parseUnits(orderAmount, 18);
      const side = orderSide === 'buy' ? 0 : 1;
      const totalCost = (price * amount) / BigInt(1e18);

      if (orderSide === 'buy') {
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

      setOrderPrice('');
      setOrderAmount('');
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.shortMessage || err.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: bigint) => {
    try {
      await writeContractAsync({
        address: EXCHANGE_ADDRESS,
        abi: RWASecurityExchangeABI,
        functionName: 'cancelOrder',
        args: [orderId],
      });
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };

  const formatPrice = (price: bigint) => `$${formatUnits(price, 6)}`;
  const formatAmount = (amount: bigint) => formatUnits(amount, 18);
  const formatUSDC = (amount: bigint) => `$${(Number(amount) / 1e6).toLocaleString()}`;

  const exchangeDeployed = EXCHANGE_ADDRESS !== ZERO_ADDRESS;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Security Token Exchange</h1>
            <p className="text-gray-400 mt-1">Trade tokenized real-world assets</p>
          </div>
          {!exchangeDeployed && (
            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <span className="text-yellow-400 text-sm">Exchange not deployed yet</span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading tradable tokens...</p>
            </div>
          </div>
        )}

        {!loading && tradableTokens.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">No Tradable Tokens</h2>
            <p className="text-gray-400 mb-6">There are no security tokens available for trading yet. Tokens become tradable once their projects are active or funded.</p>
          </div>
        )}

        {!loading && tradableTokens.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Token List Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-white">Markets</h3>
                  <p className="text-xs text-gray-400 mt-1">{tradableTokens.length} tokens available</p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {tradableTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => setSelectedToken(token)}
                      className={`w-full p-4 text-left border-b border-gray-700/50 hover:bg-gray-700/50 transition-colors ${selectedToken?.address === token.address ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{token.symbol}/USDC</div>
                          <div className="text-xs text-gray-400 truncate max-w-[120px]">{token.projectName}</div>
                        </div>
                        <div className="text-right">
                          {token.lastPrice > 0n ? <div className="text-white text-sm">{formatPrice(token.lastPrice)}</div> : <div className="text-gray-500 text-sm">-</div>}
                          <div className={`text-xs ${token.hasTradingPair ? 'text-green-400' : 'text-yellow-400'}`}>{token.hasTradingPair ? 'Active' : 'New'}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${token.status === 2 ? 'bg-blue-500/20 text-blue-400' : token.status === 3 ? 'bg-green-500/20 text-green-400' : token.status === 4 ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
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
                        <a href={`${EXPLORER_URL}/address/${selectedToken.address}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                          {selectedToken.address.slice(0, 10)}...{selectedToken.address.slice(-8)}
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">{tradingPair && tradingPair.lastPrice > 0n ? formatPrice(tradingPair.lastPrice) : '-'}</p>
                        <p className="text-sm text-gray-400">Last Price</p>
                      </div>
                    </div>
                    
                    {tradingPair && (
                      <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
                        <div>
                          <p className="text-xs text-gray-400">24h High</p>
                          <p className="text-green-400 font-medium">{tradingPair.highPrice24h > 0n ? formatPrice(tradingPair.highPrice24h) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">24h Low</p>
                          <p className="text-red-400 font-medium">{tradingPair.lowPrice24h < BigInt(2) ** BigInt(200) ? formatPrice(tradingPair.lowPrice24h) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">24h Volume</p>
                          <p className="text-white font-medium">{formatUSDC(tradingPair.totalVolume)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Orders</p>
                          <p className="text-white font-medium">{tradingPair.orderCount.toString()}</p>
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
                            <p className="text-gray-400">{!exchangeDeployed ? 'Exchange contract not deployed' : 'Trading pair not created yet'}</p>
                          </div>
                        ) : loadingOrderBook ? (
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
                                    <div key={order.id.toString()} className="p-2 text-sm grid grid-cols-3 hover:bg-green-500/10 cursor-pointer border-b border-gray-700/30" onClick={() => { setOrderSide('sell'); setOrderPrice(formatUnits(order.price, 6)); }}>
                                      <span className="text-green-400 font-medium">{formatPrice(order.price)}</span>
                                      <span className="text-right text-white">{Number(formatAmount(order.amount - order.filled)).toFixed(2)}</span>
                                      <span className="text-right text-gray-400 text-xs">{formatUSDC((order.price * (order.amount - order.filled)) / BigInt(1e18))}</span>
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
                                    <div key={order.id.toString()} className="p-2 text-sm grid grid-cols-3 hover:bg-red-500/10 cursor-pointer border-b border-gray-700/30" onClick={() => { setOrderSide('buy'); setOrderPrice(formatUnits(order.price, 6)); }}>
                                      <span className="text-red-400 font-medium">{formatPrice(order.price)}</span>
                                      <span className="text-right text-white">{Number(formatAmount(order.amount - order.filled)).toFixed(2)}</span>
                                      <span className="text-right text-gray-400 text-xs">{formatUSDC((order.price * (order.amount - order.filled)) / BigInt(1e18))}</span>
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
                          <button onClick={() => setOrderSide('buy')} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${orderSide === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>Buy</button>
                          <button onClick={() => setOrderSide('sell')} className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${orderSide === 'sell' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>Sell</button>
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
                          <input type="number" value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} placeholder="0.00" step="0.01" min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
                        </div>

                        <div className="mb-4">
                          <label className="block text-sm text-gray-400 mb-2">Amount ({selectedToken.symbol})</label>
                          <input type="number" value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)} placeholder="0.00" step="0.01" min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none" />
                          {isConnected && orderSide === 'sell' && (
                            <button onClick={() => setOrderAmount(formatAmount(userTokenBalance))} className="text-xs text-blue-400 hover:text-blue-300 mt-1">Max: {Number(formatAmount(userTokenBalance)).toFixed(4)}</button>
                          )}
                        </div>

                        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total</span>
                            <span className="text-white font-medium">${((parseFloat(orderPrice) || 0) * (parseFloat(orderAmount) || 0)).toFixed(2)} USDC</span>
                          </div>
                        </div>

                        {error && (
                          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                          </div>
                        )}

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
                          <button onClick={handleSubmitOrder} disabled={submitting || !orderPrice || !orderAmount} className={`w-full py-3 rounded-lg font-semibold transition-colors ${orderSide === 'buy' ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-600' : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-600'} text-white disabled:cursor-not-allowed`}>
                            {submitting ? 'Placing Order...' : `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${selectedToken.symbol}`}
                          </button>
                        )}
                      </div>

                      {isConnected && (
                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mt-4">
                          <h3 className="text-sm font-semibold text-white mb-3">Your Open Orders</h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {[...buyOrders, ...sellOrders].filter(o => o.trader.toLowerCase() === address?.toLowerCase() && (o.status === 0 || o.status === 2)).map((order) => (
                              <div key={order.id.toString()} className="p-2 bg-gray-700/50 rounded-lg text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-medium ${order.side === 0 ? 'text-green-400' : 'text-red-400'}`}>{order.side === 0 ? 'BUY' : 'SELL'}</span>
                                  <button onClick={() => handleCancelOrder(order.id)} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
                                </div>
                                <div className="text-gray-300 text-xs">{Number(formatAmount(order.amount - order.filled)).toFixed(2)} @ {formatPrice(order.price)}</div>
                              </div>
                            ))}
                            {[...buyOrders, ...sellOrders].filter(o => o.trader.toLowerCase() === address?.toLowerCase() && (o.status === 0 || o.status === 2)).length === 0 && (
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
      </main>
    </div>
  );
}
