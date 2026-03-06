// src/app/api/kyc/proof/route.ts
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
        { error: "Missing required parameters: wallet, signature, timestamp" },
        { status: 400 }
      );
    }

    // Check timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json(
        { error: "Request expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify signature to authenticate the request
    const message = `Get KYC Proof\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: getAddress(walletAddress),
        message,
        signature: signature as `0x${string}`,
      });
    } catch (e) {
      console.error("Signature verification failed:", e);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Generate wallet hash (same algorithm used during KYC submission)
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET;
    if (!walletHashSecret) {
      console.error("KYC_WALLET_HASH_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const walletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Look up proof by wallet hash
    const { data: proof, error: proofError } = await supabase
      .from("kyc_proofs")
      .select("*")
      .eq("wallet_hash", walletHash)
      .single();

    if (proofError || !proof) {
      // Check if there's a pending application
      const { data: application } = await supabase
        .from("kyc_applications")
        .select("status, requested_level")
        .eq("wallet_hash", walletHash)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single();

      if (application) {
        return NextResponse.json({
          hasProof: false,
          status: application.status,
          requestedLevel: application.requested_level,
          message:
            application.status === "pending"
              ? "Your KYC application is pending review"
              : application.status === "rejected"
              ? "Your KYC application was rejected. Please resubmit."
              : "No valid proof found",
        });
      }

      return NextResponse.json({
        hasProof: false,
        status: "none",
        message: "No KYC application found. Please submit KYC first.",
      });
    }

    // Check if proof is expired
    const now_seconds = Math.floor(Date.now() / 1000);
    if (proof.expiry < now_seconds) {
      return NextResponse.json({
        hasProof: false,
        status: "expired",
        expiredAt: proof.expiry,
        message: "Your KYC proof has expired. Please resubmit for verification.",
      });
    }

    // Return the proof
    return NextResponse.json({
      hasProof: true,
      proof: {
        level: proof.level,
        countryCode: proof.country_code,
        expiry: proof.expiry,
        signature: proof.signature,
      },
      expiresIn: proof.expiry - now_seconds,
      message: "Valid KYC proof found",
    });
  } catch (error) {
    console.error("Error fetching KYC proof:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint for requesting a fresh proof (if admin re-signs)
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

    // Verify signature
    const message = `Request Fresh KYC Proof\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return NextResponse.json(
        { error: "Request expired" },
        { status: 400 }
      );
    }

    let isValid = false;
    try {
      isValid = await verifyMessage({
        address: getAddress(walletAddress),
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Generate wallet hash
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET!;
    const walletHash = keccak256(
      toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`)
    );

    // Check for approved application that needs a fresh proof
    const { data: application } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("wallet_hash", walletHash)
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!application) {
      return NextResponse.json(
        { error: "No approved KYC application found" },
        { status: 404 }
      );
    }

    // Generate fresh proof
    const { signTypedData } = await import("viem/accounts");
    const signerPrivateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    
    const PROOF_VALIDITY_DAYS = parseInt(process.env.KYC_VALIDITY_DAYS || "365");
    const expiry = Math.floor(Date.now() / 1000) + PROOF_VALIDITY_DAYS * 24 * 60 * 60;

    const DOMAIN = {
      name: "RWA KYC Verifier",
      version: "1",
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1"),
      verifyingContract: process.env.KYC_VERIFIER_ADDRESS as `0x${string}`,
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
        level: application.current_level,
        countryCode: application.country_code,
        expiry: BigInt(expiry),
      },
    });

    // Update stored proof
    await supabase.from("kyc_proofs").upsert(
      {
        wallet_hash: walletHash,
        wallet_address: walletAddress,
        level: application.current_level,
        country_code: application.country_code,
        expiry,
        signature: proofSignature,
        created_at: new Date().toISOString(),
        application_id: application.id,
      },
      { onConflict: "wallet_hash" }
    );

    return NextResponse.json({
      success: true,
      proof: {
        level: application.current_level,
        countryCode: application.country_code,
        expiry,
        signature: proofSignature,
      },
    });
  } catch (error) {
    console.error("Error generating fresh proof:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}