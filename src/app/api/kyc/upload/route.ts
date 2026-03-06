// src/app/api/kyc/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage, getAddress, keccak256, toHex } from "viem";
import crypto from "crypto";
import { uploadToGoogleDrive, getFileUrl } from "@/lib/googleDrive";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOCUMENT_TYPES = [
  "idFront",
  "idBack",
  "selfie",
  "addressProof",
  "accreditedProof",
  "livenessScreenshot",
  "other",
];

// Initialize Supabase client
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

export async function POST(request: NextRequest) {
  console.log("=== KYC UPLOAD API CALLED ===");
  
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const walletAddress = formData.get("walletAddress") as string | null;
    const signature = formData.get("signature") as string | null;
    const timestamp = formData.get("timestamp") as string | null;

    console.log("Received:", { 
      hasFile: !!file, 
      fileSize: file?.size,
      fileType: file?.type,
      docType: type, 
      wallet: walletAddress?.slice(0, 10), 
      hasSignature: !!signature,
      timestamp 
    });

    // Validate required fields
    if (!file || !type || !walletAddress || !signature || !timestamp) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields", 
          details: { 
            file: !!file, 
            type: !!type, 
            walletAddress: !!walletAddress, 
            signature: !!signature, 
            timestamp: !!timestamp 
          } 
        },
        { status: 400 }
      );
    }

    // Validate document type
    if (!DOCUMENT_TYPES.includes(type)) {
      console.error("Invalid document type:", type);
      return NextResponse.json(
        { success: false, error: `Invalid document type: ${type}` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, PDF` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Validate timestamp (5 minute window)
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      console.error("Request expired:", { requestTime, now, diff: Math.abs(now - requestTime) });
      return NextResponse.json(
        { success: false, error: "Request expired" },
        { status: 400 }
      );
    }

    // Verify signature
    const possibleMessages = [
      `Upload KYC Document\nWallet: ${walletAddress}\nType: ${type}\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: 1\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: 2\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: 3\nTimestamp: ${timestamp}`,
      `KYC Application\nWallet: ${walletAddress}\nLevel: 4\nTimestamp: ${timestamp}`,
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
          console.log('✅ Signature verified');
          break;
        }
      } catch {}
    }

    if (!isValid) {
      console.log('❌ Signature verification failed');
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }
    console.log("✅ Signature verified");

    // Generate document ID and wallet hash
    const documentId = crypto.randomUUID();
    const walletHashSecret = process.env.KYC_WALLET_HASH_SECRET || "default-secret";
    const walletHash = keccak256(toHex(`${walletAddress.toLowerCase()}:${walletHashSecret}`));

    console.log("Document ID:", documentId);
    console.log("Wallet Hash:", walletHash.slice(0, 20) + "...");

    // Check if Google Drive is configured
    const hasGoogleDrive = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );

    if (!hasGoogleDrive) {
      console.log("⚠️ Google Drive not configured - returning mock response");
      return NextResponse.json({
        success: true,
        documentId,
        type,
        fileName: file.name,
        fileSize: file.size,
        url: null,
        message: "Document uploaded successfully (mock - Google Drive not configured)",
      });
    }

    // Upload to Google Drive
    let fileId: string;
    let webViewLink: string;
    
    try {
      const fileExtension = file.name.split(".").pop() || "bin";
      const fileName = `${documentId}.${fileExtension}`;
      const folderPath = `kyc/${walletHash.slice(0, 16)}/${type}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log("📤 Uploading to Google Drive...", { fileName, folderPath });
      
      const result = await uploadToGoogleDrive(
        buffer,
        fileName,
        file.type,
        folderPath
      );
      
      fileId = result.fileId;
      webViewLink = result.webViewLink;

      console.log("✅ File uploaded to Google Drive:", fileId);
    } catch (uploadError: any) {
      console.error("❌ Google Drive upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload document to storage" },
        { status: 500 }
      );
    }

    // Store document metadata in Supabase
    const supabase = getSupabase();
    
    if (supabase) {
      console.log("📝 Saving document metadata to database...");
      
      const documentRecord = {
        id: documentId,
        wallet_hash: walletHash,
        document_type: type,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_provider: "google_drive",
        storage_id: fileId,
        uploaded_at: new Date().toISOString(),
      };
      
      console.log("Document record:", JSON.stringify(documentRecord, null, 2));
      
      const { data, error } = await supabase
        .from("kyc_documents")
        .insert(documentRecord)
        .select()
        .single();
      
      if (error) {
        console.error("❌ Database insert FAILED:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        // Don't fail the request - document is already in Google Drive
      } else {
        console.log("✅ Document metadata saved to database:", data?.id);
      }
      
      // Verify the insert
      const { data: verifyData, error: verifyError } = await supabase
        .from("kyc_documents")
        .select("id")
        .eq("id", documentId)
        .single();
        
      if (verifyError || !verifyData) {
        console.error("❌ Verification FAILED - document not found after insert:", verifyError);
      } else {
        console.log("✅ Verified document exists in database");
      }
    } else {
      console.warn("⚠️ Supabase not configured - skipping database save");
    }

    return NextResponse.json({
      success: true,
      documentId,
      type,
      fileName: file.name,
      fileSize: file.size,
      url: webViewLink,
      message: "Document uploaded successfully",
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve document URL (for admin viewing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");
    const adminAddress = searchParams.get("admin");

    console.log("GET document request:", { documentId, adminAddress: adminAddress?.slice(0, 10) });

    if (!documentId || !adminAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify admin
    const { isAdmin } = await import("@/lib/admin");
    const isAdminUser = await isAdmin(adminAddress);
    
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabase();
    
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    console.log("Fetching document:", documentId);
    
    const { data: document, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) {
      console.error("Document not found in database:", documentId, error);
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document) {
      console.error("Document is null:", documentId);
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    console.log("Found document:", { id: document.id, type: document.document_type, provider: document.storage_provider });

    // Get URL based on storage provider
    let url: string | null = null;

    if (document.storage_provider === "google_drive" && document.storage_id) {
      try {
        url = await getFileUrl(document.storage_id);
        console.log("Generated Google Drive URL for:", document.storage_id);
      } catch (urlErr) {
        console.error("Failed to get Google Drive URL:", urlErr);
      }
    } else if (document.storage_path) {
      // Legacy Supabase storage
      const { data: urlData } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(document.storage_path, 900);
      url = urlData?.signedUrl || null;
    }

    if (!url) {
      console.error("Failed to generate URL for document:", documentId);
      return NextResponse.json(
        { success: false, error: "Failed to generate document URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId,
      type: document.document_type,
      fileName: document.file_name,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      url,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
