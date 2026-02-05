import { http, createConfig } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import type { Chain } from 'viem'

// Polygon Amoy Testnet
export const polygonAmoy: Chain = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
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
    [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
  },
  ssr: true,
})

export const CHAIN_ID = 80002
