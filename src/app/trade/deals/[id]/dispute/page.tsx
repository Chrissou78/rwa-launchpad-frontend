// src/app/trade/deals/[id]/dispute/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Upload,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Scale,
  Users,
  DollarSign,
  Loader2,
  Send,
  Paperclip,
  ChevronDown,
  Calendar,
  Shield,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type DisputeType = 
  | 'quality_issue'
  | 'quantity_discrepancy'
  | 'late_delivery'
  | 'documentation_issue'
  | 'payment_dispute'
  | 'fraud_suspected'
  | 'contract_breach'
  | 'other';

type DisputeStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'evidence_requested'
  | 'mediation'
  | 'arbitration'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'resolved_split'
  | 'withdrawn';

interface DisputeMessage {
  id: string;
  sender: string;
  senderType: 'buyer' | 'seller' | 'arbiter' | 'system';
  message: string;
  attachments: { name: string; url: string }[];
  createdAt: Date;
}

interface Dispute {
  id: string;
  dealId: string;
  type: DisputeType;
  status: DisputeStatus;
  initiator: string;
  claimedAmount: number;
  description: string;
  evidence: { name: string; url: string; type: string }[];
  messages: DisputeMessage[];
  arbiter?: string;
  resolution?: {
    buyerAmount: number;
    sellerAmount: number;
    reasoning: string;
    resolvedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DISPUTE_TYPES: Record<DisputeType, { label: string; description: string }> = {
  quality_issue: {
    label: 'Quality Issue',
    description: 'Goods received do not meet agreed quality standards',
  },
  quantity_discrepancy: {
    label: 'Quantity Discrepancy',
    description: 'Quantity received differs from order',
  },
  late_delivery: {
    label: 'Late Delivery',
    description: 'Delivery significantly delayed beyond agreed date',
  },
  documentation_issue: {
    label: 'Documentation Issue',
    description: 'Missing or incorrect trade documents',
  },
  payment_dispute: {
    label: 'Payment Dispute',
    description: 'Issues with payment release or amounts',
  },
  fraud_suspected: {
    label: 'Fraud Suspected',
    description: 'Suspected fraudulent activity',
  },
  contract_breach: {
    label: 'Contract Breach',
    description: 'Violation of agreed contract terms',
  },
  other: {
    label: 'Other',
    description: 'Other dispute type',
  },
};

const DISPUTE_STATUS_INFO: Record<DisputeStatus, { 
  label: string; 
  color: string; 
  description: string;
}> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    description: 'Dispute is being prepared',
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Dispute submitted for review',
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Platform reviewing the dispute',
  },
  evidence_requested: {
    label: 'Evidence Requested',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    description: 'Additional evidence required',
  },
  mediation: {
    label: 'In Mediation',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    description: 'Parties attempting to reach agreement',
  },
  arbitration: {
    label: 'In Arbitration',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    description: 'Arbiter will make final decision',
  },
  resolved_buyer: {
    label: 'Resolved - Buyer',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    description: 'Resolved in favor of buyer',
  },
  resolved_seller: {
    label: 'Resolved - Seller',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    description: 'Resolved in favor of seller',
  },
  resolved_split: {
    label: 'Resolved - Split',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    description: 'Resolved with split decision',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    description: 'Dispute withdrawn by initiator',
  },
};

// =============================================================================
// COMPONENTS
// =============================================================================

function DisputeTimeline({ dispute }: { dispute: Dispute }) {
  const stages = [
    { status: 'submitted', label: 'Submitted', icon: FileText },
    { status: 'under_review', label: 'Review', icon: Clock },
    { status: 'mediation', label: 'Mediation', icon: Users },
    { status: 'arbitration', label: 'Arbitration', icon: Scale },
    { status: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  ];

  const getCurrentStageIndex = () => {
    if (dispute.status.startsWith('resolved')) return 4;
    return stages.findIndex(s => s.status === dispute.status);
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-6">Dispute Progress</h3>
      <div className="flex items-center justify-between">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={stage.status} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  isCompleted ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div className={`w-12 md:w-20 h-0.5 mx-2 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageThread({ 
  messages, 
  currentUser,
  onSendMessage,
}: { 
  messages: DisputeMessage[];
  currentUser: string;
  onSendMessage: (message: string, attachments: File[]) => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() || attachments.length > 0) {
      onSendMessage(newMessage, attachments);
      setNewMessage('');
      setAttachments([]);
    }
  };

  const getSenderColor = (senderType: string) => {
    switch (senderType) {
      case 'buyer': return 'bg-blue-500';
      case 'seller': return 'bg-purple-500';
      case 'arbiter': return 'bg-yellow-500';
      case 'system': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Dispute Discussion
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isOwn = msg.sender.toLowerCase() === currentUser.toLowerCase();
          
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full ${getSenderColor(msg.senderType)} flex items-center justify-center`}>
                    <span className="text-xs text-white font-medium">
                      {msg.senderType[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{msg.senderType}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className={`rounded-xl p-3 ${
                  isOwn ? 'bg-blue-500/20 text-blue-100' : 'bg-gray-700 text-gray-200'
                }`}>
                  <p className="text-sm">{msg.message}</p>
                  {msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-xs text-blue-400 hover:text-blue-300"
                        >
                          <Paperclip className="h-3 w-3 mr-1" />
                          {att.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none"
          />
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function ResolutionProposal({
  dealValue,
  onPropose,
  isArbiter = false,
}: {
  dealValue: number;
  onPropose: (buyerAmount: number, sellerAmount: number, reasoning: string) => void;
  isArbiter?: boolean;
}) {
  const [buyerPercentage, setBuyerPercentage] = useState(50);
  const [reasoning, setReasoning] = useState('');

  const buyerAmount = (dealValue * buyerPercentage) / 100;
  const sellerAmount = dealValue - buyerAmount;

  const handleSubmit = () => {
    onPropose(buyerAmount, sellerAmount, reasoning);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <Scale className="h-5 w-5 mr-2" />
        {isArbiter ? 'Final Resolution' : 'Propose Settlement'}
      </h3>

      <div className="space-y-4">
        {/* Slider */}
        <div>
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Buyer: {buyerPercentage}%</span>
            <span>Seller: {100 - buyerPercentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={buyerPercentage}
            onChange={(e) => setBuyerPercentage(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Buyer Receives</p>
            <p className="text-xl font-bold text-blue-400">
              ${buyerAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Seller Receives</p>
            <p className="text-xl font-bold text-purple-400">
              ${sellerAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {isArbiter ? 'Resolution Reasoning' : 'Settlement Reasoning'}
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={4}
            placeholder={isArbiter 
              ? 'Explain the basis for this resolution...'
              : 'Explain why you propose this settlement...'}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!reasoning.trim()}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isArbiter ? 'Submit Final Resolution' : 'Propose Settlement'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DisputePage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const dealId = params.id as string;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'resolution'>('details');

  // Form state for new dispute
  const [disputeType, setDisputeType] = useState<DisputeType>('quality_issue');
  const [description, setDescription] = useState('');
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [evidence, setEvidence] = useState<File[]>([]);

  // Fetch dispute
  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const response = await fetch(`/api/trade/disputes/${dealId}`);
        if (response.ok) {
          const data = await response.json();
          setDispute(data);
        }
      } catch (error) {
        console.error('Error fetching dispute:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDispute();
  }, [dealId]);

  const handleSubmitDispute = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('type', disputeType);
      formData.append('description', description);
      formData.append('claimedAmount', claimedAmount.toString());
      evidence.forEach(file => formData.append('evidence', file));

      const response = await fetch('/api/trade/disputes', {
        method: 'POST',
        headers: {
          'x-wallet-address': address || '',
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to submit dispute');

      const newDispute = await response.json();
      setDispute(newDispute);
    } catch (error) {
      console.error('Error submitting dispute:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (message: string, attachments: File[]) => {
    if (!dispute) return;
    
    try {
      const formData = new FormData();
      formData.append('disputeId', dispute.id);
      formData.append('message', message);
      attachments.forEach(file => formData.append('attachments', file));

      const response = await fetch('/api/trade/disputes/messages', {
        method: 'POST',
        headers: {
          'x-wallet-address': address || '',
        },
        body: formData,
      });

      if (response.ok) {
        const newMessage = await response.json();
        setDispute(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMessage],
        } : null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handlePropose = async (buyerAmount: number, sellerAmount: number, reasoning: string) => {
    if (!dispute) return;
    
    try {
      const response = await fetch(`/api/trade/disputes/${dispute.id}/propose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address || '',
        },
        body: JSON.stringify({ buyerAmount, sellerAmount, reasoning }),
      });

      if (response.ok) {
        // Refresh dispute data
        const updatedDispute = await response.json();
        setDispute(updatedDispute);
      }
    } catch (error) {
      console.error('Error proposing settlement:', error);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </main>
    );
  }

  // If no dispute exists, show creation form
  if (!dispute) {
    return (
      <main className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link href={`/trade/deals/${dealId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deal
          </Link>

          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center mb-6">
              <AlertTriangle className="h-8 w-8 text-red-400 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">Raise a Dispute</h1>
                <p className="text-gray-400">Submit a formal dispute for this deal</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Dispute Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dispute Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(DISPUTE_TYPES).map(([key, value]) => (
                    <label
                      key={key}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        disputeType === key
                          ? 'bg-red-500/10 border-red-500/50'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="disputeType"
                        value={key}
                        checked={disputeType === key}
                        onChange={(e) => setDisputeType(e.target.value as DisputeType)}
                        className="sr-only"
                      />
                      <p className="text-white font-medium">{value.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{value.description}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Detailed Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Describe the issue in detail, including dates, amounts, and any relevant circumstances..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none resize-none"
                />
              </div>

              {/* Claimed Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Claimed Amount ($)
                </label>
                <input
                  type="number"
                  value={claimedAmount || ''}
                  onChange={(e) => setClaimedAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Amount you're claiming"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-red-500 outline-none"
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Supporting Evidence
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center">
                  <Upload className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Upload photos, documents, or other evidence</p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setEvidence(Array.from(e.target.files || []))}
                    className="mt-4"
                  />
                </div>
                {evidence.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {evidence.map((file, idx) => (
                      <p key={idx} className="text-sm text-gray-400">• {file.name}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-yellow-400 font-medium">Important Notice</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Filing a dispute will freeze the escrow funds until resolution. 
                      False or fraudulent claims may result in penalties and account suspension.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmitDispute}
                disabled={!description || !claimedAmount || isSubmitting}
                className="w-full py-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Submit Dispute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show existing dispute
  const statusInfo = DISPUTE_STATUS_INFO[dispute.status];
  const isResolved = dispute.status.startsWith('resolved');

  return (
    <main className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Link href={`/trade/deals/${dealId}`} className="inline-flex items-center text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deal
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">Dispute #{dispute.id.slice(0, 8)}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-gray-400">{DISPUTE_TYPES[dispute.type].label}</p>
          </div>
          {dispute.deadline && !isResolved && (
            <div className="text-right">
              <p className="text-sm text-gray-400">Resolution Deadline</p>
              <p className="text-white font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(dispute.deadline).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <DisputeTimeline dispute={dispute} />

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-6">
          {['details', 'messages', 'resolution'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Dispute Description</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{dispute.description}</p>
                </div>

                {/* Evidence */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Evidence Submitted</h3>
                  {dispute.evidence.length > 0 ? (
                    <div className="space-y-2">
                      {dispute.evidence.map((item, idx) => (
                        <a
                          key={idx}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-blue-400 mr-3" />
                          <span className="text-white">{item.name}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400">No evidence submitted yet</p>
                  )}
                </div>

                {/* Resolution */}
                {dispute.resolution && (
                  <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20">
                    <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Resolution
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-400 mb-1">Buyer Awarded</p>
                        <p className="text-xl font-bold text-blue-400">
                          ${dispute.resolution.buyerAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-400 mb-1">Seller Awarded</p>
                        <p className="text-xl font-bold text-purple-400">
                          ${dispute.resolution.sellerAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Reasoning</p>
                      <p className="text-gray-300">{dispute.resolution.reasoning}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <MessageThread
                messages={dispute.messages}
                currentUser={address || ''}
                onSendMessage={handleSendMessage}
              />
            )}

            {activeTab === 'resolution' && !isResolved && (
              <ResolutionProposal
                dealValue={dispute.claimedAmount * 2} // Simplified - would use actual deal value
                onPropose={handlePropose}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Claimed Amount */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Claimed Amount</h4>
              <p className="text-3xl font-bold text-white">
                ${dispute.claimedAmount.toLocaleString()}
              </p>
            </div>

            {/* Status Info */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Current Status</h4>
              <div className={`p-4 rounded-lg border ${statusInfo.color}`}>
                <p className="font-medium">{statusInfo.label}</p>
                <p className="text-sm text-gray-400 mt-1">{statusInfo.description}</p>
              </div>
            </div>

            {/* Arbiter */}
            {dispute.arbiter && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
                  <Scale className="h-4 w-4 mr-2" />
                  Assigned Arbiter
                </h4>
                <p className="text-white font-mono text-sm truncate">{dispute.arbiter}</p>
              </div>
            )}

            {/* Key Dates */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Timeline</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Filed</span>
                  <span className="text-white">{new Date(dispute.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Update</span>
                  <span className="text-white">{new Date(dispute.updatedAt).toLocaleDateString()}</span>
                </div>
                {dispute.resolution && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Resolved</span>
                    <span className="text-white">{new Date(dispute.resolution.resolvedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isResolved && dispute.initiator.toLowerCase() === address?.toLowerCase() && (
              <button className="w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
                Withdraw Dispute
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}