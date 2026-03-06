// src/app/api/admin/kyc/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { decryptField } from "@/lib/encryption";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build query - removed linked_wallets as it may not exist
    let query = supabase
      .from("kyc_applications")
      .select(
        `
        id,
        wallet_hash,
        wallet_address,
        first_name,
        last_name,
        email,
        date_of_birth,
        country_code,
        requested_level,
        current_level,
        status,
        submitted_at,
        updated_at,
        verification_score,
        rejection_reason,
        notes,
        documents
      `,
        { count: "exact" }
      )
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,wallet_hash.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch applications" },
        { status: 500 }
      );
    }

    // Get country names
    const { data: countries } = await supabase
      .from("countries")
      .select("code, name");

    const countryMap = new Map(
      countries?.map((c) => [c.code, c.name]) || []
    );

    // Transform data for response (decrypt sensitive fields)
    const applications = await Promise.all(
      (data || []).map(async (app) => {
        let firstName = "";
        let lastName = "";
        let email = "";
        let dob = "";

        // Decrypt PII fields with error handling
        try {
          firstName = app.first_name ? await decryptField(app.first_name) : "";
        } catch (e) {
          firstName = "[Decryption Error]";
        }
        try {
          lastName = app.last_name ? await decryptField(app.last_name) : "";
        } catch (e) {
          lastName = "[Decryption Error]";
        }
        try {
          email = app.email ? await decryptField(app.email) : "";
        } catch (e) {
          email = "[Decryption Error]";
        }
        try {
          dob = app.date_of_birth ? await decryptField(app.date_of_birth) : "";
        } catch (e) {
          dob = "[Decryption Error]";
        }

        // Create wallet preview
        const walletPreview = app.wallet_address
          ? `${app.wallet_address.slice(0, 6)}...${app.wallet_address.slice(-4)}`
          : app.wallet_hash
          ? `${app.wallet_hash.slice(0, 6)}...${app.wallet_hash.slice(-4)}`
          : "";

        return {
          id: app.id,
          walletHash: app.wallet_hash,
          walletAddress: app.wallet_address,
          walletPreview,
          firstName,
          lastName,
          email,
          dateOfBirth: dob,
          countryCode: app.country_code,
          countryName: countryMap.get(app.country_code) || `Code: ${app.country_code}`,
          requestedLevel: app.requested_level,
          currentLevel: app.current_level || 0,
          status: app.status,
          submittedAt: app.submitted_at,
          verificationScore: app.verification_score,
          rejectionReason: app.rejection_reason,
          notes: app.notes,
          documents: app.documents || {},
          linkedWallets: [],
        };
      })
    );

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
