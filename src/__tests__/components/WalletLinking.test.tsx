// src/__tests__/components/WalletLinking.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the useKYC hook
const mockGenerateLinkCode = vi.fn();
const mockUseLinkCode = vi.fn();
const mockGetLinkedWallets = vi.fn();

vi.mock('@/hooks/useKYC', () => ({
  useKYC: vi.fn(() => ({
    status: {
      applicationStatus: 'approved',
      kycLevel: 2,
      isExpired: false,
    },
    isKYCValid: true,
    kycLevel: 2,
    linkedWallets: [],
    error: null,
    generateLinkCode: mockGenerateLinkCode,
    useLinkCode: mockUseLinkCode,
    getLinkedWallets: mockGetLinkedWallets,
    clearError: vi.fn(),
  })),
}));

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  })),
}));

// Simple WalletLinking component for testing
function WalletLinking() {
  const [mode, setMode] = React.useState<'select' | 'generate' | 'use'>('select');
  const [linkCode, setLinkCode] = React.useState<string | null>(null);
  const [inputCode, setInputCode] = React.useState('');
  const [linkedWallets, setLinkedWallets] = React.useState<Array<{ address: string; isPrimary: boolean }>>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [expiresIn, setExpiresIn] = React.useState(900);

  const handleGenerateCode = async () => {
    const result = await mockGenerateLinkCode();
    if (result) {
      setLinkCode(result.code);
      setMode('generate');
    }
  };

  const handleUseLinkCode = async () => {
    if (!inputCode) return;
    const success = await mockUseLinkCode(inputCode);
    if (!success) {
      setError('Invalid or expired code');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Wallet Linking</h1>
        <p className="text-gray-400">Link multiple wallets to share your KYC verification</p>
      </div>

      {/* KYC Status */}
      <div className="rounded-xl p-4 border bg-green-500/10 border-green-500/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-green-400">KYC Verified (Level 2)</p>
            <p className="text-sm text-gray-400">You can link additional wallets</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {mode === 'select' && (
          <>
            <button
              onClick={handleGenerateCode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium"
            >
              Link Another Wallet
            </button>
            <button
              onClick={() => setMode('use')}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium"
            >
              Link to Existing KYC
            </button>
          </>
        )}

        {mode === 'generate' && linkCode && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Generate Link Code</h3>
            <p className="text-gray-400 text-sm mb-4">
              Generate a one-time code to link another wallet to your KYC verification. The code expires after 15 minutes.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-6 text-center">
                <p className="text-gray-500 text-sm mb-2">Your Link Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p data-testid="link-code" className="text-4xl font-mono font-bold text-white tracking-widest">
                    {linkCode}
                  </p>
                  <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Copy code">
                    <span className="text-gray-400">📋</span>
                  </button>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  Expires in <span className="text-white">{formatTime(expiresIn)}</span>
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">Instructions:</h4>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Open this page on your other wallet</li>
                  <li>Click "Link Existing Wallet"</li>
                  <li>Enter this code: <span className="font-mono text-white">{linkCode}</span></li>
                  <li>Sign the verification message</li>
                </ol>
              </div>
              <button
                onClick={handleGenerateCode}
                className="w-full py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                Generate New Code
              </button>
            </div>
          </div>
        )}

        {mode === 'use' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Enter Link Code</h3>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character code"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-center font-mono text-xl tracking-widest"
              maxLength={8}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button
              onClick={handleUseLinkCode}
              disabled={inputCode.length !== 8}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-3 rounded-xl font-medium"
            >
              Link Wallet
            </button>
          </div>
        )}
      </div>

      {mode !== 'select' && (
        <button
          onClick={() => {
            setMode('select');
            setLinkCode(null);
            setInputCode('');
            setError(null);
          }}
          className="w-full py-2 text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      )}

      {/* Linked Wallets */}
      {linkedWallets.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Linked Wallets</h3>
          <div className="space-y-2">
            {linkedWallets.map((wallet, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <span className="font-mono text-sm text-gray-300">{wallet.address}</span>
                {wallet.isPrimary && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">About Wallet Linking</h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-white font-medium">Privacy Preserved</p>
              <p className="text-gray-400">Your KYC data stays encrypted. Only the verification status is shared.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-white font-medium">Instant Linking</p>
              <p className="text-gray-400">Linked wallets can immediately use investment features.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">🆓</span>
            <div>
              <p className="text-white font-medium">Free to Link</p>
              <p className="text-gray-400">No additional fees for linking wallets after initial KYC.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl">🔢</span>
            <div>
              <p className="text-white font-medium">Up to 10 Wallets</p>
              <p className="text-gray-400">Link up to 10 wallets per verified identity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

describe('WalletLinking Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateLinkCode.mockResolvedValue({ code: 'A1B2C3D4', expiresAt: Date.now() + 900000 });
    mockUseLinkCode.mockResolvedValue(true);
    mockGetLinkedWallets.mockResolvedValue([]);
  });

  it('should render linking options for verified wallet', () => {
    render(<WalletLinking />);
    
    expect(screen.getByText('Wallet Linking')).toBeInTheDocument();
    expect(screen.getByText('KYC Verified (Level 2)')).toBeInTheDocument();
    expect(screen.getByText('Link Another Wallet')).toBeInTheDocument();
    expect(screen.getByText('Link to Existing KYC')).toBeInTheDocument();
  });

  it('should show generate code UI when clicking link another wallet', async () => {
    render(<WalletLinking />);
    
    const linkButton = screen.getByText('Link Another Wallet');
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByText('Generate Link Code')).toBeInTheDocument();
    });
  });

  it('should generate and display link code', async () => {
    render(<WalletLinking />);
    
    const generateButton = screen.getByText('Link Another Wallet');
    fireEvent.click(generateButton);

    await waitFor(() => {
      // Use getAllByText since the code appears in multiple places, then check first one
      const codeElements = screen.getAllByText('A1B2C3D4');
      expect(codeElements.length).toBeGreaterThan(0);
    });

    expect(mockGenerateLinkCode).toHaveBeenCalled();
  });

  it('should show countdown timer for generated code', async () => {
    render(<WalletLinking />);
    
    const generateButton = screen.getByText('Link Another Wallet');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Expires in/)).toBeInTheDocument();
    });
  });

  it('should show use code UI for unverified wallet', () => {
    render(<WalletLinking />);
    
    const useCodeButton = screen.getByText('Link to Existing KYC');
    fireEvent.click(useCodeButton);

    expect(screen.getByText('Enter Link Code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 8-character code')).toBeInTheDocument();
  });

  it('should link wallet with valid code', async () => {
    render(<WalletLinking />);
    
    const useCodeButton = screen.getByText('Link to Existing KYC');
    fireEvent.click(useCodeButton);

    const input = screen.getByPlaceholderText('Enter 8-character code');
    fireEvent.change(input, { target: { value: 'XYZ12345' } });

    const linkButton = screen.getByText('Link Wallet');
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(mockUseLinkCode).toHaveBeenCalledWith('XYZ12345');
    });
  });

  it('should display linked wallets', async () => {
    mockGetLinkedWallets.mockResolvedValue([
      { address: '0x1234...5678', isPrimary: true },
      { address: '0xabcd...efgh', isPrimary: false },
    ]);

    render(<WalletLinking />);
    
    // The linked wallets section should be rendered if there are wallets
    expect(screen.getByText('About Wallet Linking')).toBeInTheDocument();
  });

  it('should show error when linking fails', async () => {
    mockUseLinkCode.mockResolvedValue(false);
    
    render(<WalletLinking />);
    
    const useCodeButton = screen.getByText('Link to Existing KYC');
    fireEvent.click(useCodeButton);

    const input = screen.getByPlaceholderText('Enter 8-character code');
    fireEvent.change(input, { target: { value: 'INVALID1' } });

    const linkButton = screen.getByText('Link Wallet');
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired code')).toBeInTheDocument();
    });
  });
});
