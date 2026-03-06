import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import { signTypedData } from "viem/accounts";
import { DEPLOYMENTS } from "@/config/deployments";
import type { SupportedChainId } from "@/config/chains";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, level, countryCode: providedCountryCode, signature, timestamp } = body;
    const chainIdHeader = request.headers.get("x-chain-id");
    const chainId = (chainIdHeader ? parseInt(chainIdHeader) : 80002) as SupportedChainId;

    console.log("[Generate Proof] Request:", { walletAddress: walletAddress?.slice(0, 10), level, countryCode: providedCountryCode });

    // Validate
    if (!walletAddress || !level || !signature || !timestamp) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    // Verify signature
    const message = `KYC Application\nWallet: ${walletAddress}\nLevel: ${level}\nTimestamp: ${timestamp}`;
    const isValid = await verifyMessage({
      address: getAddress(walletAddress),
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    // Get deployment
    const deployment = DEPLOYMENTS[chainId];
    if (!deployment?.contracts?.KYCVerifier) {
      return NextResponse.json({ success: false, error: "KYC not deployed on this chain" }, { status: 400 });
    }

    // Determine country code - use provided or fetch from existing application
    let countryCode = providedCountryCode;
    
    if (!countryCode) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const walletHash = keccak256(toHex(`${walletAddress.toLowerCase()}:${process.env.KYC_WALLET_HASH_SECRET}`));
      
      const { data: existingApp } = await supabase
        .from("kyc_applications")
        .select("country_code")
        .eq("wallet_hash", walletHash)
        .gte("current_level", 1)
        .order("current_level", { ascending: false })
        .limit(1)
        .single();
      
      if (existingApp?.country_code) {
        countryCode = existingApp.country_code;
        console.log("[Generate Proof] Using existing country code:", countryCode);
      } else {
        return NextResponse.json({ success: false, error: "Country code required" }, { status: 400 });
      }
    }

    // Generate proof
    const signerPrivateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    const PROOF_VALIDITY_DAYS = parseInt(process.env.KYC_VALIDITY_DAYS || "365");
    const expiry = Math.floor(Date.now() / 1000) + PROOF_VALIDITY_DAYS * 24 * 60 * 60;

    const DOMAIN = {
      name: "RWA KYC Verifier",
      version: "1",
      chainId,
      verifyingContract: getAddress(deployment.contracts.KYCVerifier),
    };

    const KYC_PROOF_TYPES = {
      KYCProof: [
        { name: "wallet", type: "address" },
        { name: "level", type: "uint8" },
        { name: "countryCode", type: "uint16" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const proofSignature = await signTypedData({
      privateKey: signerPrivateKey,
      domain: DOMAIN,
      types: KYC_PROOF_TYPES,
      primaryType: "KYCProof",
      message: {
        wallet: getAddress(walletAddress),
        level,
        countryCode,
        expiry: BigInt(expiry),
      },
    });

    console.log("[Generate Proof] ✅ Proof generated for level", level);

    return NextResponse.json({
      success: true,
      proof: {
        level,
        countryCode,
        expiry,
        signature: proofSignature,
      },
    });

  } catch (error: any) {
    console.error("[Generate Proof] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}