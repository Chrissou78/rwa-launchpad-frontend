// src/app/api/kyc/fee/route.ts
import { NextRequest, NextResponse } from "next/server";
import { calculateNativeAmountForUSD, KYC_FEE_USD } from "@/lib/priceService";
import { CHAINS, type SupportedChainId } from "@/config/chains";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainIdParam = searchParams.get("chainId");
    const chainId = (chainIdParam ? parseInt(chainIdParam) : 80002) as SupportedChainId;

    const chain = CHAINS[chainId];
    if (!chain) {
      return NextResponse.json(
        { success: false, error: `Unsupported chain: ${chainId}` },
        { status: 400 }
      );
    }

    const { amount, price, formatted } = await calculateNativeAmountForUSD(chainId, KYC_FEE_USD);

    return NextResponse.json({
      success: true,
      fee: {
        usd: KYC_FEE_USD,
        native: amount.toString(),
        nativeFormatted: formatted,
        symbol: chain.nativeCurrency,
        price,
        chainId,
      },
    });

  } catch (error: any) {
    console.error("[KYC Fee] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
