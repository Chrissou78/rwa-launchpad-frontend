// src/app/api/kyc/link/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LINK_CODE_EXPIRY_MINUTES = parseInt(
  process.env.KYC_LINK_CODE_EXPIRY_MINUTES || "15"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, timestamp } = body;

    if (!walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate timestamp
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json(
        { error: "Request expired" },
        { status: 400 }
      );
    }

    // Verify signature
    const message = `Generate Wallet Link Code\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

    const isValid = await verifyMessage({
      address: getAddress(walletAddress),
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Generate wallet hash
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET!;
    const walletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Check if wallet has verified KYC
    const { data: application } = await supabase
      .from("kyc_applications")
      .select("status, current_level")
      .eq("wallet_hash", walletHash)
      .eq("status", "approved")
      .single();

    if (!application) {
      return NextResponse.json(
        { error: "No approved KYC found for this wallet. Complete KYC first." },
        { status: 400 }
      );
    }

    // Generate unique link code (8 characters, alphanumeric)
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = Math.floor(Date.now() / 1000) + LINK_CODE_EXPIRY_MINUTES * 60;

    // Store link code
    const { error: insertError } = await supabase
      .from("wallet_link_codes")
      .insert({
        code,
        wallet_hash: walletHash,
        source_wallet: walletAddress,
        expires_at: new Date(expiresAt * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to create link code:", insertError);
      return NextResponse.json(
        { error: "Failed to generate link code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code,
      expiresAt,
      expiresIn: LINK_CODE_EXPIRY_MINUTES * 60,
      message: `Link code valid for ${LINK_CODE_EXPIRY_MINUTES} minutes`,
    });
  } catch (error) {
    console.error("Error generating link code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
