// src/app/api/kyc/pending-upgrades/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization here
    // const authHeader = request.headers.get('authorization');
    // ... validate admin token

    const supabase = getSupabaseAdmin();

    // Fetch all pending upgrade submissions
    const { data: pendingUpgrades, error: upgradesError } = await supabase
      .from('kyc_submissions')
      .select(`
        id,
        wallet_address,
        requested_level,
        current_level,
        status,
        created_at,
        full_name,
        email,
        date_of_birth,
        country_code,
        document_type,
        document_number,
        expiry_date,
        tx_hash,
        id_document_front_url,
        id_document_back_url,
        selfie_url,
        address_proof_url,
        accredited_proof_url,
        id_validation_score,
        id_validation_passed,
        id_requires_manual_review,
        id_extracted_data,
        id_found_text,
        id_matches,
        mrz_detected,
        mrz_data,
        face_score,
        liveness_score,
        liveness_passed
      `)
      .eq('is_upgrade', true)
      .in('status', ['Pending', 'ManualReview', 'AutoVerifying'])
      .order('created_at', { ascending: false });

    if (upgradesError) {
      console.error('Error fetching pending upgrades:', upgradesError);
      throw upgradesError;
    }

    // Also fetch regular pending submissions (non-upgrades)
    const { data: pendingSubmissions, error: submissionsError } = await supabase
      .from('kyc_submissions')
      .select(`
        id,
        wallet_address,
        requested_level,
        current_level,
        status,
        created_at,
        full_name,
        email,
        date_of_birth,
        country_code,
        document_type,
        document_number,
        expiry_date,
        tx_hash,
        id_document_front_url,
        id_document_back_url,
        selfie_url,
        address_proof_url,
        accredited_proof_url,
        id_validation_score,
        id_validation_passed,
        id_requires_manual_review,
        id_extracted_data,
        id_found_text,
        id_matches,
        mrz_detected,
        mrz_data,
        face_score,
        liveness_score,
        liveness_passed
      `)
      .eq('is_upgrade', false)
      .in('status', ['Pending', 'ManualReview', 'AutoVerifying'])
      .order('created_at', { ascending: false });

    if (submissionsError) {
      console.error('Error fetching pending submissions:', submissionsError);
      throw submissionsError;
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transformKeys = (obj: any) => {
      if (!obj) return obj;
      const transformed: any = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformed[camelKey] = obj[key];
      }
      return transformed;
    };

    const transformedUpgrades = (pendingUpgrades || []).map(transformKeys);
    const transformedSubmissions = (pendingSubmissions || []).map(transformKeys);

    return NextResponse.json({
      success: true,
      pendingUpgrades: transformedUpgrades,
      pendingSubmissions: transformedSubmissions,
      totalPendingUpgrades: transformedUpgrades.length,
      totalPendingSubmissions: transformedSubmissions.length,
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}
