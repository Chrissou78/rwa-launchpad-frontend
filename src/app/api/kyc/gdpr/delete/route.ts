// src/app/api/kyc/gdpr/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";

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

    // Verify signature with explicit deletion consent message
    const message = `Request KYC Data Deletion\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\n\nI understand this action is irreversible and will delete all my KYC data.`;

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

    // Get documents to delete from storage
    const { data: documents } = await supabase
      .from("kyc_documents")
      .select("storage_path")
      .eq("wallet_hash", walletHash);

    // Delete documents from storage
    if (documents && documents.length > 0) {
      const paths = documents.map((d) => d.storage_path);
      await supabase.storage.from("kyc-documents").remove(paths);
    }

    // Delete all related data
    await Promise.all([
      supabase.from("kyc_documents").delete().eq("wallet_hash", walletHash),
      supabase.from("kyc_proofs").delete().eq("wallet_hash", walletHash),
      supabase.from("linked_wallets").delete().eq("wallet_hash", walletHash),
      supabase.from("wallet_link_codes").delete().eq("wallet_hash", walletHash),
      supabase.from("kyc_applications").delete().eq("wallet_hash", walletHash),
    ]);

    // Log the deletion for audit (keeping minimal info for legal compliance)
    await supabase.from("admin_audit_log").insert({
      action: "GDPR_DELETE",
      admin_address: walletAddress,
      target_id: walletHash.slice(0, 16) + "...", // Truncated for privacy
      target_type: "kyc_identity",
      details: {
        deletedAt: new Date().toISOString(),
        reason: "User GDPR deletion request",
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "All KYC data has been permanently deleted.",
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting KYC data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
