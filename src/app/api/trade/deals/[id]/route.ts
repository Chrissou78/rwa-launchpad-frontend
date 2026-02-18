// src/app/api/trade/deals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Stage transition notifications mapping
const STAGE_NOTIFICATIONS: Record<string, {
  title: string;
  getMessage: (deal: any, actor: string) => string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}> = {
  loi_pending: {
    title: 'Letter of Intent Pending',
    getMessage: (deal) => `The Letter of Intent for deal ${deal.reference} is ready for signature.`,
    priority: 'high',
  },
  loi_signed: {
    title: 'Letter of Intent Signed',
    getMessage: (deal) => `The Letter of Intent for deal ${deal.reference} has been signed by both parties.`,
    priority: 'medium',
  },
  escrow_pending: {
    title: 'Escrow Funding Required',
    getMessage: (deal) => `Deal ${deal.reference} is ready for escrow funding.`,
    priority: 'high',
  },
  escrow_funded: {
    title: 'Escrow Funded',
    getMessage: (deal) => `Escrow for deal ${deal.reference} has been funded. Production can begin.`,
    priority: 'high',
  },
  in_production: {
    title: 'Production Started',
    getMessage: (deal) => `Production has started for deal ${deal.reference}.`,
    priority: 'medium',
  },
  quality_check: {
    title: 'Quality Check Required',
    getMessage: (deal) => `Quality inspection is required for deal ${deal.reference}.`,
    priority: 'medium',
  },
  shipping: {
    title: 'Goods Shipped',
    getMessage: (deal) => `Goods for deal ${deal.reference} have been shipped.`,
    priority: 'high',
  },
  delivered: {
    title: 'Goods Delivered',
    getMessage: (deal) => `Goods for deal ${deal.reference} have been delivered.`,
    priority: 'high',
  },
  completed: {
    title: 'Deal Completed',
    getMessage: (deal) => `Deal ${deal.reference} has been completed successfully.`,
    priority: 'medium',
  },
  cancelled: {
    title: 'Deal Cancelled',
    getMessage: (deal) => `Deal ${deal.reference} has been cancelled.`,
    priority: 'high',
  },
  disputed: {
    title: 'Dispute Opened',
    getMessage: (deal) => `A dispute has been opened for deal ${deal.reference}.`,
    priority: 'critical',
  },
};

// GET - Get deal details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const dealId = params.id;

    // Fetch deal
    const { data: deal, error: dealError } = await supabase
      .from('trade_deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check access - only buyer or seller can view
    const lowerWallet = walletAddress.toLowerCase();
    if (deal.buyer_wallet !== lowerWallet && deal.seller_wallet !== lowerWallet) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch milestones
    const { data: milestones } = await supabase
      .from('trade_milestones')
      .select('*')
      .eq('deal_id', dealId)
      .order('order_index', { ascending: true });

    // Fetch documents
    const { data: documents } = await supabase
      .from('trade_documents')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    // Fetch timeline
    const { data: timeline } = await supabase
      .from('trade_timeline')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch messages count
    const { count: unreadMessages } = await supabase
      .from('trade_messages')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', dealId)
      .not('read_by', 'cs', `{${walletAddress.toLowerCase()}}`);

    // Determine user role
    const userRole = deal.buyer_wallet === lowerWallet ? 'buyer' : 'seller';

    return NextResponse.json({
      deal,
      milestones: milestones || [],
      documents: documents || [],
      timeline: timeline || [],
      unreadMessages: unreadMessages || 0,
      userRole,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

// PATCH - Update deal (stage changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const dealId = params.id;
    const body = await request.json();
    const { stage, escrowTxHash, escrowFunded, metadata } = body;

    // Fetch existing deal
    const { data: deal, error: fetchError } = await supabase
      .from('trade_deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (fetchError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check access
    const lowerWallet = walletAddress.toLowerCase();
    if (deal.buyer_wallet !== lowerWallet && deal.seller_wallet !== lowerWallet) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Handle stage transition
    if (stage && stage !== deal.stage) {
      // Validate stage transition
      const validTransitions = getValidTransitions(deal.stage, lowerWallet === deal.buyer_wallet ? 'buyer' : 'seller');
      if (!validTransitions.includes(stage)) {
        return NextResponse.json({ 
          error: `Invalid stage transition from ${deal.stage} to ${stage}` 
        }, { status: 400 });
      }

      updateData.stage = stage;
      updateData.stage_updated_at = new Date().toISOString();

      // Create timeline event
      const timelineEvent = {
        id: uuidv4(),
        deal_id: dealId,
        type: 'stage_change',
        title: `Stage changed to ${formatStageName(stage)}`,
        description: `Deal moved from ${formatStageName(deal.stage)} to ${formatStageName(stage)}`,
        actor: lowerWallet,
        metadata: {
          previousStage: deal.stage,
          newStage: stage,
          ...metadata,
        },
        created_at: new Date().toISOString(),
      };

      await supabase.from('trade_timeline').insert(timelineEvent);

      // Send notifications to both parties
      const notificationConfig = STAGE_NOTIFICATIONS[stage];
      if (notificationConfig) {
        const partiesToNotify = [deal.buyer_wallet, deal.seller_wallet].filter(
          addr => addr !== lowerWallet
        );

        for (const partyAddress of partiesToNotify) {
          try {
            await supabase.from('notifications').insert({
              id: uuidv4(),
              user_address: partyAddress,
              type: 'trade_update',
              title: notificationConfig.title,
              message: notificationConfig.getMessage(deal, lowerWallet),
              data: {
                dealId,
                dealReference: deal.reference,
                previousStage: deal.stage,
                newStage: stage,
              },
              priority: notificationConfig.priority,
              action_url: `/trade/deals/${dealId}`,
              read: false,
              created_at: new Date().toISOString(),
            });
          } catch (notifError) {
            console.error('Error sending stage notification:', notifError);
          }
        }
      }
    }

    // Handle escrow updates
    if (escrowTxHash) {
      updateData.escrow_tx_hash = escrowTxHash;
    }
    if (typeof escrowFunded === 'number') {
      updateData.escrow_funded = escrowFunded;
      if (escrowFunded >= deal.escrow_amount) {
        updateData.escrow_status = 'funded';
      }
    }

    // Update deal
    const { data: updatedDeal, error: updateError } = await supabase
      .from('trade_deals')
      .update(updateData)
      .eq('id', dealId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      deal: updatedDeal,
      message: 'Deal updated successfully',
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

// Helper: Get valid stage transitions
function getValidTransitions(currentStage: string, role: 'buyer' | 'seller'): string[] {
  const transitions: Record<string, Record<string, string[]>> = {
    draft: {
      buyer: ['loi_pending', 'cancelled'],
      seller: ['cancelled'],
    },
    loi_pending: {
      buyer: ['loi_signed', 'cancelled'],
      seller: ['loi_signed', 'cancelled'],
    },
    loi_signed: {
      buyer: ['escrow_pending', 'cancelled'],
      seller: ['cancelled'],
    },
    escrow_pending: {
      buyer: ['escrow_funded'],
      seller: [],
    },
    escrow_funded: {
      buyer: [],
      seller: ['in_production'],
    },
    in_production: {
      buyer: [],
      seller: ['quality_check'],
    },
    quality_check: {
      buyer: ['shipping', 'disputed'],
      seller: ['shipping'],
    },
    shipping: {
      buyer: [],
      seller: ['delivered'],
    },
    delivered: {
      buyer: ['completed', 'disputed'],
      seller: [],
    },
    completed: {
      buyer: [],
      seller: [],
    },
    disputed: {
      buyer: [],
      seller: [],
    },
    cancelled: {
      buyer: [],
      seller: [],
    },
  };

  return transitions[currentStage]?.[role] || [];
}

// Helper: Format stage name for display
function formatStageName(stage: string): string {
  const names: Record<string, string> = {
    draft: 'Draft',
    loi_pending: 'LOI Pending',
    loi_signed: 'LOI Signed',
    escrow_pending: 'Escrow Pending',
    escrow_funded: 'Escrow Funded',
    in_production: 'In Production',
    quality_check: 'Quality Check',
    shipping: 'Shipping',
    delivered: 'Delivered',
    completed: 'Completed',
    disputed: 'Disputed',
    cancelled: 'Cancelled',
  };
  return names[stage] || stage;
}
