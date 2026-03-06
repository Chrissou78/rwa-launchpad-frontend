// src/app/api/admin/kyc/document/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminAddress = request.headers.get("x-wallet-address");
  
  // Verify admin
  if (adminAddress?.toLowerCase() !== process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = params.id;

  try {
    // Fetch document record
    const { data: doc, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // If stored in Google Drive, return the URL directly
    if (doc.storage_url) {
      return NextResponse.json({ url: doc.storage_url });
    }

    // If stored in Supabase storage, generate signed URL
    if (doc.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry

      if (signedUrl) {
        return NextResponse.json({ url: signedUrl.signedUrl });
      }
    }

    return NextResponse.json({ error: "Document URL not available" }, { status: 404 });
  } catch (err) {
    console.error("Error fetching document:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
