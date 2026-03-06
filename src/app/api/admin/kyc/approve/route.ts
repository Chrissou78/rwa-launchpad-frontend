// src/app/api/admin/kyc/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAddress } from "viem";
import { privateKeyToAccount, signTypedData } from "viem/accounts";
import { isAdmin } from "@/lib/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Proof validity duration (365 days by default)
const PROOF_VALIDITY_DAYS = parseInt(process.env.KYC_VALIDITY_DAYS || "365");

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await isAdmin(walletAddress);
    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const chainIdHeader = request.headers.get('x-chain-id');
    const chainId = chainIdHeader ? parseInt(chainIdHeader) : parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1");

    const body = await request.json();
    const { applicationId, notes } = body;

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json(
        { error: "Missing application ID" },
        { status: 400 }
      );
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Application is not pending" },
        { status: 400 }
      );
    }

    // Get the user's wallet address - check application first, then linked_wallets
    let userWalletAddress = application.wallet_address;

    if (!userWalletAddress) {
      const { data: walletData } = await supabase
        .from("linked_wallets")
        .select("wallet_address")
        .eq("wallet_hash", application.wallet_hash)
        .eq("is_primary", true)
        .single();

      userWalletAddress = walletData?.wallet_address;
    }

    if (!userWalletAddress) {
      return NextResponse.json(
        { error: "No wallet address found for this application" },
        { status: 400 }
      );
    }

    // Calculate expiry (current time + validity period)
    const expiry = Math.floor(Date.now() / 1000) + PROOF_VALIDITY_DAYS * 24 * 60 * 60;

    // Generate EIP-712 signed proof if private key is configured
    let proofSignature = null;
    const signerPrivateKey = process.env.VERIFIER_PRIVATE_KEY as `0x${string}`;
    
    if (signerPrivateKey) {
      try {
        // Get verifier contract address for this chain
        const { getChainById } = await import("@/config/chains");
        const chainConfig = getChainById(chainId);
        const verifierAddress = chainConfig?.contracts?.KYCVerifier;

        if (verifierAddress) {
          // EIP-712 Domain
          const DOMAIN = {
            name: "RWA KYC Verifier",
            version: "1",
            chainId: chainId,
            verifyingContract: verifierAddress as `0x${string}`,
          };

          // EIP-712 Types
          const KYC_PROOF_TYPES = {
            KYCProof: [
              { name: "wallet", type: "address" },
              { name: "level", type: "uint8" },
              { name: "countryCode", type: "uint16" },
              { name: "expiry", type: "uint256" },
            ],
          } as const;

          // Create the proof message
          const proofMessage = {
            wallet: getAddress(userWalletAddress),
            level: application.requested_level,
            countryCode: application.country_code,
            expiry: BigInt(expiry),
          };

          // Sign the proof using EIP-712
          proofSignature = await signTypedData({
            privateKey: signerPrivateKey,
            domain: DOMAIN,
            types: KYC_PROOF_TYPES,
            primaryType: "KYCProof",
            message: proofMessage,
          });
        }
      } catch (e) {
        console.error("Failed to generate proof signature:", e);
        // Continue without signature - manual approval still works
      }
    }

    // Update application status in database
    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({
        status: "approved",
        current_level: application.requested_level,
        updated_at: new Date().toISOString(),
        approved_by: walletAddress,
        approved_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Failed to update application:", updateError);
      return NextResponse.json(
        { error: "Failed to update application" },
        { status: 500 }
      );
    }

    // Store the proof for the user to retrieve
    try {
      await supabase.from("kyc_proofs").upsert(
        {
          wallet_hash: application.wallet_hash,
          wallet_address: userWalletAddress,
          level: application.requested_level,
          country_code: application.country_code,
          expiry,
          signature: proofSignature,
          created_at: new Date().toISOString(),
          application_id: applicationId,
        },
        {
          onConflict: "wallet_hash",
        }
      );
    } catch (e) {
      console.error("Failed to store proof:", e);
      // Don't fail the request
    }

    // Log the admin action
    try {
      await supabase.from("admin_activity_log").insert({
        action: "APPROVE_KYC",
        actor_address: walletAddress.toLowerCase(),
        target_address: userWalletAddress,
        details: {
          application_id: applicationId,
          wallet_hash: application.wallet_hash,
          requested_level: application.requested_level,
          notes,
        },
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to log activity:", e);
    }

    return NextResponse.json({
      success: true,
      proof: proofSignature ? {
        level: application.requested_level,
        countryCode: application.country_code,
        expiry,
        signature: proofSignature,
      } : null,
      message: proofSignature 
        ? "Application approved successfully. User can now register on-chain."
        : "Application approved successfully. Proof signature not generated (missing config).",
    });
  } catch (error) {
    console.error("Error approving application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
