import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import type { Chain } from 'viem'
import { CHAIN_ID, EXPLORER_URL } from '@/config/contracts'

// Avalanche Fuji Testnet
export const avalancheFuji: Chain = {
  id: CHAIN_ID,
  name: CHAIN_ID === 43113 ? 'Avalanche Fuji' : CHAIN_ID === 43114 ? 'Avalanche C-Chain' : `Chain ${CHAIN_ID}`,
  nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  rpcUrls: {
    default: { 
      http: [CHAIN_ID === 43113 
        ? 'https://api.avax-test.network/ext/bc/C/rpc' 
        : 'https://avax.api.pocket.network'
      ] 
    },
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: EXPLORER_URL },
  },
  testnet: CHAIN_ID === 43113,
}

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [avalancheFuji],
  connectors: [
    injected({ target: 'metaMask' }),
    injected({ target: 'phantom' }),
    injected({ target: 'coinbaseWallet' }),
    ...(projectId ? [
      walletConnect({ 
        projectId,
        metadata: {
          name: 'RWA Launchpad',
          description: 'Real World Asset Investment Platform',
          url: 'https://rwa-launchpad.com',
          icons: ['https://rwa-launchpad.com/icon.png']
        },
        showQrModal: true,
      }),
    ] : []),
    injected(), // Fallback for other browser wallets
  ],
  transports: {
    [avalancheFuji.id]: http(
      CHAIN_ID === 43113 
        ? 'https://api.avax-test.network/ext/bc/C/rpc' 
        : 'https://avax.api.pocket.network'
    ),
  },
  ssr: true,
})

// Re-export CHAIN_ID for convenience (from contracts.ts)
export { CHAIN_ID } from '@/config/contracts'
