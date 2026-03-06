// src/lib/notifications/send.ts

import { NotificationType } from './websocket';

interface SendNotificationOptions {
  userAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  emailTemplate?: string;
  emailData?: Record<string, any>;
}

/**
 * Helper function to send notifications from server-side code
 */
export async function sendNotification(options: SendNotificationOptions) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const response = await fetch(`${baseUrl}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.INTERNAL_API_KEY || '',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send notification');
  }

  return response.json();
}

// ============================================================================
// NOTIFICATION SENDERS FOR SPECIFIC EVENTS
// ============================================================================

export async function notifyTradeInvitation(
  sellerAddress: string,
  dealData: {
    dealReference: string;
    buyerName: string;
    productName: string;
    dealValue: string;
    dealId: string;
  }
) {
  return sendNotification({
    userAddress: sellerAddress,
    type: 'trade_update',
    title: 'New Trade Deal Invitation',
    message: `${dealData.buyerName} has invited you to a trade deal for ${dealData.productName}`,
    data: dealData,
    priority: 'high',
    actionUrl: `/trade/deals/${dealData.dealId}`,
    emailTemplate: 'newDealInvitation',
    emailData: {
      dealReference: dealData.dealReference,
      counterpartyName: dealData.buyerName,
      productName: dealData.productName,
      dealValue: dealData.dealValue,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${dealData.dealId}`,
    },
  });
}

export async function notifyPaymentReceived(
  recipientAddress: string,
  paymentData: {
    amount: string;
    currency: string;
    dealReference: string;
    dealId: string;
    fromParty: string;
    transactionHash?: string;
  }
) {
  return sendNotification({
    userAddress: recipientAddress,
    type: 'payment_received',
    title: `Payment Received: ${paymentData.amount} ${paymentData.currency}`,
    message: `You received ${paymentData.amount} ${paymentData.currency} from ${paymentData.fromParty}`,
    data: paymentData,
    priority: 'high',
    actionUrl: `/trade/deals/${paymentData.dealId}`,
    emailTemplate: 'paymentReceived',
    emailData: {
      amount: paymentData.amount,
      currency: paymentData.currency,
      dealReference: paymentData.dealReference,
      fromParty: paymentData.fromParty,
      transactionHash: paymentData.transactionHash,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${paymentData.dealId}`,
    },
  });
}

export async function notifyMilestoneCompleted(
  addresses: string[],
  milestoneData: {
    dealReference: string;
    dealId: string;
    milestoneName: string;
    paymentAmount: string;
    nextMilestone?: string;
  }
) {
  return Promise.all(
    addresses.map(address =>
      sendNotification({
        userAddress: address,
        type: 'milestone_completed',
        title: `Milestone Completed: ${milestoneData.milestoneName}`,
        message: `${milestoneData.paymentAmount} has been released`,
        data: milestoneData,
        priority: 'medium',
        actionUrl: `/trade/deals/${milestoneData.dealId}`,
        emailTemplate: 'milestoneCompleted',
        emailData: {
          dealReference: milestoneData.dealReference,
          milestoneName: milestoneData.milestoneName,
          paymentAmount: milestoneData.paymentAmount,
          nextMilestone: milestoneData.nextMilestone,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${milestoneData.dealId}`,
        },
      })
    )
  );
}

export async function notifyDisputeOpened(
  recipientAddress: string,
  disputeData: {
    disputeId: string;
    dealReference: string;
    dealId: string;
    reason: string;
    openedBy: string;
  }
) {
  return sendNotification({
    userAddress: recipientAddress,
    type: 'dispute_opened',
    title: `Dispute Opened: ${disputeData.dealReference}`,
    message: `A dispute has been opened by ${disputeData.openedBy}`,
    data: disputeData,
    priority: 'critical',
    actionUrl: `/trade/deals/${disputeData.dealId}/dispute`,
    emailTemplate: 'disputeOpened',
    emailData: {
      disputeId: disputeData.disputeId,
      dealReference: disputeData.dealReference,
      reason: disputeData.reason,
      openedBy: disputeData.openedBy,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${disputeData.dealId}/dispute`,
    },
  });
}

export async function notifyKYCApproved(
  userAddress: string,
  kycData: {
    kycLevel: string;
    tradeLimits: string;
  }
) {
  return sendNotification({
    userAddress,
    type: 'kyc_update',
    title: `KYC Approved: ${kycData.kycLevel}`,
    message: `Your KYC verification has been approved. You can now trade up to ${kycData.tradeLimits}`,
    data: kycData,
    priority: 'high',
    actionUrl: '/trade',
    emailTemplate: 'kycApproved',
    emailData: {
      kycLevel: kycData.kycLevel,
      tradeLimits: kycData.tradeLimits,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade`,
    },
  });
}

export async function notifyNewMessage(
  recipientAddress: string,
  messageData: {
    senderName: string;
    dealReference: string;
    dealId: string;
    messagePreview: string;
  }
) {
  return sendNotification({
    userAddress: recipientAddress,
    type: 'message_received',
    title: `New Message from ${messageData.senderName}`,
    message: messageData.messagePreview.slice(0, 100),
    data: messageData,
    priority: 'medium',
    actionUrl: `/trade/deals/${messageData.dealId}?tab=messages`,
    emailTemplate: 'newMessage',
    emailData: {
      senderName: messageData.senderName,
      dealReference: messageData.dealReference,
      messagePreview: messageData.messagePreview,
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/trade/deals/${messageData.dealId}?tab=messages`,
    },
  });
}
