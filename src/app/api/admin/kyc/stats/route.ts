// src/app/api/admin/kyc/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { createPublicClient, http, formatEther } from "viem";
import { getChainById } from "@/config/chains";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KYC_VERIFIER_ABI = [
  {
    name: "totalFeesCollected",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Fetch stats from Supabase
    const [
      { count: totalApplications },
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount },
      { count: approvedToday },
      { count: rejectedToday },
    ] = await Promise.all([
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected"),
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .gte("updated_at", todayISO),
      supabase
        .from("kyc_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected")
        .gte("updated_at", todayISO),
    ]);

    // Fetch total fees from contract
    let totalFeesCollected = "0";
    try {
      const chainIdHeader = request.headers.get('x-chain-id');
      const chainId = chainIdHeader ? parseInt(chainIdHeader) : parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "137");
      const chainConfig = getChainById(chainId);

      if (chainConfig?.contracts?.KYCVerifier) {
        const publicClient = createPublicClient({
          chain: chainConfig.chain,
          transport: http(chainConfig.rpcUrl),
        });

        const fees = await publicClient.readContract({
          address: chainConfig.contracts.KYCVerifier as `0x${string}`,
          abi: KYC_VERIFIER_ABI,
          functionName: "totalFeesCollected",
        });

        totalFeesCollected = formatEther(fees);
      }
    } catch (e) {
      console.error("Failed to fetch contract fees:", e);
    }

    return NextResponse.json({
      total: totalApplications || 0,
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      rejected: rejectedCount || 0,
      totalApplications: totalApplications || 0,
      pendingCount: pendingCount || 0,
      approvedToday: approvedToday || 0,
      rejectedToday: rejectedToday || 0,
      totalFeesCollected,
      averageProcessingTime: "N/A",
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
