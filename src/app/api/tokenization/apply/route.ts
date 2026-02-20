// src/app/api/tokenization/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();

    // Map form asset types to database types
    const assetTypeMap: Record<string, string> = {
      'company_equity': 'business_equity',
      'real_estate': 'real_estate',
      'commodity': 'commodities',
      'product_inventory': 'commodities',
      'intellectual_property': 'revenue_based',
      'revenue_stream': 'revenue_based',
      'equipment': 'infrastructure',
      'vehicles': 'infrastructure',
      'agricultural': 'commodities',
      'energy': 'infrastructure',
      'other': 'other',
    };

    // Parse estimated value
    const estimatedValue = parseFloat(body.estimatedValue?.replace(/[^0-9.]/g, '') || '0');

    // Calculate fee based on options
    // Base: $750 (Project NFT + ERC-3643 Token)
    // Escrow: +$250
    // Dividends: +$200
    let feeAmount = 750;
    if (body.needsEscrow) feeAmount += 250;
    if (body.needsDividends) feeAmount += 200;

    // Create application
    const { data: application, error: appError } = await supabase
      .from('tokenization_applications')
      .insert({
        user_address: walletAddress.toLowerCase(),
        asset_name: body.assetName || 'Unnamed Asset',
        asset_type: assetTypeMap[body.assetType] || 'other',
        asset_description: body.assetDescription || '',
        asset_location: null,
        asset_country: 'Not Specified',
        estimated_value: estimatedValue,
        currency: 'USD',
        valuation_source: null,
        desired_token_supply: body.totalSupply ? parseInt(body.totalSupply.replace(/[^0-9]/g, '')) : null,
        token_price_estimate: null,
        fundraising_goal: null,
        needs_escrow: body.needsEscrow || false,
        needs_dividends: body.needsDividends || false,
        ownership_proof_type: null,
        legal_entity_name: body.companyName || null,
        legal_entity_type: null,
        legal_jurisdiction: null,
        contact_name: body.contactName || '',
        contact_email: body.email || '',
        contact_phone: body.phone || null,
        contact_telegram: null,
        fee_amount: feeAmount,
        fee_currency: 'USDC',
        status: 'pending',
        token_type: 'nft_and_token',
        documents: JSON.stringify({
          files: body.documents || [],
          website: body.website,
          useCase: body.useCase,
          tokenName: body.tokenName,
          tokenSymbol: body.tokenSymbol,
          additionalInfo: body.additionalInfo,
          originalAssetType: body.assetType,
        }),
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating application:', appError);
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        fee_amount: application.fee_amount,
        fee_currency: application.fee_currency,
        needs_escrow: application.needs_escrow,
        needs_dividends: application.needs_dividends,
      },
    });
  } catch (error) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Get user's applications
export async function GET(request: NextRequest) {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: applications, error } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('user_address', walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    return NextResponse.json({ applications: applications || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}