// src/app/trade/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'International Trade Platform | Secure Crypto Escrow',
  description: 'Execute secure cross-border transactions with crypto-powered escrow, compliance management, and milestone-based payment releases.',
  openGraph: {
    title: 'International Trade Platform',
    description: 'Secure crypto-powered escrow for international trade',
    type: 'website',
  },
};

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      {children}
    </div>
  );
}
