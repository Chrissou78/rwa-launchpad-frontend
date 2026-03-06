// src/app/api/kyc/gdpr/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import { decryptField } from "@/lib/encryption";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const message = `Export KYC Data\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

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

    // Get all KYC data for this wallet
    const { data: applications } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("wallet_hash", walletHash);

    const { data: linkedWallets } = await supabase
      .from("linked_wallets")
      .select("wallet_address, is_primary, linked_at")
      .eq("wallet_hash", walletHash);

    const { data: proofs } = await supabase
      .from("kyc_proofs")
      .select("level, country_code, expiry, created_at, used_at")
      .eq("wallet_hash", walletHash);

    const { data: documents } = await supabase
      .from("kyc_documents")
      .select("document_type, file_name, file_size, uploaded_at")
      .eq("wallet_hash", walletHash);

    // Decrypt PII fields
    const decryptedApplications = await Promise.all(
      (applications || []).map(async (app) => ({
        id: app.id,
        firstName: app.first_name ? await decryptField(app.first_name) : null,
        lastName: app.last_name ? await decryptField(app.last_name) : null,
        email: app.email ? await decryptField(app.email) : null,
        dateOfBirth: app.date_of_birth ? await decryptField(app.date_of_birth) : null,
        countryCode: app.country_code,
        requestedLevel: app.requested_level,
        currentLevel: app.current_level,
        status: app.status,
        verificationScore: app.verification_score,
        rejectionReason: app.rejection_reason,
        submittedAt: app.submitted_at,
        updatedAt: app.updated_at,
        approvedAt: app.approved_at,
        rejectedAt: app.rejected_at,
      }))
    );

    // Compile export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      walletAddress,
      applications: decryptedApplications,
      linkedWallets: linkedWallets || [],
      proofs: proofs || [],
      documents: (documents || []).map((d) => ({
        type: d.document_type,
        fileName: d.file_name,
        fileSize: d.file_size,
        uploadedAt: d.uploaded_at,
      })),
    };

    // Log the export for audit
    await supabase.from("admin_audit_log").insert({
      action: "GDPR_EXPORT",
      admin_address: walletAddress,
      target_id: walletHash,
      target_type: "kyc_identity",
      details: { exportedAt: exportData.exportedAt },
      created_at: new Date().toISOString(),
    });

    // Return as JSON file
    const jsonBlob = JSON.stringify(exportData, null, 2);
    
    return new NextResponse(jsonBlob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kyc-export-${walletAddress.slice(0, 8)}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting KYC data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
