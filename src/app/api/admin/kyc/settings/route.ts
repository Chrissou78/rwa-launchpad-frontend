// src/app/api/admin/kyc/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin, isSuperAdmin } from "@/lib/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_SETTINGS = {
  autoApprovalEnabled: false,
  autoApprovalMaxLevel: 1,
  restrictedCountries: [408, 364, 760, 192], // NK, Iran, Syria, Cuba
  minVerificationScore: 80,
  requireLivenessCheck: true,
  documentExpiryWarningDays: 30,
};

export async function GET(request: NextRequest) {
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

    // Fetch settings from database
    const { data, error } = await supabase
      .from("kyc_settings")
      .select("*")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Failed to fetch settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Merge with defaults
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(data || {}),
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdminCheck = await isSuperAdmin(walletAddress);
    if (!superAdminCheck) {
      return NextResponse.json({ error: "Forbidden - Super admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      autoApprovalEnabled,
      autoApprovalMaxLevel,
      restrictedCountries,
      minVerificationScore,
      requireLivenessCheck,
      documentExpiryWarningDays,
    } = body;

    // Validate auto-approval max level (can't auto-approve accredited/institutional)
    if (autoApprovalMaxLevel !== undefined && autoApprovalMaxLevel > 2) {
      return NextResponse.json(
        { error: "Auto-approval max level cannot exceed 2 (Standard)" },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (autoApprovalEnabled !== undefined) {
      updateData.auto_approval_enabled = autoApprovalEnabled;
    }
    if (autoApprovalMaxLevel !== undefined) {
      updateData.auto_approval_max_level = autoApprovalMaxLevel;
    }
    if (restrictedCountries !== undefined) {
      updateData.restricted_countries = restrictedCountries;
    }
    if (minVerificationScore !== undefined) {
      updateData.min_verification_score = minVerificationScore;
    }
    if (requireLivenessCheck !== undefined) {
      updateData.require_liveness_check = requireLivenessCheck;
    }
    if (documentExpiryWarningDays !== undefined) {
      updateData.document_expiry_warning_days = documentExpiryWarningDays;
    }

    // Upsert settings
    const { error } = await supabase.from("kyc_settings").upsert(
      {
        id: 1, // Single row for global settings
        ...updateData,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to update settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    // Log the change (ignore errors for audit log)
    try {
      await supabase.from("admin_activity_log").insert({
        action: "UPDATE_KYC_SETTINGS",
        actor_address: walletAddress.toLowerCase(),
        target_address: null,
        details: updateData,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to log activity:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
