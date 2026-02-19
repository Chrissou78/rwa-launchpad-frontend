// src/app/admin/client.ts

import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://avalanche-fuji.g.alchemy.com/v2/IoufBRdGO6MKWC6pxqbZW'),
});
