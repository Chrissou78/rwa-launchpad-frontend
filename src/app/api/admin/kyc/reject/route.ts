import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REJECTION_REASONS: Record<string, string> = {
  invalid_document: "Invalid or unreadable document",
  expired_document: "Expired identity document",
  mismatch: "Information mismatch",
  selfie_mismatch: "Selfie does not match ID photo",
  restricted_country: "Restricted jurisdiction",
  suspicious_activity: "Suspicious activity detected",
  incomplete: "Incomplete documentation",
  other: "Other"
};

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const walletAddress = request.headers.get("x-wallet-address");
    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized - No wallet address" }, { status: 401 });
    }

    const adminCheck = await isAdmin(walletAddress);
    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { applicationId, reason, notes } = body;

    console.log("Reject endpoint received:", { applicationId, reason, notes, walletAddress });

    // Validate required fields
    if (!applicationId) {
      return NextResponse.json({ error: "Missing required field: applicationId" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "Missing required field: reason" }, { status: 400 });
    }

    // Validate reason
    if (!REJECTION_REASONS[reason]) {
      return NextResponse.json({ error: `Invalid rejection reason: ${reason}` }, { status: 400 });
    }

    // Get application
    const { data: application, error: fetchError } = await supabase
      .from("kyc_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (fetchError || !application) {
      console.error("Application fetch error:", fetchError);
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "pending") {
      return NextResponse.json({ error: `Application is not pending (current: ${application.status})` }, { status: 400 });
    }

    // Update application
    const { error: updateError } = await supabase
      .from("kyc_applications")
      .update({
        status: "rejected",
        rejection_reason: reason,
        rejection_reason_text: REJECTION_REASONS[reason],
        notes: notes || null,
        updated_at: new Date().toISOString(),
        rejected_by: walletAddress.toLowerCase(),
        rejected_at: new Date().toISOString()
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("admin_activity_log").insert({
        action: "REJECT_KYC",
        actor_address: walletAddress.toLowerCase(),
        target_address: application.wallet_address?.toLowerCase() || null,
        details: {
          application_id: applicationId,
          wallet_hash: application.wallet_hash,
          requested_level: application.requested_level,
          reason,
          reason_text: REJECTION_REASONS[reason],
          notes: notes || null
        },
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error("Activity log error:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Application rejected successfully"
    });

  } catch (error) {
    console.error("Reject endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
