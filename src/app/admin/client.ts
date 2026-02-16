// src/app/admin/client.ts

import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology'),
});
