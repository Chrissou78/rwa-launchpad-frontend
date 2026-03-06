// src/app/api/kyc/link/use/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_WALLETS_PER_IDENTITY = parseInt(
  process.env.MAX_WALLETS_PER_IDENTITY || "10"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, code, signature, timestamp } = body;

    if (!walletAddress || !code || !signature || !timestamp) {
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
    const message = `Use Wallet Link Code\nWallet: ${walletAddress}\nCode: ${code}\nTimestamp: ${timestamp}`;

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

    // Find the link code
    const { data: linkCode, error: codeError } = await supabase
      .from("wallet_link_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("used", false)
      .single();

    if (codeError || !linkCode) {
      return NextResponse.json(
        { error: "Invalid or expired link code" },
        { status: 400 }
      );
    }

    // Check if code is expired
    const expiresAt = new Date(linkCode.expires_at).getTime() / 1000;
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Link code has expired" },
        { status: 400 }
      );
    }

    // Check if trying to link to same wallet
    if (linkCode.source_wallet.toLowerCase() === walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot link wallet to itself" },
        { status: 400 }
      );
    }

    // Generate wallet hash for new wallet
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET!;
    const newWalletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Check if new wallet already has KYC
    const { data: existingKYC } = await supabase
      .from("kyc_applications")
      .select("id")
      .eq("wallet_hash", newWalletHash)
      .eq("status", "approved")
      .single();

    if (existingKYC) {
      return NextResponse.json(
        { error: "This wallet already has approved KYC" },
        { status: 400 }
      );
    }

    // Check if new wallet is already linked
    const { data: existingLink } = await supabase
      .from("linked_wallets")
      .select("id")
      .eq("wallet_address", walletAddress)
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: "This wallet is already linked to a KYC identity" },
        { status: 400 }
      );
    }

    // Check max wallets per identity
    const { count: linkedCount } = await supabase
      .from("linked_wallets")
      .select("*", { count: "exact", head: true })
      .eq("wallet_hash", linkCode.wallet_hash);

    if ((linkedCount || 0) >= MAX_WALLETS_PER_IDENTITY) {
      return NextResponse.json(
        { error: `Maximum ${MAX_WALLETS_PER_IDENTITY} wallets allowed per KYC identity` },
        { status: 400 }
      );
    }

    // Link the wallet
    const { error: linkError } = await supabase.from("linked_wallets").insert({
      wallet_hash: linkCode.wallet_hash,
      wallet_address: walletAddress,
      is_primary: false,
      linked_at: new Date().toISOString(),
      linked_via_code: code,
    });

    if (linkError) {
      console.error("Failed to link wallet:", linkError);
      return NextResponse.json(
        { error: "Failed to link wallet" },
        { status: 500 }
      );
    }

    // Mark code as used
    await supabase
      .from("wallet_link_codes")
      .update({
        used: true,
        used_by: walletAddress,
        used_at: new Date().toISOString(),
      })
      .eq("code", code.toUpperCase());

    // Log the linking action
    await supabase.from("admin_audit_log").insert({
      action: "WALLET_LINKED",
      admin_address: "SYSTEM",
      target_id: walletAddress,
      target_type: "wallet",
      details: {
        source_wallet: linkCode.source_wallet,
        linked_wallet: walletAddress,
        link_code: code,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Wallet linked successfully. You now share KYC verification with the source wallet.",
    });
  } catch (error) {
    console.error("Error using link code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
