import { http, createConfig } from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import type { Chain } from 'viem'
import { CHAIN_ID, EXPLORER_URL } from '@/config/contracts'

// Polygon Amoy Testnet
export const polygonAmoy: Chain = {
  id: CHAIN_ID,
  name: CHAIN_ID === 80002 ? 'Polygon Amoy' : CHAIN_ID === 137 ? 'Polygon' : `Chain ${CHAIN_ID}`,
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: { 
      http: [CHAIN_ID === 80002 
        ? 'https://rpc-amoy.polygon.technology' 
        : 'https://polygon-rpc.com'
      ] 
    },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: EXPLORER_URL },
  },
  testnet: CHAIN_ID === 80002,
}

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [polygonAmoy],
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
    [polygonAmoy.id]: http(
      CHAIN_ID === 80002 
        ? 'https://rpc-amoy.polygon.technology' 
        : 'https://polygon-rpc.com'
    ),
  },
  ssr: true,
})

// Re-export CHAIN_ID for convenience (from contracts.ts)
export { CHAIN_ID } from '@/config/contracts'
