// src/app/api/payments/stripe/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { projectId, amountUSD, investorAddress, investorEmail } = await request.json();

    // Validation
    if (!projectId || !amountUSD || !investorAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, amountUSD, investorAddress' },
        { status: 400 }
      );
    }

    // Minimum $100 investment
    if (amountUSD < 100) {
      return NextResponse.json(
        { error: 'Minimum investment is $100' },
        { status: 400 }
      );
    }

    // Convert to cents for Stripe
    const amountCents = Math.round(amountUSD * 100);

    // Create or retrieve customer
    let customerId: string | undefined;
    if (investorEmail) {
      const customers = await stripe.customers.list({
        email: investorEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await stripe.customers.update(customerId, {
          metadata: { walletAddress: investorAddress },
        });
      } else {
        const customer = await stripe.customers.create({
          email: investorEmail,
          metadata: { walletAddress: investorAddress },
        });
        customerId = customer.id;
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      metadata: {
        type: 'rwa_investment',
        projectId: projectId.toString(),
        investorAddress,
        amountUSD: amountUSD.toString(),
      },
      description: `Investment in Project #${projectId}`,
      receipt_email: investorEmail || undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Stripe create-intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
