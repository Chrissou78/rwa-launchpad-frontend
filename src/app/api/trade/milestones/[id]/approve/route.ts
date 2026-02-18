// src/app/api/trade/milestones/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { notifyMilestoneCompleted, notifyPaymentReceived } from '@/lib/notifications/send';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const milestoneId = params.id;
    const body = await request.json();
    const { transactionHash } = body;

    // Fetch milestone with deal
    const { data: milestone, error: milestoneError } = await supabase
      .from('trade_milestones')
      .select('*, trade_deals(*)')
      .eq('id', milestoneId)
      .single();

    if (milestoneError || !milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const deal = milestone.trade_deals;

    // Only buyer can approve milestones
    if (deal.buyer_wallet !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Only buyer can approve milestones' }, { status: 403 });
    }

    // Check milestone is pending approval
    if (milestone.status !== 'pending_approval') {
      return NextResponse.json({ 
        error: `Cannot approve milestone in ${milestone.status} status` 
      }, { status: 400 });
    }

    // Update milestone
    const { error: updateError } = await supabase
      .from('trade_milestones')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        approved_by: walletAddress.toLowerCase(),
        release_tx_hash: transactionHash,
      })
      .eq('id', milestoneId);

    if (updateError) throw updateError;

    // Update deal escrow released amount
    const newReleasedAmount = (deal.escrow_released || 0) + milestone.payment_amount;
    await supabase
      .from('trade_deals')
      .update({
        escrow_released: newReleasedAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deal.id);

    // Find next milestone
    const { data: nextMilestone } = await supabase
      .from('trade_milestones')
      .select('*')
      .eq('deal_id', deal.id)
      .eq('status', 'pending')
      .order('order_index', { ascending: true })
      .limit(1)
      .single();

    // If there's a next milestone, set it to active
    if (nextMilestone) {
      await supabase
        .from('trade_milestones')
        .update({ status: 'active' })
        .eq('id', nextMilestone.id);
    }

    // Check if all milestones completed
    const { count: pendingCount } = await supabase
      .from('trade_milestones')
      .select('*', { count: 'exact', head: true })
      .eq('deal_id', deal.id)
      .neq('status', 'completed');

    // If all milestones done, complete the deal
    if (pendingCount === 0) {
      await supabase
        .from('trade_deals')
        .update({
          stage: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id);
    }

    // Create timeline event
    await supabase.from('trade_timeline').insert({
      id: uuidv4(),
      deal_id: deal.id,
      type: 'milestone_completed',
      title: `Milestone Completed: ${milestone.name}`,
      description: `Payment of $${milestone.payment_amount.toLocaleString()} released to seller`,
      actor: walletAddress.toLowerCase(),
      metadata: {
        milestoneId,
        milestoneName: milestone.name,
        paymentAmount: milestone.payment_amount,
        transactionHash,
      },
      created_at: new Date().toISOString(),
    });

    // =========================================================================
    // SEND NOTIFICATIONS
    // =========================================================================

    try {
      // Notify both parties about milestone completion
      await notifyMilestoneCompleted(
        [deal.buyer_wallet, deal.seller_wallet],
        {
          dealReference: deal.reference,
          dealId: deal.id,
          milestoneName: milestone.name,
          paymentAmount: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(milestone.payment_amount),
          nextMilestone: nextMilestone?.name,
        }
      );

      // Notify seller about payment received
      await notifyPaymentReceived(
        deal.seller_wallet,
        {
          amount: milestone.payment_amount.toString(),
          currency: deal.product_currency || 'USDC',
          dealReference: deal.reference,
          dealId: deal.id,
          fromParty: deal.buyer_company,
          transactionHash,
        }
      );

      // If deal completed, send completion notification
      if (pendingCount === 0) {
        const completionNotification = {
          id: uuidv4(),
          type: 'trade_update',
          title: 'Deal Completed Successfully',
          message: `Congratulations! Deal ${deal.reference} has been completed. All milestones fulfilled.`,
          data: {
            dealId: deal.id,
            dealReference: deal.reference,
            totalValue: deal.product_total_value,
          },
          priority: 'high',
          action_url: `/trade/deals/${deal.id}`,
          read: false,
          created_at: new Date().toISOString(),
        };

        await supabase.from('notifications').insert([
          { ...completionNotification, id: uuidv4(), user_address: deal.buyer_wallet },
          { ...completionNotification, id: uuidv4(), user_address: deal.seller_wallet },
        ]);
      }
    } catch (notifError) {
      console.error('Error sending milestone notifications:', notifError);
    }

    return NextResponse.json({
      success: true,
      message: 'Milestone approved and payment released',
      milestone: {
        ...milestone,
        status: 'completed',
      },
      nextMilestone: nextMilestone || null,
      dealCompleted: pendingCount === 0,
    });
  } catch (error) {
    console.error('Error approving milestone:', error);
    return NextResponse.json({ error: 'Failed to approve milestone' }, { status: 500 });
  }
}
