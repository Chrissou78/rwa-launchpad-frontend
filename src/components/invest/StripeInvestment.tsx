// src/components/invest/StripeInvestment.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface StripeInvestmentProps {
  projectId: number;
  projectName: string;
  minInvestment: number;
  maxInvestment: number;
  tokenPrice: number; // in cents
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({
  projectId,
  projectName,
  amount,
  tokenAmount,
  onSuccess,
  onCancel,
}: {
  projectId: number;
  projectName: string;
  amount: number;
  tokenAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/projects/${projectId}?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Investment Amount</span>
          <span className="text-white font-semibold">${amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Tokens to Receive</span>
          <span className="text-green-400 font-semibold">{tokenAmount.toLocaleString()}</span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 rounded-xl text-white font-semibold transition"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          `Pay $${amount.toLocaleString()}`
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-slate-400 hover:text-white text-sm transition"
      >
        ← Choose different method
      </button>
    </form>
  );
}

export default function StripeInvestment({
  projectId,
  projectName,
  minInvestment,
  maxInvestment,
  tokenPrice,
  onSuccess,
  onCancel,
}: StripeInvestmentProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [emailFromKYC, setEmailFromKYC] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch email from KYC on mount
  useEffect(() => {
    async function fetchKYCEmail() {
      if (!address) {
        setLoadingEmail(false);
        return;
      }

      try {
        const response = await fetch(`/api/kyc/email/${address}`);
        const data = await response.json();
        
        if (data.found && data.email) {
          setEmail(data.email);
          setEmailFromKYC(true);
        }
      } catch (err) {
        console.error('Failed to fetch KYC email:', err);
      } finally {
        setLoadingEmail(false);
      }
    }

    fetchKYCEmail();
  }, [address]);

  const amountNum = Number(amount) || 0;
  const tokenAmount = tokenPrice > 0 ? Math.floor((amountNum * 100) / tokenPrice) : 0;
  const isValidAmount = amountNum >= minInvestment && amountNum <= maxInvestment;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const createPaymentIntent = async () => {
    if (!isValidAmount || !isValidEmail || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          amountUSD: amountNum,
          investorAddress: address,
          investorEmail: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Show payment form once we have a client secret
  if (clientSecret) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#1e293b',
              colorText: '#f1f5f9',
              colorDanger: '#ef4444',
              borderRadius: '8px',
            },
          },
        }}
      >
        <CheckoutForm
          projectId={projectId}
          projectName={projectName}
          amount={amountNum}
          tokenAmount={tokenAmount}
          onSuccess={onSuccess}
          onCancel={() => {
            setClientSecret(null);
            onCancel();
          }}
        />
      </Elements>
    );
  }

  // Initial form to collect amount and email
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-2">Email Address</label>
        {loadingEmail ? (
          <div className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-400">
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
              Loading...
            </span>
          </div>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailFromKYC(false);
              }}
              placeholder="your@email.com"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
            {emailFromKYC ? (
              <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                <span>✓</span> Pre-filled from your KYC verification
              </p>
            ) : (
              <p className="text-slate-500 text-xs mt-1">Receipt will be sent to this email</p>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Investment Amount (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min={minInvestment}
            max={maxInvestment}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Min: ${minInvestment.toLocaleString()}</span>
          <span>Max: ${maxInvestment.toLocaleString()}</span>
        </div>
      </div>

      {amountNum > 0 && tokenPrice > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">You will receive</span>
            <span className="text-purple-400 font-bold text-lg">
              {tokenAmount.toLocaleString()} tokens
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            At ${(tokenPrice / 100).toFixed(2)} per token
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={createPaymentIntent}
        disabled={!isValidAmount || !isValidEmail || isLoading || loadingEmail}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 rounded-xl text-white font-semibold transition"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            Initializing...
          </span>
        ) : (
          'Continue to Payment'
        )}
      </button>

      <button
        onClick={onCancel}
        className="w-full text-slate-400 hover:text-white text-sm transition"
      >
        ← Choose different method
      </button>

      <p className="text-slate-500 text-xs text-center">
        Secure payment powered by Stripe. Your card details are never stored on our servers.
      </p>
    </div>
  );
}
