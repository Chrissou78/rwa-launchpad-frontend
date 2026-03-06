// src/app/api/trade/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { notifyNewMessage } from '@/lib/notifications/send';

// GET - Fetch messages for a deal
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID required' }, { status: 400 });
    }

    // Verify user has access to this deal
    const { data: deal, error: dealError } = await supabase
      .from('trade_deals')
      .select('buyer_wallet, seller_wallet, buyer_company, seller_company')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const lowerWallet = walletAddress.toLowerCase();
    if (deal.buyer_wallet !== lowerWallet && deal.seller_wallet !== lowerWallet) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Mark messages as read
    const unreadMessageIds = (messages || [])
      .filter(m => !m.read_by?.includes(lowerWallet))
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      for (const msgId of unreadMessageIds) {
        const msg = messages?.find(m => m.id === msgId);
        const updatedReadBy = [...(msg?.read_by || []), lowerWallet];
        
        await supabase
          .from('trade_messages')
          .update({ read_by: updatedReadBy })
          .eq('id', msgId);
      }
    }

    return NextResponse.json({
      messages: messages || [],
      deal: {
        buyerCompany: deal.buyer_company,
        sellerCompany: deal.seller_company,
        buyerWallet: deal.buyer_wallet,
        sellerWallet: deal.seller_wallet,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    const body = await request.json();
    const { dealId, content, attachments } = body;

    if (!dealId || !content) {
      return NextResponse.json({ error: 'Deal ID and content required' }, { status: 400 });
    }

    // Verify user has access to this deal
    const { data: deal, error: dealError } = await supabase
      .from('trade_deals')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const lowerWallet = walletAddress.toLowerCase();
    if (deal.buyer_wallet !== lowerWallet && deal.seller_wallet !== lowerWallet) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Determine sender info
    const isBuyer = deal.buyer_wallet === lowerWallet;
    const senderName = isBuyer ? deal.buyer_company : deal.seller_company;
    const senderRole = isBuyer ? 'buyer' : 'seller';
    const recipientWallet = isBuyer ? deal.seller_wallet : deal.buyer_wallet;

    // Create message
    const messageId = uuidv4();
    const message = {
      id: messageId,
      deal_id: dealId,
      sender_wallet: lowerWallet,
      sender_name: senderName,
      sender_role: senderRole,
      content,
      attachments: attachments || [],
      read_by: [lowerWallet],
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from('trade_messages')
      .insert(message);

    if (insertError) throw insertError;

    // Create timeline event
    await supabase.from('trade_timeline').insert({
      id: uuidv4(),
      deal_id: dealId,
      type: 'message',
      title: 'New Message',
      description: `${senderName} sent a message`,
      actor: lowerWallet,
      metadata: {
        messageId,
        preview: content.slice(0, 100),
      },
      created_at: new Date().toISOString(),
    });

    // =========================================================================
    // SEND NOTIFICATION TO RECIPIENT
    // =========================================================================

    try {
      await notifyNewMessage(
        recipientWallet,
        {
          senderName,
          dealReference: deal.reference,
          dealId,
          messagePreview: content.slice(0, 150),
        }
      );
    } catch (notifError) {
      console.error('Error sending message notification:', notifError);
    }

    return NextResponse.json({
      message,
      success: true,
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
