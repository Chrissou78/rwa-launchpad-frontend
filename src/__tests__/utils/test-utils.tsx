// src/__tests__/utils/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock providers wrapper
interface MockProvidersProps {
  children: React.ReactNode;
}

function MockProviders({ children }: MockProvidersProps) {
  return <>{children}</>;
}

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock wallet client
export function createMockWalletClient() {
  return {
    signMessage: vi.fn(async ({ message }: { message: string }) => {
      return '0x' + 'a'.repeat(130); // Mock signature
    }),
    writeContract: vi.fn(async () => {
      return '0x' + 'b'.repeat(64); // Mock tx hash
    }),
    account: {
      address: '0x1234567890123456789012345678901234567890',
    },
  };
}

// Helper to create mock public client
export function createMockPublicClient() {
  return {
    readContract: vi.fn(),
    waitForTransactionReceipt: vi.fn(async () => ({
      status: 'success',
      transactionHash: '0x' + 'c'.repeat(64),
    })),
    getBalance: vi.fn(async () => BigInt('1000000000000000000')),
  };
}

// Helper to create mock KYC status
export function createMockKYCStatus(overrides = {}) {
  return {
    hasApplication: true,
    status: 'approved',
    currentLevel: 2,
    requestedLevel: 2,
    hasValidProof: true,
    proofLevel: 2,
    proofExpiry: Math.floor(Date.now() / 1000) + 86400 * 365,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create mock KYC proof
export function createMockKYCProof(overrides = {}) {
  return {
    level: 2,
    countryCode: 840,
    expiry: Math.floor(Date.now() / 1000) + 86400 * 365,
    signature: '0x' + 'd'.repeat(130),
    ...overrides,
  };
}

// Helper to create mock linked wallet
export function createMockLinkedWallet(overrides = {}) {
  return {
    address: '0x1234567890123456789012345678901234567890',
    addressPreview: '0x1234...7890',
    isPrimary: true,
    linkedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to mock fetch responses
export function mockFetchResponse(data: any, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
    blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' }),
    text: async () => JSON.stringify(data),
  });
}

// Helper to mock fetch sequence
export function mockFetchSequence(responses: Array<{ data: any; ok?: boolean; status?: number }>) {
  const mockFn = vi.fn();
  responses.forEach((response, index) => {
    mockFn.mockResolvedValueOnce({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.data,
      blob: async () => new Blob([JSON.stringify(response.data)], { type: 'application/json' }),
      text: async () => JSON.stringify(response.data),
    });
  });
  return mockFn;
}

// Helper to wait for async operations
export async function waitForAsync(ms = 0) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
