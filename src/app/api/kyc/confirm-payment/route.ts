// src/app/api/kyc/confirm-payment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { keccak256, toHex, createPublicClient, http } from "viem";
import { CHAINS, type SupportedChainId } from "@/config/chains";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, txHash } = await request.json();
    const chainIdHeader = request.headers.get("x-chain-id");
    const chainId = (chainIdHeader ? parseInt(chainIdHeader) : 80002) as SupportedChainId;

    console.log("[Confirm Payment] Wallet:", walletAddress);
    console.log("[Confirm Payment] TxHash:", txHash);
    console.log("[Confirm Payment] ChainId:", chainId);

    if (!walletAddress || !txHash) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Get chain config from central config
    const chainInfo = CHAINS[chainId];
    if (!chainInfo) {
      return NextResponse.json({ success: false, error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    // Verify transaction on-chain
    const publicClient = createPublicClient({
      chain: chainInfo.chain,
      transport: http(chainInfo.rpcUrl),
    });

    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt || receipt.status !== "success") {
      return NextResponse.json({ success: false, error: "Transaction not confirmed" }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Sender mismatch" }, { status: 400 });
    }

    console.log("[Confirm Payment] Transaction verified on-chain");

    // Update database
    const supabase = createClient(supabaseUrl, supabaseKey);
    const walletHash = keccak256(toHex(`${walletAddress.toLowerCase()}:${process.env.KYC_WALLET_HASH_SECRET}`));

    const { data: application, error: findError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("wallet_hash", walletHash)
      .eq("status", "pending_payment")
      .order("submitted_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !application) {
      console.log("[Confirm Payment] No pending application:", findError);
      return NextResponse.json({ success: false, error: "No pending application" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({
        status: "approved",
        current_level: application.requested_level,
        approved_at: new Date().toISOString(),
        tx_hash: txHash,
      })
      .eq("id", application.id);

    if (updateError) {
      console.log("[Confirm Payment] Update error:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
    }

    console.log("[Confirm Payment] ✅ Application approved!");

    return NextResponse.json({ success: true, applicationId: application.id });
  } catch (error: any) {
    console.error("[Confirm Payment] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
