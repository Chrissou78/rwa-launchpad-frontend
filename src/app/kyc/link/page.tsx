// src/app/kyc/link/page.tsx
import { WalletLinking } from "../WalletLinking";
import Header from "@/components/Header";

export const metadata = {
  title: "Wallet Linking | RWA Platform",
  description: "Link multiple wallets to share your KYC verification",
};

export default function WalletLinkingPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="py-8">
        <WalletLinking />
      </main>
    </div>
  );
}
