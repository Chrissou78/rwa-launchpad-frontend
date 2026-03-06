// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits, Chain } from 'viem';
import { avalancheFuji, polygon, polygonAmoy, avalanche, mainnet, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWAProjectNFTABI, RWASecurityTokenABI } from '@/config/abis';

// Chain configurations for server-side use
const CHAIN_CONFIGS: Record<number, {
  chain: Chain;
  rpcUrl: string;
  contracts: {
    RWAProjectNFT?: string;
    OffChainInvestmentManager?: string;
  };
}> = {
  // Avalanche Fuji Testnet
  43113: {
    chain: avalancheFuji,
    rpcUrl: process.env.AVALANCHE_FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_FUJI_PROJECT_NFT,
      OffChainInvestmentManager: process.env.AVALANCHE_FUJI_OFFCHAIN_MANAGER,
    },
  },
  // Polygon Amoy Testnet
  80002: {
    chain: polygonAmoy,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_AMOY_PROJECT_NFT,
      OffChainInvestmentManager: process.env.POLYGON_AMOY_OFFCHAIN_MANAGER,
    },
  },
  // Avalanche Mainnet
  43114: {
    chain: avalanche,
    rpcUrl: process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    contracts: {
      RWAProjectNFT: process.env.AVALANCHE_PROJECT_NFT,
      OffChainInvestmentManager: process.env.AVALANCHE_OFFCHAIN_MANAGER,
    },
  },
  // Polygon Mainnet
  137: {
    chain: polygon,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      RWAProjectNFT: process.env.POLYGON_PROJECT_NFT,
      OffChainInvestmentManager: process.env.POLYGON_OFFCHAIN_MANAGER,
    },
  },
  // Ethereum Mainnet
  1: {
    chain: mainnet,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    contracts: {
      RWAProjectNFT: process.env.ETHEREUM_PROJECT_NFT,
      OffChainInvestmentManager: process.env.ETHEREUM_OFFCHAIN_MANAGER,
    },
  },
  // Sepolia Testnet
  11155111: {
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    contracts: {
      RWAProjectNFT: process.env.SEPOLIA_PROJECT_NFT,
      OffChainInvestmentManager: process.env.SEPOLIA_OFFCHAIN_MANAGER,
    },
  },
};

// Default chain ID if not specified
const DEFAULT_CHAIN_ID = 43113; // Avalanche Fuji

// Lazy initialization for Stripe
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// Get chain configuration
function getChainConfig(chainId: number) {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
}

// Create public client for a specific chain
function createChainPublicClient(chainId: number) {
  const config = getChainConfig(chainId);
  return createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

// Create wallet client for a specific chain
function createChainWalletClient(chainId: number, privateKey: `0x${string}`) {
  const config = getChainConfig(chainId);
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: config.chain,
    transport: http(config.rpcUrl),
  });
}

// OffChainInvestmentManager ABI - specific to this contract
const OffChainInvestmentManagerABI = [
  {
    name: 'createInvestment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_projectId', type: 'uint256' },
      { name: '_investor', type: 'address' },
      { name: '_amountUSD', type: 'uint256' },
      { name: '_paymentMethod', type: 'uint8' },
      { name: '_paymentReference', type: 'string' },
    ],
    outputs: [{ name: 'investmentId', type: 'uint256' }],
  },
  {
    name: 'confirmAndMint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_investmentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'paymentReferenceToId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_reference', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress, amountUSD, chainId: chainIdStr } = paymentIntent.metadata;

  if (!projectId || !investorAddress || !amountUSD) {
    console.error('Missing metadata in payment intent');
    return;
  }

  // Parse chain ID from metadata, default to Avalanche Fuji
  const chainId = chainIdStr ? parseInt(chainIdStr, 10) : DEFAULT_CHAIN_ID;

  // Validate chain ID
  if (!CHAIN_CONFIGS[chainId]) {
    console.error(`Unsupported chain ID in payment metadata: ${chainId}`);
    await storeFailedPayment(paymentIntent, `Unsupported chain ID: ${chainId}`);
    return;
  }

  const chainConfig = getChainConfig(chainId);
  const chainName = chainConfig.chain.name;

  console.log(`Processing Stripe payment on ${chainName} (${chainId}): project=${projectId}, investor=${investorAddress}, amount=$${amountUSD}`);

  try {
    const contracts = chainConfig.contracts;

    if (!contracts.RWAProjectNFT) {
      console.error(`RWAProjectNFT contract not configured for chain ${chainId}`);
      await storeFailedPayment(paymentIntent, `RWAProjectNFT not configured for ${chainName}`);
      return;
    }

    const publicClient = createChainPublicClient(chainId);

    const project = await publicClient.readContract({
      address: contracts.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const securityToken = project.securityToken;
    const currentTotalRaised = project.totalRaised as bigint;

    if (!securityToken || securityToken === ZERO_ADDRESS) {
      console.error(`Project ${projectId} on ${chainName} has no security token deployed`);
      await storeFailedPayment(paymentIntent, `No security token on ${chainName}`);
      return;
    }

    const tokenAmount = parseUnits(amountUSD, 18);
    // Convert amountUSD to USDC format (6 decimals) for totalRaised
    const amountInUSDC = BigInt(Math.round(parseFloat(amountUSD) * 1e6));
    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

    if (!VERIFIER_PRIVATE_KEY) {
      console.error('VERIFIER_PRIVATE_KEY not configured');
      await storeFailedPayment(paymentIntent, 'Verifier key not configured');
      return;
    }

    const walletClient = createChainWalletClient(chainId, VERIFIER_PRIVATE_KEY);

    // Step 1: Create investment and mint tokens
    if (contracts.OffChainInvestmentManager && contracts.OffChainInvestmentManager !== '') {
      const existingId = await publicClient.readContract({
        address: contracts.OffChainInvestmentManager as `0x${string}`,
        abi: OffChainInvestmentManagerABI,
        functionName: 'paymentReferenceToId',
        args: [paymentIntent.id],
      });

      if (existingId && existingId > 0n) {
        const hash = await walletClient.writeContract({
          address: contracts.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'confirmAndMint',
          args: [existingId],
        });
        console.log(`[${chainName}] Confirmed existing investment: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
      } else {
        const createHash = await walletClient.writeContract({
          address: contracts.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'createInvestment',
          args: [
            BigInt(projectId),
            investorAddress as `0x${string}`,
            BigInt(Math.round(parseFloat(amountUSD) * 100)),
            0,
            paymentIntent.id,
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash: createHash });

        const newId = await publicClient.readContract({
          address: contracts.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'paymentReferenceToId',
          args: [paymentIntent.id],
        });

        const mintHash = await walletClient.writeContract({
          address: contracts.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'confirmAndMint',
          args: [newId],
        });
        console.log(`[${chainName}] Created and minted: ${mintHash}`);
        await publicClient.waitForTransactionReceipt({ hash: mintHash });
      }
    } else {
      const hash = await walletClient.writeContract({
        address: securityToken as `0x${string}`,
        abi: RWASecurityTokenABI,
        functionName: 'mintForOffChainPayment',
        args: [
          investorAddress as `0x${string}`,
          tokenAmount,
          'Stripe',
          paymentIntent.id,
        ],
      });
      console.log(`[${chainName}] Minted tokens directly: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
    }

    // Step 2: Update totalRaised on RWAProjectNFT
    const newTotalRaised = currentTotalRaised + amountInUSDC;
    console.log(`[${chainName}] Updating totalRaised: ${currentTotalRaised} + ${amountInUSDC} = ${newTotalRaised}`);

    const updateHash = await walletClient.writeContract({
      address: contracts.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'updateTotalRaised',
      args: [BigInt(projectId), newTotalRaised],
    });
    console.log(`[${chainName}] Updated totalRaised: ${updateHash}`);
    await publicClient.waitForTransactionReceipt({ hash: updateHash });

    console.log(`[${chainName}] Successfully processed payment ${paymentIntent.id} - totalRaised now: $${Number(newTotalRaised) / 1e6}`);
  } catch (error) {
    console.error(`[${chainName}] Failed to process payment:`, error);
    await storeFailedPayment(paymentIntent, String(error));
  }
}

async function storeFailedPayment(paymentIntent: Stripe.PaymentIntent, reason: string) {
  const chainId = paymentIntent.metadata.chainId 
    ? parseInt(paymentIntent.metadata.chainId, 10) 
    : DEFAULT_CHAIN_ID;
  
  const chainName = CHAIN_CONFIGS[chainId]?.chain.name || `Unknown (${chainId})`;

  console.error('Failed payment - needs manual processing:', {
    paymentIntentId: paymentIntent.id,
    chainId,
    chainName,
    projectId: paymentIntent.metadata.projectId,
    investor: paymentIntent.metadata.investorAddress,
    amount: paymentIntent.metadata.amountUSD,
    reason,
  });

  // TODO: Store in database for manual processing
  // await db.failedPayments.create({
  //   paymentIntentId: paymentIntent.id,
  //   chainId,
  //   projectId: paymentIntent.metadata.projectId,
  //   investorAddress: paymentIntent.metadata.investorAddress,
  //   amountUSD: paymentIntent.metadata.amountUSD,
  //   reason,
  //   createdAt: new Date(),
  // });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      if (paymentIntent.metadata.type === 'rwa_investment') {
        await handlePaymentSuccess(paymentIntent);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      const chainId = failedIntent.metadata.chainId 
        ? parseInt(failedIntent.metadata.chainId, 10) 
        : DEFAULT_CHAIN_ID;
      const chainName = CHAIN_CONFIGS[chainId]?.chain.name || `Unknown`;
      console.log(`[${chainName}] Payment failed: ${failedIntent.id}`);
      break;

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Health check endpoint for monitoring
export async function GET() {
  const supportedChains = Object.entries(CHAIN_CONFIGS).map(([id, config]) => ({
    chainId: parseInt(id, 10),
    name: config.chain.name,
    hasProjectNFT: !!config.contracts.RWAProjectNFT,
    hasOffChainManager: !!config.contracts.OffChainInvestmentManager,
  }));

  return NextResponse.json({
    status: 'ok',
    supportedChains,
    defaultChainId: DEFAULT_CHAIN_ID,
    stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    verifierConfigured: !!process.env.VERIFIER_PRIVATE_KEY,
  });
}