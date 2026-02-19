// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { ZERO_ADDRESS, RPC_URL, CONTRACTS } from '@/config/contracts';
import { RWAProjectNFTABI, RWASecurityTokenABI } from '@/config/abis';

// Lazy initialization
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

// OffChainInvestmentManager ABI - specific to this contract, not in central file
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

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress, amountUSD } = paymentIntent.metadata;

  if (!projectId || !investorAddress || !amountUSD) {
    console.error('Missing metadata in payment intent');
    return;
  }

  console.log(`Processing Stripe payment: project=${projectId}, investor=${investorAddress}, amount=$${amountUSD}`);

  try {
    if (!CONTRACTS.RWAProjectNFT) {
      console.error('RWAProjectNFT contract not configured');
      await storeFailedPayment(paymentIntent, 'RWAProjectNFT not configured');
      return;
    }

    const project = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const securityToken = project.securityToken;
    const currentTotalRaised = project.totalRaised as bigint;

    if (!securityToken || securityToken === ZERO_ADDRESS) {
      console.error('Project has no security token deployed');
      await storeFailedPayment(paymentIntent, 'No security token');
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

    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL || RPC_URL),
    });

    // Step 1: Create investment and mint tokens
    if (CONTRACTS.OffChainInvestmentManager && CONTRACTS.OffChainInvestmentManager !== '') {
      const existingId = await publicClient.readContract({
        address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
        abi: OffChainInvestmentManagerABI,
        functionName: 'paymentReferenceToId',
        args: [paymentIntent.id],
      });

      if (existingId && existingId > 0n) {
        const hash = await walletClient.writeContract({
          address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'confirmAndMint',
          args: [existingId],
        });
        console.log(`Confirmed existing investment: ${hash}`);
        await publicClient.waitForTransactionReceipt({ hash });
      } else {
        const createHash = await walletClient.writeContract({
          address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
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
          address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'paymentReferenceToId',
          args: [paymentIntent.id],
        });

        const mintHash = await walletClient.writeContract({
          address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'confirmAndMint',
          args: [newId],
        });
        console.log(`Created and minted: ${mintHash}`);
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
      console.log(`Minted tokens directly: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
    }

    // Step 2: Update totalRaised on RWAProjectNFT
    const newTotalRaised = currentTotalRaised + amountInUSDC;
    console.log(`Updating totalRaised: ${currentTotalRaised} + ${amountInUSDC} = ${newTotalRaised}`);

    const updateHash = await walletClient.writeContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'updateTotalRaised',
      args: [BigInt(projectId), newTotalRaised],
    });
    console.log(`Updated totalRaised: ${updateHash}`);
    await publicClient.waitForTransactionReceipt({ hash: updateHash });

    console.log(`Successfully processed payment ${paymentIntent.id} - totalRaised now: $${Number(newTotalRaised) / 1e6}`);
  } catch (error) {
    console.error('Failed to process payment:', error);
    await storeFailedPayment(paymentIntent, String(error));
  }
}

async function storeFailedPayment(paymentIntent: Stripe.PaymentIntent, reason: string) {
  console.error('Failed payment - needs manual processing:', {
    paymentIntentId: paymentIntent.id,
    projectId: paymentIntent.metadata.projectId,
    investor: paymentIntent.metadata.investorAddress,
    amount: paymentIntent.metadata.amountUSD,
    reason,
  });
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
      console.log(`Payment failed: ${(event.data.object as Stripe.PaymentIntent).id}`);
      break;

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
