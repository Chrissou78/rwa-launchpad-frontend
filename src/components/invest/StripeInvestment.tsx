// src/components/invest/StripeInvestment.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe outside component to avoid re-initialization
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface StripeInvestmentProps {
  projectId: number;
  projectName: string;
  minInvestment: number;
  maxInvestment: number;
  tokenPrice: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type CheckoutStep = 'details' | 'payment' | 'processing' | 'success' | 'error';

// Success animation component
function SuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
          <div className="w-16 h-16 rounded-full bg-green-500/40 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// Processing animation component
function ProcessingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: CheckoutStep }) {
  const steps = [
    { key: 'details', label: 'Details' },
    { key: 'payment', label: 'Payment' },
    { key: 'processing', label: 'Processing' },
    { key: 'success', label: 'Complete' },
  ];

  const getStepStatus = (stepKey: string) => {
    const stepOrder = ['details', 'payment', 'processing', 'success'];
    const currentIndex = stepOrder.indexOf(currentStep === 'error' ? 'payment' : currentStep);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="flex items-center justify-between mb-6 px-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                getStepStatus(step.key) === 'completed'
                  ? 'bg-green-500 text-white'
                  : getStepStatus(step.key) === 'current'
                    ? 'bg-purple-500 text-white ring-4 ring-purple-500/30'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {getStepStatus(step.key) === 'completed' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs mt-1 ${
              getStepStatus(step.key) === 'current' ? 'text-purple-400' : 'text-slate-500'
            }`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-1 mt-[-16px] ${
              getStepStatus(steps[index + 1].key) !== 'upcoming' ? 'bg-green-500' : 'bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

// Separate inner component that uses Stripe hooks
function CheckoutFormInner({
  projectId,
  amount,
  tokenAmount,
  onSuccess,
  onError,
  onBack,
}: {
  projectId: number;
  amount: number;
  tokenAmount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isElementReady, setIsElementReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Double-check readiness
  const isFullyReady = stripe && elements && isElementReady && cardComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    console.log('Submit clicked - state:', { 
      stripe: !!stripe, 
      elements: !!elements, 
      isElementReady, 
      cardComplete 
    });

    if (!stripe || !elements) {
      setErrorMessage('Payment system not loaded. Please refresh the page.');
      return;
    }

    if (!isElementReady) {
      setErrorMessage('Payment form is still loading. Please wait.');
      return;
    }

    if (!cardComplete) {
      setErrorMessage('Please complete your card details.');
      return;
    }

    setIsProcessing(true);

    // Small delay to ensure everything is mounted
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      console.log('Calling confirmPayment...');
      
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/projects/${projectId}?payment=success`,
        },
        redirect: 'if_required',
      });

      console.log('confirmPayment result:', result);

      if (result.error) {
        console.error('Payment error:', result.error);
        setErrorMessage(result.error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      } else if (result.paymentIntent) {
        console.log('Payment intent status:', result.paymentIntent.status);
        if (result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === 'processing') {
          onSuccess();
        } else {
          setErrorMessage(`Payment status: ${result.paymentIntent.status}`);
          setIsProcessing(false);
        }
      }
    } catch (err: any) {
      console.error('Payment exception:', err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="text-center py-4">
        <ProcessingAnimation />
        <h4 className="text-xl font-semibold text-white mt-4">Processing Payment</h4>
        <p className="text-slate-400 mt-2">Please wait while we confirm your payment...</p>
        <p className="text-slate-500 text-sm mt-4">Do not close this window</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Order Summary */}
      <div className="bg-slate-700/50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Order Summary</h4>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Investment Amount</span>
          <span className="text-white font-semibold">${amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Tokens to Receive</span>
          <span className="text-green-400 font-semibold">{tokenAmount.toLocaleString()} tokens</span>
        </div>
        <div className="border-t border-slate-600 pt-3 flex justify-between">
          <span className="text-slate-300 font-medium">Total</span>
          <span className="text-white font-bold text-lg">${amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-slate-700/30 rounded-xl p-4 min-h-[200px]">
        <PaymentElement
          onReady={() => {
            console.log('PaymentElement onReady fired');
            setIsElementReady(true);
          }}
          onChange={(event) => {
            console.log('PaymentElement onChange:', event.complete, event.empty);
            setCardComplete(event.complete);
            if (event.complete) {
              setErrorMessage(null);
            }
          }}
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {!isElementReady && (
        <div className="flex items-center justify-center gap-2 text-slate-400 py-2">
          <span className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
          <span className="text-sm">Loading payment form...</span>
        </div>
      )}

      {isElementReady && !cardComplete && (
        <p className="text-slate-400 text-sm text-center">
          Enter your card details above
        </p>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 text-sm">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!isFullyReady}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {!isElementReady ? 'Loading...' : !cardComplete ? 'Enter card details' : `Pay $${amount.toLocaleString()}`}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-slate-400 hover:text-white text-sm transition py-2"
      >
        ← Back to details
      </button>

      <p className="text-slate-500 text-xs text-center flex items-center justify-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secured by Stripe
      </p>
    </form>
  );
}

// Wrapper component that provides Elements context
function CheckoutForm({
  clientSecret,
  projectId,
  amount,
  tokenAmount,
  onSuccess,
  onError,
  onBack,
}: {
  clientSecret: string;
  projectId: number;
  amount: number;
  tokenAmount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#a855f7',
            colorBackground: '#1e293b',
            colorText: '#f1f5f9',
            colorDanger: '#ef4444',
            borderRadius: '8px',
          },
        },
      }}
    >
      <CheckoutFormInner
        projectId={projectId}
        amount={amount}
        tokenAmount={tokenAmount}
        onSuccess={onSuccess}
        onError={onError}
        onBack={onBack}
      />
    </Elements>
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
  const [step, setStep] = useState<CheckoutStep>('details');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [emailFromKYC, setEmailFromKYC] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const tokenAmount = tokenPrice > 0 ? Math.floor((amountNum * 100) / tokenPrice) : 0;
  const isValidAmount = amountNum >= minInvestment && amountNum <= maxInvestment;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    setTimeout(() => {
      onSuccess();
    }, 3000);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
    setStep('error');
  };

  const handleClose = () => {
    if (step === 'processing') return;
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Invest in {projectName}</h3>
              <p className="text-slate-400 text-sm">Secure card payment</p>
            </div>
            {step !== 'processing' && (
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-white transition p-1 hover:bg-slate-700 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step !== 'error' && <StepIndicator currentStep={step} />}

          {/* Step: Details */}
          {step === 'details' && (
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
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition"
                    />
                    {emailFromKYC && (
                      <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Pre-filled from your KYC verification
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Investment Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min={minInvestment}
                    max={maxInvestment}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-3 text-white text-lg placeholder-slate-400 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Min: ${minInvestment.toLocaleString()}</span>
                  <span>Max: ${maxInvestment.toLocaleString()}</span>
                </div>
              </div>

              {amountNum > 0 && tokenPrice > 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 text-sm">You will receive</span>
                      <p className="text-purple-400 font-bold text-2xl">{tokenAmount.toLocaleString()}</p>
                      <span className="text-slate-500 text-xs">tokens</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-sm">Price per token</span>
                      <p className="text-white font-semibold">${(tokenPrice / 100).toFixed(2)}</p>
                    </div>
                  </div>
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
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition"
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
                className="w-full text-slate-400 hover:text-white text-sm transition py-2"
              >
                ← Choose different method
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === 'payment' && clientSecret && (
            <CheckoutForm
              clientSecret={clientSecret}
              projectId={projectId}
              amount={amountNum}
              tokenAmount={tokenAmount}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onBack={() => {
                setClientSecret(null);
                setStep('details');
              }}
            />
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-4">
              <SuccessAnimation />
              <h4 className="text-xl font-semibold text-green-400 mt-4">Payment Successful!</h4>
              <p className="text-slate-300 mt-2">Your investment has been processed.</p>

              <div className="bg-slate-700/50 rounded-xl p-4 mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Amount Invested</span>
                  <span className="text-white font-semibold">${amountNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tokens Receiving</span>
                  <span className="text-green-400 font-semibold">{tokenAmount.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-slate-500 text-sm mt-4">Tokens will be minted to your wallet shortly.</p>

              <button
                onClick={onSuccess}
                className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl text-white font-semibold transition mt-6"
              >
                Done
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h4 className="text-xl font-semibold text-red-400 mt-4">Payment Failed</h4>
              <p className="text-slate-400 mt-2">{error || 'Something went wrong.'}</p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setError(null);
                    setStep('payment');
                  }}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-semibold transition"
                >
                  Try Again
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 border-t border-slate-700 px-6 py-3">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>256-bit SSL Encryption</span>
            <span className="mx-2">•</span>
            <span>Powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
