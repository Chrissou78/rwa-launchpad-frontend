// src/lib/priceService.ts
import { CHAINS, type SupportedChainId } from "@/config/chains";

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache: Record<string, PriceCache> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute

// CoinGecko IDs for native tokens
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  CRO: "crypto-com-chain",
  tCRO: "crypto-com-chain",
  tBNB: "binancecoin",
};

export async function getNativeTokenPrice(chainId: SupportedChainId): Promise<number> {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const symbol = chain.nativeCurrency;
  const coingeckoId = COINGECKO_IDS[symbol];
  
  if (!coingeckoId) {
    console.warn(`No CoinGecko ID for ${symbol}, using fallback price`);
    return getFallbackPrice(symbol);
  }

  // Check cache
  const cached = priceCache[coingeckoId];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data[coingeckoId]?.usd;

    if (!price) {
      throw new Error(`No price data for ${coingeckoId}`);
    }

    // Cache the price
    priceCache[coingeckoId] = { price, timestamp: Date.now() };
    
    console.log(`[Price] ${symbol} = $${price}`);
    return price;

  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return getFallbackPrice(symbol);
  }
}

function getFallbackPrice(symbol: string): number {
  // Fallback prices in case API fails
  const fallbacks: Record<string, number> = {
    ETH: 3000,
    MATIC: 0.50,
    AVAX: 35,
    BNB: 300,
    CRO: 0.10,
    tCRO: 0.10,
    tBNB: 300,
  };
  return fallbacks[symbol] || 1;
}

export async function calculateNativeAmountForUSD(
  chainId: SupportedChainId,
  usdAmount: number
): Promise<{ amount: bigint; price: number; formatted: string }> {
  const price = await getNativeTokenPrice(chainId);
  const nativeAmount = usdAmount / price;
  
  // Convert to wei (18 decimals)
  const amountWei = BigInt(Math.ceil(nativeAmount * 1e18));
  
  return {
    amount: amountWei,
    price,
    formatted: nativeAmount.toFixed(6),
  };
}

export const KYC_FEE_USD = 5; // $5 fee
