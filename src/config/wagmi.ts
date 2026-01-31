import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

// Polygon Amoy Testnet
export const polygonAmoy = {
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
} as const

export const config = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(), // MetaMask, Rabby, Coinbase Wallet, etc. - any browser extension
  ],
  transports: {
    [polygonAmoy.id]: http(),
  },
  ssr: true,
})

export const CHAIN_ID = 80002
