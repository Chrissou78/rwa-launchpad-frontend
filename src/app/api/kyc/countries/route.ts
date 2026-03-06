// src/app/api/kyc/countries/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: countries, error } = await supabase
      .from("countries")
      .select("code, name, alpha2, is_restricted")
      .eq("is_restricted", false)
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to fetch countries:", error);
      return NextResponse.json(
        { error: "Failed to fetch countries" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      countries: countries || [],
      total: countries?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
