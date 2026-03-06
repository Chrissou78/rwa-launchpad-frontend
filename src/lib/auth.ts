// src/lib/auth.ts
import { NextRequest } from "next/server";
import { verifyMessage, getAddress } from "viem";

interface AuthResult {
  authorized: boolean;
  adminAddress?: string;
  error?: string;
}

export async function verifyAdminAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get admin address from header or cookie
    const adminAddress = request.headers.get("x-admin-address");
    const signature = request.headers.get("x-admin-signature");
    const timestamp = request.headers.get("x-admin-timestamp");

    // For GET requests, we can use a simpler check (address only)
    if (request.method === "GET") {
      if (!adminAddress) {
        // Try to get from query params for simple requests
        const { searchParams } = new URL(request.url);
        const queryAdmin = searchParams.get("admin");
        
        if (queryAdmin) {
          const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
          if (queryAdmin.toLowerCase() === expectedAdmin) {
            return { authorized: true, adminAddress: queryAdmin };
          }
        }
        
        return { authorized: false, error: "Missing admin address" };
      }

      const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
      if (adminAddress.toLowerCase() !== expectedAdmin) {
        return { authorized: false, error: "Unauthorized admin address" };
      }

      return { authorized: true, adminAddress };
    }

    // For POST/PUT/DELETE, require signature verification
    if (!adminAddress || !signature || !timestamp) {
      return { authorized: false, error: "Missing authentication headers" };
    }

    const expectedAdmin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
    if (adminAddress.toLowerCase() !== expectedAdmin) {
      return { authorized: false, error: "Unauthorized admin address" };
    }

    // Verify timestamp is within 5 minutes
    const requestTime = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - requestTime) > 300) {
      return { authorized: false, error: "Request expired" };
    }

    // Verify signature
    const message = `Admin Authentication\nAddress: ${adminAddress}\nTimestamp: ${timestamp}`;
    
    const isValid = await verifyMessage({
      address: getAddress(adminAddress),
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return { authorized: false, error: "Invalid signature" };
    }

    return { authorized: true, adminAddress };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { authorized: false, error: "Authentication failed" };
  }
}

// Helper to create auth headers for admin API calls
export function createAdminAuthHeaders(
  address: string,
  signature: string,
  timestamp: number
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-admin-address": address,
    "x-admin-signature": signature,
    "x-admin-timestamp": timestamp.toString(),
  };
}