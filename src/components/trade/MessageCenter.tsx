// src/components/trade/MessageCenter.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  Send,
  Paperclip,
  Image,
  FileText,
  X,
  Check,
  CheckCheck,
  Loader2,
  MoreVertical,
  Download,
} from 'lucide-react';

interface Message {
  id: string;
  dealId: string;
  senderWallet: string;
  senderType: 'buyer' | 'seller' | 'system' | 'arbiter';
  message: string;
  attachments: { name: string; url: string; size: number }[];
  readBy: string[];
  createdAt: Date;
}

interface MessageCenterProps {
  dealId: string;
  buyerWallet: string;
  sellerWallet: string;
  buyerName: string;
  sellerName: string;
}

export default function MessageCenter({
  dealId,
  buyerWallet,
  sellerWallet,
  buyerName,
  sellerName,
}: MessageCenterProps) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBuyer = address?.toLowerCase() === buyerWallet.toLowerCase();
  const isSeller = address?.toLowerCase() === sellerWallet.toLowerCase();

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/trade/messages?dealId=${dealId}`, {
          headers: {
            'x-wallet-address': address || '',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages.map((m: any) => ({
            ...m,
            createdAt: new Date(m.created_at),
            senderWallet: m.sender_wallet,
            senderType: m.sender_type,
            readBy: JSON.parse(m.read_by || '[]'),
            attachments: JSON.parse(m.attachments || '[]'),
          })));
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [dealId, address]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('message', newMessage);
      attachments.forEach(file => formData.append('attachments', file));

      const response = await fetch('/api/trade/messages', {
        method: 'POST',
        headers: {
          'x-wallet-address': address || '',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add message optimistically
        const newMsg: Message = {
          id: result.id,
          dealId,
          senderWallet: address?.toLowerCase() || '',
          senderType: isBuyer ? 'buyer' : 'seller',
          message: newMessage,
          attachments: result.attachments,
          readBy: [address?.toLowerCase() || ''],
          createdAt: new Date(),
        };
        
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getSenderName = (senderType: string, senderWallet: string) => {
    if (senderType === 'buyer') return buyerName;
    if (senderType === 'seller') return sellerName;
    if (senderType === 'arbiter') return 'Arbiter';
    if (senderType === 'system') return 'System';
    return 'Unknown';
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

  // Group messages by date
  const groupedMessages = messages.reduce((groups: Record<string, Message[]>, message) => {
    const dateKey = formatDate(message.createdAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(message);
    return groups;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-800/50 rounded-xl border border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Messages</h3>
          <p className="text-sm text-gray-400">
            {buyerName} ↔ {sellerName}
          </p>
        </div>
        <button className="p-2 text-gray-400 hover:text-white transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="flex items-center justify-center mb-4">
              <span className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-400">
                {date}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((msg) => {
                const isOwn = msg.senderWallet === address?.toLowerCase();
                const isRead = msg.readBy.length > 1;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${isOwn ? 'order-2' : ''}`}>
                      {/* Sender info */}
                      {!isOwn && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-6 h-6 rounded-full ${getSenderColor(msg.senderType)} flex items-center justify-center`}>
                            <span className="text-xs text-white font-medium">
                              {getSenderName(msg.senderType, msg.senderWallet)[0]}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {getSenderName(msg.senderType, msg.senderWallet)}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`rounded-2xl p-3 ${
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-gray-700 text-gray-200 rounded-bl-md'
                        }`}
                      >
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        )}

                        {/* Attachments */}
                        {msg.attachments.length > 0 && (
                          <div className={`${msg.message ? 'mt-2 pt-2 border-t border-white/10' : ''} space-y-2`}>
                            {msg.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-lg ${
                                  isOwn ? 'bg-blue-600/50 hover:bg-blue-600/70' : 'bg-gray-600/50 hover:bg-gray-600/70'
                                } transition-colors`}
                              >
                                {att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                  <Image className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="text-xs truncate flex-1">{att.name}</span>
                                <Download className="h-4 w-4" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Time and read status */}
                      <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                        <span className="text-xs text-gray-500">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isOwn && (
                          isRead ? (
                            <CheckCheck className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Check className="h-4 w-4 text-gray-500" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-500 mt-1">Start the conversation</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700 flex gap-2 overflow-x-auto">
          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg text-sm"
            >
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-white truncate max-w-[100px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || (!newMessage.trim() && attachments.length === 0)}
            className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
