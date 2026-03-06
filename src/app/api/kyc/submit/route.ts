// src/app/api/kyc/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import { encryptField } from "@/lib/encryption";
import { DEPLOYMENTS } from "@/config/deployments";
import type { SupportedChainId } from "@/config/chains";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KYCSubmission {
  walletAddress: string;
  signature: string;
  timestamp: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  countryCode?: number;
  requestedLevel: number;
  documents?: {
    idFront?: string;
    idBack?: string;
    selfie?: string;
    addressProof?: string;
    accreditedProof?: string;
  };
  livenessVerification?: {
    passed: boolean;
    score: number;
    completedChallenges: number;
    totalChallenges: number;
    screenshots?: string[];
  };
  verificationScore?: number;
  txHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: KYCSubmission = await request.json();
    const chainIdHeader = request.headers.get('x-chain-id');
    console.log('[KYC Submit] Chain ID from header:', chainIdHeader);
    console.log('[KYC Submit] Body keys:', Object.keys(body));
    console.log('[KYC Submit] Has txHash:', !!body.txHash);
    
    const {
      walletAddress,
      signature,
      timestamp,
      firstName,
      lastName,
      email,
      dateOfBirth,
      countryCode,
      requestedLevel,
      documents,
      livenessVerification,
      verificationScore,
    } = body;

    // Validate required auth fields
    if (!walletAddress || !signature || !timestamp) {
      console.log('[KYC Submit] Missing auth fields');
      return NextResponse.json(
        { error: "Missing authentication fields" },
        { status: 400 }
      );
    }

    // Verify timestamp (5 minute window)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return NextResponse.json(
        { error: "Request expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify signature - accept both formats
    const possibleMessages = [
      `Submit KYC Application\nWallet: ${walletAddress}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: ${requestedLevel}\nTimestamp: ${timestamp}`,
    ];

    let isValid = false;
    for (const message of possibleMessages) {
      try {
        isValid = await verifyMessage({
          address: getAddress(walletAddress),
          message,
          signature: signature as `0x${string}`,
        });
        if (isValid) {
          console.log('[KYC Submit] Signature verified');
          break;
        }
      } catch {}
    }

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

    // Check for existing approved application (to determine if this is an upgrade)
    const { data: existingUser } = await supabase
      .from("kyc_applications")
      .select("id, current_level, status, wallet_address, country_code, first_name, last_name, email, date_of_birth, documents, verification_score")
      .eq("wallet_hash", walletHash)
      .gte("current_level", 1)
      .order("current_level", { ascending: false })
      .limit(1)
      .single();

    const isUpgrade = !!existingUser && existingUser.current_level >= 1;
    const currentLevel = existingUser?.current_level || 0;

    console.log('[KYC Submit] isUpgrade:', isUpgrade, 'currentLevel:', currentLevel, 'requestedLevel:', requestedLevel);

    // For new users, require personal info
    if (!isUpgrade) {
      if (!firstName || !lastName || !email || !countryCode) {
        return NextResponse.json(
          { error: "Missing required personal information" },
          { status: 400 }
        );
      }
    }

    // Validate upgrade path
    if (isUpgrade && requestedLevel <= currentLevel) {
      return NextResponse.json(
        { error: `You are already at level ${currentLevel}. Select a higher level.` },
        { status: 400 }
      );
    }

    // Check for restricted countries
    const { data: settings } = await supabase
      .from("kyc_settings")
      .select("restricted_countries, auto_approval_enabled, auto_approval_max_level")
      .single();

    const userCountryCode = isUpgrade ? existingUser.country_code : countryCode;
    const restrictedCountries = settings?.restricted_countries || [408, 364, 760, 192];
    if (userCountryCode && restrictedCountries.includes(userCountryCode)) {
      return NextResponse.json(
        { error: "KYC applications from your jurisdiction are not accepted" },
        { status: 403 }
      );
    }

    // Get chain ID
    const chainId = Number(chainIdHeader) as SupportedChainId;
    if (!chainId) {
      return NextResponse.json(
        { error: "Missing chain ID" },
        { status: 400 }
      );
    }

    const deployment = DEPLOYMENTS[chainId as SupportedChainId];
    if (!deployment?.contracts?.KYCVerifier) {
      return NextResponse.json(
        { error: "KYC Verifier not deployed on this chain" },
        { status: 400 }
      );
    }

    // Common variables
    const hasPaid = !!body.txHash;
    const isBronze = requestedLevel === 1;

    // Handle UPGRADE flow
    if (isUpgrade) {
      console.log('[KYC Submit] Processing upgrade from level', currentLevel, 'to', requestedLevel);

      const mergedDocuments = {
        ...(existingUser.documents || {}),
        ...(documents || {}),
      };

      if (livenessVerification) {
        (mergedDocuments as any).livenessVerification = livenessVerification;
      }

      // Bronze upgrade with payment can be auto-approved
      const canAutoApproveUpgrade = settings?.auto_approval_enabled && isBronze && hasPaid && (verificationScore === undefined || verificationScore >= 80);

      // Determine status
      let newStatus: string;
      let newCurrentLevel: number;
      
      if (canAutoApproveUpgrade) {
        newStatus = "approved";
        newCurrentLevel = requestedLevel;
      } else if (hasPaid) {
        newStatus = "pending"; // Paid but needs manual review (Silver/Gold/Diamond)
        newCurrentLevel = existingUser.current_level;
      } else {
        newStatus = "pending_payment";
        newCurrentLevel = existingUser.current_level;
      }

      const { error: updateError } = await supabase
        .from("kyc_applications")
        .update({
          requested_level: requestedLevel,
          current_level: newCurrentLevel,
          status: newStatus,
          documents: mergedDocuments,
          verification_score: verificationScore || existingUser.verification_score,
          tx_hash: body.txHash || null,
          updated_at: new Date().toISOString(),
          approved_at: newStatus === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", existingUser.id);

      if (updateError) {
        console.error("Failed to update application:", updateError);
        return NextResponse.json(
          { error: "Failed to submit upgrade request" },
          { status: 500 }
        );
      }

      console.log('[KYC Submit] Upgrade status:', newStatus);

      return NextResponse.json({
        success: true,
        status: newStatus,
        autoApproved: newStatus === "approved",
        applicationId: existingUser.id,
        message: newStatus === "approved" 
          ? "Your upgrade has been approved!"
          : newStatus === "pending"
            ? "Your upgrade request has been submitted and is pending review."
            : "Please complete payment to finalize your upgrade.",
      });
    }

    // Handle NEW USER flow
    console.log('[KYC Submit] Processing new user application');

    // Check for existing application
    const { data: existingApp } = await supabase
      .from("kyc_applications")
      .select("id, status, requested_level")
      .eq("wallet_hash", walletHash)
      .eq("requested_level", requestedLevel)
      .single();

    if (existingApp) {
      console.log('[KYC Submit] Existing app found:', existingApp);

      if (existingApp.status === "pending" || existingApp.status === "pending_payment") {
        return NextResponse.json(
          { error: "You already have a pending application for this level" },
          { status: 400 }
        );
      }
      if (existingApp.status === "approved") {
        return NextResponse.json(
          { error: "You are already verified at this level" },
          { status: 400 }
        );
      }
      if (existingApp.status === "rejected") {
        // Delete rejected application to allow resubmission
        await supabase
          .from("kyc_applications")
          .delete()
          .eq("id", existingApp.id);

        await supabase
          .from("kyc_proofs")
          .delete()
          .eq("wallet_hash", walletHash)
          .eq("level", requestedLevel);
      }
    }

    // Encrypt PII fields
    const [encFirstName, encLastName, encEmail, encDOB] = await Promise.all([
      encryptField(firstName!),
      encryptField(lastName!),
      encryptField(email!),
      dateOfBirth ? encryptField(dateOfBirth) : null,
    ]);

    // Bronze with payment and good score can be auto-approved
    const canAutoApprove = settings?.auto_approval_enabled && isBronze && hasPaid && (verificationScore === undefined || verificationScore >= 80);

    // Determine status
    let newStatus: string;
    let newCurrentLevel: number;
    
    if (canAutoApprove) {
      newStatus = "approved";
      newCurrentLevel = requestedLevel;
    } else if (hasPaid) {
      newStatus = "pending"; // Paid but needs manual review (Silver/Gold/Diamond)
      newCurrentLevel = 0;
    } else {
      newStatus = "pending_payment";
      newCurrentLevel = 0;
    }

    console.log('[KYC Submit] New user status:', newStatus, 'canAutoApprove:', canAutoApprove);

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("kyc_applications")
      .insert({
        wallet_hash: walletHash,
        wallet_address: walletAddress,
        first_name: encFirstName,
        last_name: encLastName,
        email: encEmail,
        date_of_birth: encDOB,
        country_code: countryCode,
        requested_level: requestedLevel,
        current_level: newCurrentLevel,
        status: newStatus,
        verification_score: verificationScore,
        documents,
        tx_hash: body.txHash || null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approved_at: newStatus === "approved" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert application:", insertError);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    // Link wallet
    await supabase.from("linked_wallets").upsert(
      {
        wallet_hash: walletHash,
        wallet_address: walletAddress,
        is_primary: true,
        linked_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" }
    );

    // If auto-approved, also store proof for future use
    if (canAutoApprove) {
      const { signTypedData } = await import("viem/accounts");
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
          level: requestedLevel,
          countryCode: countryCode!,
          expiry: BigInt(expiry),
        },
      });

      await supabase.from("kyc_proofs").upsert(
        {
          wallet_hash: walletHash,
          wallet_address: walletAddress,
          level: requestedLevel,
          country_code: countryCode,
          expiry,
          signature: proofSignature,
          application_id: application.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "wallet_hash" }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      autoApproved: newStatus === "approved",
      applicationId: application.id,
      message: newStatus === "approved"
        ? "Your KYC has been approved!"
        : newStatus === "pending"
          ? "Your KYC application has been submitted and is pending review."
          : "Please complete payment to activate your KYC.",
    });

  } catch (error) {
    console.error("Error submitting KYC:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
