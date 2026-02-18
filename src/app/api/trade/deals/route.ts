// src/app/api/trade/deals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { notifyTradeInvitation } from '@/lib/notifications/send';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET - List deals for a user
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role'); // 'buyer' | 'seller' | 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('trade_deals')
      .select('*', { count: 'exact' });

    // Filter by role
    if (role === 'buyer') {
      query = query.eq('buyer_wallet', walletAddress.toLowerCase());
    } else if (role === 'seller') {
      query = query.eq('seller_wallet', walletAddress.toLowerCase());
    } else {
      query = query.or(`buyer_wallet.eq.${walletAddress.toLowerCase()},seller_wallet.eq.${walletAddress.toLowerCase()}`);
    }

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('stage', status);
    }

    // Pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      deals: data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

// POST - Create new deal
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const body = await request.json();
    const { buyer, seller, product, terms, milestones, buyerKycLevel, sellerKycLevel } = body;

    // Validate required fields
    if (!buyer?.walletAddress || !seller?.walletAddress) {
      return NextResponse.json({ error: 'Buyer and seller wallet addresses required' }, { status: 400 });
    }

    // Verify the creator is the buyer
    if (buyer.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Only buyer can create deals' }, { status: 403 });
    }

    // Validate milestones total 100%
    const totalPercentage = milestones.reduce((sum: number, m: any) => sum + m.paymentPercentage, 0);
    if (totalPercentage !== 100) {
      return NextResponse.json({ error: 'Milestone payments must total 100%' }, { status: 400 });
    }

    // Generate reference number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('trade_deals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    
    const reference = `DEAL-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Create deal
    const dealId = uuidv4();
    const totalValue = product.quantity * product.unitPrice;

    const dealData = {
      id: dealId,
      reference,
      title: `${product.name} from ${seller.companyName}`,
      description: product.description,
      
      // Buyer info
      buyer_wallet: buyer.walletAddress.toLowerCase(),
      buyer_company: buyer.companyName,
      buyer_country: buyer.country,
      buyer_registration_number: buyer.registrationNumber,
      buyer_address: buyer.address,
      buyer_contact_name: buyer.contactName,
      buyer_contact_email: buyer.contactEmail,
      buyer_contact_phone: buyer.contactPhone,
      buyer_kyc_level: buyerKycLevel || 'none',
      
      // Seller info
      seller_wallet: seller.walletAddress.toLowerCase(),
      seller_company: seller.companyName,
      seller_country: seller.country,
      seller_registration_number: seller.registrationNumber,
      seller_address: seller.address,
      seller_contact_name: seller.contactName,
      seller_contact_email: seller.contactEmail,
      seller_contact_phone: seller.contactPhone,
      seller_kyc_level: sellerKycLevel || 'none',
      
      // Product
      product_name: product.name,
      product_category: product.category,
      product_description: product.description,
      product_hs_code: product.hsCode,
      product_quantity: product.quantity,
      product_unit: product.unit,
      product_unit_price: product.unitPrice,
      product_currency: product.currency,
      product_specifications: product.specifications,
      product_total_value: totalValue,
      
      // Terms
      incoterm: terms.incoterm,
      origin_country: terms.originCountry,
      origin_port: terms.originPort,
      destination_country: terms.destinationCountry,
      destination_port: terms.destinationPort,
      delivery_date: terms.deliveryDate,
      payment_terms: terms.paymentTerms,
      inspection_required: terms.inspectionRequired,
      insurance_required: terms.insuranceRequired,
      
      // Escrow info
      escrow_amount: totalValue,
      escrow_funded: 0,
      escrow_released: 0,
      escrow_status: 'pending',
      
      // Status
      stage: 'draft',
      
      // Metadata
      created_by: walletAddress.toLowerCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: dealError } = await supabase
      .from('trade_deals')
      .insert(dealData);

    if (dealError) throw dealError;

    // Create milestones
    const milestonesData = milestones.map((m: any, index: number) => ({
      id: uuidv4(),
      deal_id: dealId,
      order_index: index,
      type: m.type,
      name: m.name,
      description: m.description,
      payment_percentage: m.paymentPercentage,
      payment_amount: (totalValue * m.paymentPercentage) / 100,
      auto_release: m.autoRelease,
      status: 'pending',
      created_at: new Date().toISOString(),
    }));

    const { error: milestonesError } = await supabase
      .from('trade_milestones')
      .insert(milestonesData);

    if (milestonesError) throw milestonesError;

    // Create initial timeline event
    const timelineEvent = {
      id: uuidv4(),
      deal_id: dealId,
      type: 'stage_change',
      title: 'Deal Created',
      description: `Deal initiated by ${buyer.companyName}`,
      actor: walletAddress.toLowerCase(),
      metadata: {
        stage: 'draft',
        buyer: buyer.companyName,
        seller: seller.companyName,
        value: totalValue,
      },
      created_at: new Date().toISOString(),
    };

    await supabase.from('trade_timeline').insert(timelineEvent);

    // =========================================================================
    // SEND NOTIFICATIONS
    // =========================================================================
    
    try {
      // Notify seller about the new deal invitation
      await notifyTradeInvitation(
        seller.walletAddress,
        {
          dealReference: reference,
          buyerName: buyer.companyName,
          productName: product.name,
          dealValue: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(totalValue),
          dealId,
        }
      );

      // Also create an in-app notification for the buyer (confirmation)
      await supabase.from('notifications').insert({
        id: uuidv4(),
        user_address: buyer.walletAddress.toLowerCase(),
        type: 'trade_update',
        title: 'Deal Created Successfully',
        message: `Your trade deal ${reference} with ${seller.companyName} has been created. Waiting for seller to accept.`,
        data: {
          dealId,
          dealReference: reference,
          sellerCompany: seller.companyName,
          totalValue,
        },
        priority: 'medium',
        action_url: `/trade/deals/${dealId}`,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notificationError) {
      // Don't fail the deal creation if notifications fail
      console.error('Error sending notifications:', notificationError);
    }

    return NextResponse.json({
      id: dealId,
      reference,
      message: 'Deal created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}
