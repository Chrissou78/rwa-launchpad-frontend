// src/app/api/kyc/link/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");
    const signature = searchParams.get("signature");
    const timestamp = searchParams.get("timestamp");

    if (!walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing required parameters" },
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
    const message = `Get Linked Wallets\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

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

    // Check if this wallet is linked to any identity
    const { data: linkedWallet } = await supabase
      .from("linked_wallets")
      .select("wallet_hash")
      .eq("wallet_address", walletAddress)
      .single();

    // Use the linked wallet hash if found, otherwise use own hash
    const identityHash = linkedWallet?.wallet_hash || walletHash;

    // Get all wallets linked to this identity
    const { data: wallets, error } = await supabase
      .from("linked_wallets")
      .select("wallet_address, is_primary, linked_at")
      .eq("wallet_hash", identityHash)
      .order("linked_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch linked wallets:", error);
      return NextResponse.json(
        { error: "Failed to fetch linked wallets" },
        { status: 500 }
      );
    }

    // Format response - mask wallet addresses for privacy
    const formattedWallets = (wallets || []).map((w) => ({
      address: w.wallet_address,
      addressPreview: `${w.wallet_address.slice(0, 6)}...${w.wallet_address.slice(-4)}`,
      isPrimary: w.is_primary,
      linkedAt: w.linked_at,
    }));

    return NextResponse.json({
      wallets: formattedWallets,
      total: formattedWallets.length,
    });
  } catch (error) {
    console.error("Error fetching linked wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
