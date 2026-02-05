// src/app/api/payments/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '@/config/contracts';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ABIs
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

const RWASecurityTokenABI = [
  {
    name: 'mintForOffChainPayment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_tokenAmount', type: 'uint256' },
      { name: '_paymentMethod', type: 'string' },
      { name: '_paymentReference', type: 'string' },
    ],
    outputs: [],
  },
] as const;

const RWAProjectNFTABI = [
  {
    name: 'getProject',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'projectId', type: 'uint256' }],
    outputs: [
      {
        name: 'project',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'owner', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'fundingGoal', type: 'uint256' },
          { name: 'totalRaised', type: 'uint256' },
          { name: 'minInvestment', type: 'uint256' },
          { name: 'maxInvestment', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'securityToken', type: 'address' },
          { name: 'escrowVault', type: 'address' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
          { name: 'transferable', type: 'bool' },
        ],
      },
    ],
  },
] as const;

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://rpc-amoy.polygon.technology'),
});

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { projectId, investorAddress, amountUSD } = paymentIntent.metadata;

  if (!projectId || !investorAddress || !amountUSD) {
    console.error('Missing metadata in payment intent');
    return;
  }

  console.log(`Processing Stripe payment: project=${projectId}, investor=${investorAddress}, amount=$${amountUSD}`);

  try {
    // Get project to find security token
    const project = await publicClient.readContract({
      address: CONTRACTS.RWAProjectNFT as `0x${string}`,
      abi: RWAProjectNFTABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as any;

    const securityToken = project.securityToken;

    if (!securityToken || securityToken === ZERO_ADDRESS) {
      console.error('Project has no security token deployed');
      await storeFailedPayment(paymentIntent, 'No security token');
      return;
    }

    // Calculate token amount ($1 = 1 token, 18 decimals)
    const tokenAmount = parseUnits(amountUSD, 18);

    if (!VERIFIER_PRIVATE_KEY) {
      console.error('VERIFIER_PRIVATE_KEY not configured');
      await storeFailedPayment(paymentIntent, 'Verifier key not configured');
      return;
    }

    const account = privateKeyToAccount(VERIFIER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: http('https://rpc-amoy.polygon.technology'),
    });

    // Option 1: Use OffChainInvestmentManager if deployed
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
      } else {
        const createHash = await walletClient.writeContract({
          address: CONTRACTS.OffChainInvestmentManager as `0x${string}`,
          abi: OffChainInvestmentManagerABI,
          functionName: 'createInvestment',
          args: [
            BigInt(projectId),
            investorAddress as `0x${string}`,
            BigInt(Math.round(parseFloat(amountUSD) * 100)),
            0, // PaymentMethod.Stripe
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
      }
    }
    // Option 2: Direct token minting
    else {
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
    }

    console.log(`Successfully processed payment ${paymentIntent.id}`);
  } catch (error) {
    console.error('Failed to process payment:', error);
    await storeFailedPayment(paymentIntent, String(error));
  }
}

async function storeFailedPayment(paymentIntent: Stripe.PaymentIntent, reason: string) {
  // TODO: Store in database for manual processing
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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
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
